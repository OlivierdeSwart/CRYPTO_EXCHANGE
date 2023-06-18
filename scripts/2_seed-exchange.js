const config = require('../src/config.json')

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve,milliseconds))
}

async function main() {
  // Fetch accounts from wallet - these are unlocked
  const accounts = await ethers.getSigners()

  // Fetch netowrk
  const { chainId } = await ethers.provider.getNetwork()
  console.log("Using chainId:", chainId)

  // Fetch deployed tokens
  const QT = await ethers.getContractAt('Token', config[chainId].QT.address)
  console.log(`Token fetched: ${QT.address}\n`)

  const mETH = await ethers.getContractAt('Token',config[chainId].mETH.address)
  console.log(`Token fetched: ${mETH.address}\n`)

  const mDAI = await ethers.getContractAt('Token',config[chainId].mDAI.address)
  console.log(`Token fetched: ${mDAI.address}\n`)

  // Fetch the deployed exchange
  const exchange = await ethers.getContractAt('Exchange',config[chainId].exchange.address)
  console.log(`Exchange fetched: ${exchange.address}\n`)

  // Give tokens to account[1]
  const sender = accounts[0]
  const receiver = accounts[1]
  let amount = tokens(10000)

  // User 1 transfers 10000 mETH
  let transaction, result
  transaction = await mETH.connect(sender).transfer(receiver.address, amount)
  console.log(`Transferred ${amount} tokens to from ${sender.address} to ${receiver.address}\n`)

  // Set up exchange users
  const user1 = accounts[0]
  const user2 = accounts[1]
  amount = tokens(10000)

  // User1 approves 10000 QT
  transaction = await QT.connect(user1).approve(exchange.address, amount)
  await transaction.wait()
  console.log(`Approved ${amount} QT tokens from ${user1.address}\n`)

  // User1 depostits 10000 QT
  transaction = await exchange.connect(user1).depositToken(QT.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} QT tokens from ${user1.address}\n`)

  // User2 approves 10000 mETH
  transaction = await mETH.connect(user2).approve(exchange.address, amount)
  await transaction.wait()
  console.log(`Approved ${amount} mETH tokens from ${user2.address}\n`)

  // User2 depostits 10000 mETH
  transaction = await exchange.connect(user2).depositToken(mETH.address, amount)
  await transaction.wait()
  console.log(`Deposited ${amount} mETH tokens from ${user2.address}\n`)

  ////////////////////////////////////////////////////////////////////////////////
  // Seed a Cancelled Order
  //
  let orderId
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), QT.address, tokens(5))
  result = await transaction.wait()
  console.log(`Made order from ${user1.address}`)

  // User 1 cancels order
  orderId = result.events[0].args.id
  transaction = await transaction.wait()
  console.log(`Cancelled order from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  ////////////////////////////////////////////////////////////////////////////////
  // Seed a Filled Order
  //

  // User1 makes order1
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), QT.address, tokens(10))
  result = await transaction.wait()
  console.log(`Made order1 from ${user1.address}`)

  // User2 fills order1
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order from ${user1.address}`)

  // Wait 1 second
  await wait(1)

  // User1 makes order2
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(50), QT.address, tokens(15))
  result = await transaction.wait()
  console.log(`Made order2 from ${user1.address}\n`)

  // User2 fills order2
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order2 from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  // User1 makes order3
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(200), QT.address, tokens(20))
  result = await transaction.wait()
  console.log(`Made order3 from ${user1.address}\n`)

  // User2 fills order3
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log(`Filled order3 from ${user1.address}\n`)

  // Wait 1 second
  await wait(1)

  //////////////////////////////////////////////////////////////////////////////
  // Seed Open Orders
  

  // User1 makes 10 orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(10 * i), QT.address, tokens(10))
    result = await transaction.wait()
    console.log(`User1 made order i from ${user1.address}`)

    // Wait 1 second
    await wait(1)
  }

  // User2 makes 10 orders
  for(let i = 1; i <= 10; i++) {
    transaction = await exchange.connect(user2).makeOrder(QT.address, tokens(10), mETH.address, tokens(10 * i))
    result = await transaction.wait()
    console.log(`User2 made order i from ${user1.address}`)

    // Wait 1 second
    await wait(1)
  }

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});