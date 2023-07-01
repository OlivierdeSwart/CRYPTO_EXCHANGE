import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import config from '../config.json';

import { 
  loadProvider
  , loadNetwork
  , loadAccount
  , loadTokens
  , loadExchange
   } from '../store/interactions';

function App() {
  const dispatch = useDispatch() // Connect to Redux storage

  const loadBlockchainData = async() => {
    // Connect Ethers to Blockchain | PROVIDER = connection to blockchain 
    // A PROVIDER in ethers is a read-only abstraction to access the blockchain data.
    const provider = loadProvider(dispatch)

    // Fetch current network's chain id: 31337
    const chainId = await loadNetwork(provider, dispatch)

    // Fetch current account & balance from Metamask
    await loadAccount(provider, dispatch)

    // Load token smart contracts
    const QT = config[chainId].QT
    const mETH = config[chainId].mETH
    await loadTokens(provider, [QT.address, mETH.address], dispatch)

    // Load exchange smart contract
    const exchangeConfig = config[chainId].exchange
    await loadExchange(provider, exchangeConfig.address, dispatch)
  }

  useEffect(() => {
    loadBlockchainData()
  })

  return (
    <div>

      {/* Navbar */}

      <main className='exchange grid'>
        <section className='exchange__section--left grid'>

          {/* Markets */}

          {/* Balance */}

          {/* Order */}

        </section>
        <section className='exchange__section--right grid'>

          {/* PriceChart */}

          {/* Transactions */}

          {/* Trades */}

          {/* OrderBook */}

        </section>
      </main>

      {/* Alert */}

    </div>
  );
}

export default App;
