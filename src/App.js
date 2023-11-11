import React, { useState, useEffect, useRef } from 'react';
import { Button, Box, Text, VStack, Center, ChakraProvider, extendTheme } from '@chakra-ui/react';
import { ethers } from 'ethers';
import candlesABI from './candlesABI.json';
import skullsABI from './skullsABI.json';
import rareCandle from './images/candles/rare.png';
import uncommonCandle from './images/candles/uncommon.png';
import commonCandle from './images/candles/common.png';
import './App.css';

const theme = extendTheme({
  colors: {
    red: {
      500: '#E53E3E',
    },
    black: {
      500: '#000000',
    },
  },
});

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  const candlesAddress = "0x521945fDCEa1626E056E89A3abBDEe709cf3a837";
  const skullsAddress = "0x67e3e965ce5ae4d6a49ac643205897acb32fcf6e";

  const candlesContract = new ethers.Contract(candlesAddress, candlesABI, provider);
  const skullsContract = new ethers.Contract(skullsAddress, skullsABI, provider);

  const [candleQuantities, setCandleQuantities] = useState({ 1: 0, 2: 0, 3: 0 });
  const [loadedGrids, setLoadedGrids] = useState(1); // Start with 1 grid loaded
  const [skullsLoaded, setSkullsLoaded] = useState(10); // Load 10 skulls initially




  //#region QUERY TOKENS
  /////////////////////////
  useEffect(() => {
    if (userAddress){
    queryCandles(provider);}
  }, [userAddress]);

  const queryCandles = async (provider) => {
    try {
      let quantities = { 1: 0, 2: 0, 3: 0 };
      for (let id = 1; id <= 3; id++) {
        const balance = await candlesContract.balanceOf(userAddress, id);
        quantities[id] = parseInt(balance.toString(), 10);
        console.log(`Candle ID ${id} Balance:`, balance.toString());
      }
      setCandleQuantities(quantities);
    } catch (error) {
      console.error("Error querying candles:", error);
    }
  };

  const querySkull = async (provider, tokenID) => {
    const maxId = 365; // or use totalSupply if available
    for (let id = 1; id <= maxId; id++) {
      try {
        const owner = await skullsContract.ownerOf(id);
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          console.log(`You own Skull ID: ${id}`);
        }
      } catch (error) {
        if (error.code === 'CALL_EXCEPTION') {
//          console.log(`Skull ID ${id} does not exist or other error`);
        } else {
          console.error("Unexpected error querying skulls:", error);
          break; // Optional: break out of the loop if a non-expected error occurs
        }
      }
    }
  };
  //#endregion
 
  //#region WALLET CONNECTOR
  /////////////////////////

  // wallet updator
  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setIsWalletConnected(false);
        setUserAddress('');
        setCandleQuantities({ 1: 0, 2: 0, 3: 0 }); // Reset candle quantities
      } else {
        const newAddress = accounts[0];
        setUserAddress(newAddress);
        setIsWalletConnected(true);
        await queryCandles(provider); // Fetch candles for the new address
      }
    };
  
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
  
    // Clean up the event listener when the component unmounts
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []); // This effect does not depend on any state or props
  
  


  // wallet connector
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }
  
      // Request account access
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
  
      // Get the user's address
      const address = await signer.getAddress();
      console.log('Connected with address:', address);
      
      // Set state
      setIsWalletConnected(true);
      setUserAddress(address);
    } catch (error) {
      console.error(error);
      alert('An error occurred!');
      setIsWalletConnected(false);
      setUserAddress('');
    }
  }
  
  
  
    //#endregion

//#region SHOW CANDLES
////////////////////////////
const DisplayCandles = ({ candleQuantities }) => {
  const getCandleImage = (tokenId) => {
    switch (tokenId) {
      case 1:
        return rareCandle;
      case 2:
        return uncommonCandle;
      case 3:
        return commonCandle;
      default:
        return null;
    }
  };

  return (
    <div className="candle-container">
      {Object.entries(candleQuantities).flatMap(([tokenId, quantity]) =>
        Array.from({ length: quantity }, (_, index) => (
          <img
            key={`${tokenId}-${index}`}
            src={getCandleImage(parseInt(tokenId, 10))}
            alt="Candle"
            className="candle-image"
          />
        ))
      )}
    </div>
  );
};
//#endregion

  //#region SCROLLING FOREVER
 ////////////////////////////
 useEffect(() => {
  const handleScroll = () => {
    // Check if the user is near the bottom
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 100) {
      setSkullsLoaded(skullsLoaded => skullsLoaded + 10); // Load 10 more skulls
    }
  };

  window.addEventListener('scroll', handleScroll);

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}, []);


//endregion

//#region SHOW SKULLS
//////////////////////////
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


const ScrollingSkullsGrid = () => {
  const createSkullImages = (count) => {
    let skulls = [];
    for (let i = 1; i <= count; i++) {
      let formattedId = String(i % 365).padStart(3, '0'); // Use modulo for infinite effect
      let imgSrc = `/images/skulls/DW365-${formattedId}.jpg`;
      skulls.push(
        <img 
          key={i} 
          src={imgSrc} 
          alt={`Skull ${i}`} 
          className="skull-image"
        />
      );
    }
    // Shuffle the array of skulls here
    return shuffleArray(skulls);
  };

  return (
    <div className="scrolling-skulls-grid">
      {createSkullImages(skullsLoaded)}
    </div>
  );
};










  //#region SHOWTIME
  /////////////////////////
  return (
    <ChakraProvider theme={theme}>
      <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
      {isWalletConnected
       && candleQuantities && <Text color="white" fontSize="x-large">Select Your Candle</Text>}
      {candleQuantities && <DisplayCandles candleQuantities={candleQuantities} />}
        <Button 
          colorScheme="red" 
          onClick={!isWalletConnected ? connectWallet : null}
          m={4}
        >
          {isWalletConnected ? 'Connected' : 'Connect Wallet'}
        </Button>
        {isWalletConnected ? (
          <Text color="white" fontSize="small" opacity={.5}>
            {`${userAddress}`}
          </Text>
        ) : (
          <Text color="white" fontSize="small" opacity={0}>
            Placeholder
          </Text>
        )}
          return (
  <div>
    {Array.from({ length: loadedGrids }).map((_, index) => (
      <ScrollingSkullsGrid key={index} />
    ))}
  </div>
);


      </VStack>
    </ChakraProvider>
  );
//#endregion
  
}

export default App;
