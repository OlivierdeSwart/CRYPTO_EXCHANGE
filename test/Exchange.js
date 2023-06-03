const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Exchange', () => {
  let deployer, feeAccount, exchange

  const feePercent = 10

  beforeEach(async () => {
    const Exchange = await ethers.getContractFactory('Exchange') //pass in the name of smart contract to get byte code (deployment prep)
    const Token = await ethers.getContractFactory('Token') //pass in the name of smart contract to get byte code (deployment prep)

    token1 = await Token.deploy('Cutie Token <3', 'QT', '1000000')
    token2 = await Token.deploy('Mock Dai', 'mDAI', '1000000')

    accounts = await ethers.getSigners()
    deployer = accounts[0]
    feeAccount = accounts[1]
    user1 = accounts[2]
    user2 = accounts[3]

    let transaction = await token1.connect(deployer).transfer(user1.address, tokens(100))
    await transaction.wait()

    exchange = await Exchange.deploy(feeAccount.address, feePercent) //deploy the byte code
  })

  describe('Deployment', () => {

    it('tracks the fee account', async () => {
      expect(await exchange.feeAccount()).to.equal(feeAccount.address)
    })

    it('tracks the fee percent', async () => {
      expect(await exchange.feePercent()).to.equal(feePercent)
    })
  })

  describe('DEPOSITING TOKENS', () => {
    let transaction, result
    let amount = tokens(10)

    describe('Success', async () => {
      beforeEach(async () => {
        //approve token
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
        //deposit token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount)
        result = await transaction.wait()
  
      })
      
        it('tracks the token deposit', async () => {
        expect(await token1.balanceOf(exchange.address)).to.be.equal(amount)
        expect(await exchange.tokens(token1.address, user1.address)).to.be.equal(amount)
        expect(await exchange.balanceOf(token1.address, user1.address)).to.be.equal(amount)
        })
      
  
      it('emits a Deposit event', async () => {
          const event = result.events[1]
          expect(await event.event).to.equal('Deposit')
  
          const args = event.args
          expect(args.token).to.equal(token1.address) 
          expect(args.user).to.equal(user1.address)
          expect(args.amount).to.equal(amount)
          expect(args.balance).to.equal(amount)
      })
    })
  
      describe('Failure', () => {
        it('fails when no tokens are approved', async () => {
          await expect(exchange.connect(user1).depositToken(token1.address, amount)).to.be.reverted
        })
      })
    })

  describe('WITHDRAWING TOKENS', () => {
    let transaction, result
    let amount = tokens(10)

    describe('Success', async () => {
      beforeEach(async () => {
        //DEPOSIT TOKENS BEFORE WITHDRAWING
        //approve token
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
        //deposit token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount)
        result = await transaction.wait()

        //NOW WITHDRAW TOKENS
        transaction = await exchange.connect(user1).withdrawToken(token1.address,amount)
        result = await transaction.wait()
  
      })
      
        it('withdraws token funds', async () => {
        expect(await token1.balanceOf(exchange.address)).to.be.equal(0)
        expect(await exchange.tokens(token1.address, user1.address)).to.be.equal(0)
        expect(await exchange.balanceOf(token1.address, user1.address)).to.be.equal(0)
        })
      
  
      it('emits a Withdraw event', async () => {
          const event = result.events[1]
          expect(await event.event).to.equal('Withdraw')
  
          const args = event.args
          expect(args.token).to.equal(token1.address) 
          expect(args.user).to.equal(user1.address)
          expect(args.amount).to.equal(amount)
          expect(args.balance).to.equal(0)
      })
    })
  
    describe('Failure', () => {
      it('fails for insufficient balances', async () => {
        //attempt to withdraw tokens without depositing
        await expect(exchange.connect(user1).withdrawToken(token1.address, amount)).to.be.reverted
      })
    })
  })

  describe('CHECKING BALANCES', () => {
    let transaction, result
    let amount = tokens(1)

    beforeEach(async () => {
      //approve token
      transaction = await token1.connect(user1).approve(exchange.address, amount)
      result = await transaction.wait()
      //deposit token
      transaction = await exchange.connect(user1).depositToken(token1.address,amount)
      result = await transaction.wait()
    })

    it('returns user balance', async () => {
      expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount)
    })    
  })

  describe('MAKING ORDERS', () => {
    let transaction, result

    let amount = tokens(1)

    describe('Success', () => {
      beforeEach(async () => {
        //DEPOSIT TOKENS BEFORE MAKING ORDER
        //approve token
        transaction = await token1.connect(user1).approve(exchange.address, amount)
        result = await transaction.wait()
        //deposit token
        transaction = await exchange.connect(user1).depositToken(token1.address,amount)
        result = await transaction.wait()

        //MAKE ORDER
        transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
        result = await transaction.wait()

      })

      it('tracks the newly created order', async () => {
        expect(await exchange.orderCount()).to.equal(1)
      })

      it('emits a Order event', async () => {
          const event = result.events[0] //should be 2?
          expect(await event.event).to.equal('Order')

          const args = event.args
          expect(args.id).to.equal(1) 
          expect(args.user).to.equal(user1.address)
          expect(args.tokenGet).to.equal(token2.address)
          expect(args.amountGet).to.equal(tokens(1))
          expect(args.tokenGive).to.equal(token1.address)
          expect(args.amountGive).to.equal(tokens(1))
          expect(args.timestamp).to.at.least(1)
      })

    })

    describe('Failure', () => {
      it('rejects orders with insufficient balance', async () => {
        await expect(exchange.connect(user1).makeOrder(token2.address, tokens(1), token1.address, tokens(1))).to.be.reverted
      })
    })
  })

  describe('ORDER ACTIONS', () => {
    let transaction, result
    let amount = tokens(1)

    beforeEach(async () => {

      // User1 Approves and Deposits tokens
      transaction = await token1.connect(user1).approve(exchange.address, amount)
      result = await transaction.wait()
      transaction = await exchange.connect(user1).depositToken(token1.address,amount)
      result = await transaction.wait()

      // Give tokens to user2
      transaction = await token2.connect(deployer).transfer(user2.address,tokens(100))
      result = await transaction.wait()

      // User2 Approves and Deposits tokens
      transaction = await token2.connect(user2).approve(exchange.address, tokens(2))
      result = await transaction.wait()
      transaction = await exchange.connect(user2).depositToken(token2.address, tokens(2))
      result = await transaction.wait()

      // User1 Makes an Order
      transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
      result = await transaction.wait()
    })

    describe('CANCELLING ORDERS', () => {
      describe('Success', () => {
        beforeEach(async () => {
          transaction = await exchange.connect(user1).cancelOrder(1)
          result = await transaction.wait()
        })

        it('updates and cancels orders', async () => {
          expect(await exchange.orderCancelled(1)).to.equal(true)
        })

        it('emits a Cancel event', async () => {
          const event = result.events[0] //should be 2?
          expect(await event.event).to.equal('Cancel')

          const args = event.args
          expect(args.id).to.equal(1) 
          expect(args.user).to.equal(user1.address)
          expect(args.tokenGet).to.equal(token2.address)
          expect(args.amountGet).to.equal(tokens(1))
          expect(args.tokenGive).to.equal(token1.address)
          expect(args.amountGive).to.equal(tokens(1))
          expect(args.timestamp).to.at.least(1)
        })
      })

      describe('Failure', () => {
        beforeEach(async () => {
          // User1 Approves and Deposits tokens
          transaction = await token1.connect(user1).approve(exchange.address, amount)
          result = await transaction.wait()
          transaction = await exchange.connect(user1).depositToken(token1.address,amount)
          result = await transaction.wait()
    
          // User1 Makes an Order
          transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount)
          result = await transaction.wait()
        })

        it('rejects invalid order ids', async () => {
          //check invalid order
          const invalidOrderId = 99999
          await expect(exchange.connect(user1).cancelOrder(invalidOrderId)).to.be.reverted
        })

        it('rejects unauthorized cancelations', async () => {
          await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted
        }) 
      })
    })

    describe('FILLING ORDERS', () => {
      describe('Success', () => {
        beforeEach(async () => {
        //user2 fills the order
        transaction = await exchange.connect(user2).fillOrder('1')
        result = await transaction.wait()
      })
  
        it('executes the trade and charges the fees', async () => {
        //Token Give
        expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(tokens(0))
        expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(tokens(1))
        expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(tokens(0))
        //Token Get
        expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(tokens(1))
        expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(tokens(0.9))
        expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(tokens(0.1))
      })
  
        it('updates filled orders', async () => {
          expect(await exchange.orderFilled(1)).to.equal(true)
      })
  
        it('emits a Trade event', async () => {
          const event = result.events[0]
          expect(await event.event).to.equal('Trade')
  
          const args = event.args
          expect(args.id).to.equal(1) 
          expect(args.user).to.equal(user2.address)
          expect(args.tokenGet).to.equal(token2.address)
          expect(args.amountGet).to.equal(tokens(1))
          expect(args.tokenGive).to.equal(token1.address)
          expect(args.amountGive).to.equal(tokens(1))
          expect(args.creator).to.equal(user1.address)
          expect(args.timestamp).to.at.least(1)
      })
      })
      describe('Failure', () => {
        it('rejects invalid order ids', async () => {
          const invalidOrderId = 99999
          await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted
        }) 

        it('rejects already filled orders', async () => {
          transaction = await exchange.connect(user2).fillOrder(1)
          await transaction.wait()

          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
        }) 

        it('rejects canceled orders', async () => {
          transaction = await exchange.connect(user1).cancelOrder(1)
          await transaction.wait()

          await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted
        }) 
      })
    })
  })
})
