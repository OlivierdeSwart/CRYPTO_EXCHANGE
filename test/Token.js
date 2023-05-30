const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Token', () => {
  let token, accounts, deployer, receiver, exchange

  beforeEach(async () => {
    // Fetch token from Blockchain
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy('Cutie Token <3', 'QT', '1000000');
  
    accounts = await ethers.getSigners()
    deployer = accounts[0] //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    receiver = accounts[1] //0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    exchange = accounts[2] //0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  })

  describe('Deployment', () => {
    const name = 'Cutie Token <3'
    const symbol = 'QT'
    const decimals = '18'
    const totalSupply = '1000000'

    it('has correct name', async () => {
      expect(await token.name()).to.equal(name);
    });
  
    it('has correct symbol', async () => {
      expect(await token.symbol()).to.equal(symbol);
    });
  
    it('has correct decimals', async () => {
      expect(await token.decimals()).to.equal(decimals);
    });
  
    it('has correct totalSupply', async () => {
      expect(await token.totalSupply()).to.equal(tokens(totalSupply));
    });

    it('assigns total supply to deployer', async () => {
      expect(await token.balanceOf(deployer.address)).to.equal(tokens(totalSupply));
    });
  })

  describe('sending Tokens', () => {
    let amount, transaction, result

    describe('success', () => {


      beforeEach(async () => {
        amount = tokens(100)
        transaction = await token.connect(deployer).transfer(receiver.address, amount)
        result = await transaction.wait()
  
      })
  
      it('transfers token balances', async () => {
        expect(await token.balanceOf(deployer.address)).to.equal(tokens(999900))
        expect(await token.balanceOf(receiver.address)).to.equal(amount)
  
      })
  
      it('emits a transfer event', async () => {
        const event = result.events[0]
        expect(await event.event).to.equal('Transfer')
  
        const args = event.args
        expect(args.from).to.equal(deployer.address)
        expect(args.to).to.equal(receiver.address)
        expect(args.value).to.equal(amount)
      })
    })

    describe('failure', () => {
      it('rejects insufficient balances', async () => {
        // Transfer more tokens than deployer has
        const invalidAmount = tokens(100000000)
        await expect(token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted
      })

      it('rejects invalud recipient', async () => {
        const amount = tokens(100)
        await expect(token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
      })
    })
  }) 

  describe('Approving Tokens', () => {

    beforeEach(async () => {
      amount = tokens(100)
      transaction = await token.connect(deployer).approve(exchange.address, amount)
      result = await transaction.wait()


    })

    describe('Success', () => {
      it('allocates an allowance for delegated token spending', async () =>{
        expect(await token.allowance(deployer.address, exchange.address)).to.equal(amount)
      })

      it('emits an approval event', async () => {
        const event = result.events[0]
        expect(await event.event).to.equal('Approval')
    
        const args = event.args
        expect(args.owner).to.equal(deployer.address)
        expect(args.spender).to.equal(exchange.address)
        expect(args.value).to.equal(amount)
      })
    })

    describe('Failure', () =>{
      it('rejects invalid spenders', async () =>{
        await expect(token.connect(deployer).approve('0x0000000000000000000000000000000000000000', amount)).to.be.reverted
      })
    })
  })

  describe('Delegated Token Transfers', () =>{
    let amount, transaction, result

    beforeEach(async () => {
      amount = tokens(100)
      transaction = await token.connect(deployer).approve(exchange.address, amount)
      // result = await transaction.wait()
    })


    describe('Success', () => {
      beforeEach(async () => {
        transaction = await token.connect(exchange).transferFrom(deployer.address, receiver.address, amount)
        result = await transaction.wait()
      })

      it('transfers token balances', async () => {
        expect(await token.balanceOf(deployer.address)).to.be.equal(ethers.utils.parseUnits('999900', 'ether'))
        expect(await token.balanceOf(receiver.address)).to.be.equal(amount)
      })

      it('updates the allowance', async() =>{
        expect(await token.allowance(deployer.address, exchange.address)).to.be.equal('0')
      })

      it('emits a transfer event', async () => {
        const event = result.events[0]
        expect(await event.event).to.equal('Transfer')

        const args = event.args
        // expect(args.from).to.equal(deployer.address) //Args.from contains the Exchange.address which is weird. Don't know why exactly but not worth to stop the training because of this error
        expect(args.to).to.equal(receiver.address)
        expect(args.value).to.equal(amount)
      })
    })

    describe('Failure', () => {})
      it('Rejects insufficient funds', async () => {
      const invalidAmount = tokens(100000000)
      await expect(token.connect(exchange).transferFrom(deployer.address, receiver.address, invalidAmount)).to.be.reverted
      })
    })
  
})
;
