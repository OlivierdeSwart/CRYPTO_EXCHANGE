const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Token', () => {
  let token, accounts, deployer, receiver

  beforeEach(async () => {
    // Fetch token from Blockchain
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy('Cutie Token <3', 'QT', '1000000');
  
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    receiver = accounts[1]
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
});
