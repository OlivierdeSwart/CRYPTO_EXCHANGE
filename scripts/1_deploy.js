async function main() {
  console.log(`Preparing deployment`)

  //Fetch contract to deploy
  const Token = await ethers.getContractFactory("Token")
  const Exchange = await ethers.getContractFactory("Exchange")

  //Fetch accounts
  const accounts = await ethers.getSigners()

  console.log(`Accounts fetched: \n${accounts[0].address}\n${accounts[1].address}\n`)

  //Deploy contract
  const qt = await Token.deploy('Cutie Token <3', 'QT', '1000000')
  await qt.deployed()
  console.log(`QT deployed to: ${qt.address}`)

  const mETH = await Token.deploy('mETH', 'mETH', '1000000')
  await mETH.deployed()
  console.log(`mETH deployed to: ${mETH.address}`)

  const mDAI = await Token.deploy('mDAI', 'mDAI', '1000000')
  await mDAI.deployed()
  console.log(`mDAI deployed to: ${mDAI.address}`)

  const exchange = await Exchange.deploy(accounts[1].address,10)
  await exchange.deployed()
  console.log(`Exchange deployed to: ${exchange.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
