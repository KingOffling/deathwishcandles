import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image,
  Modal, useDisclosure
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import candlesABI from './candlesABI.json';
import rareCandle from './images/candles/rare.png';
import uncommonCandle from './images/candles/uncommon.png';
import commonCandle from './images/candles/common.png';
import logo from './images/logo.png';
import './App.css';

const theme = extendTheme({
  colors: {
    red: { 500: '#E53E3E' },
    black: { 500: '#000000' },
  },
});

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [candleQuantities, setCandleQuantities] = useState({ 1: 0, 2: 0, 3: 0 });
  const [selectedCandle, setSelectedCandle] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedSkullId, setSelectedSkullId] = useState(null);
  
  const provider = useMemo(() => {
    return new ethers.providers.Web3Provider(window.ethereum);
  }, []);

  const candlesContract = useMemo(() => {
    return new ethers.Contract("0x521945fDCEa1626E056E89A3abBDEe709cf3a837", candlesABI, provider);
  }, [provider]);
  

  // #region Wallet Connectivity
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    await provider.send("eth_requestAccounts", []);
    const address = await provider.getSigner().getAddress();
    setIsWalletConnected(true);
    setUserAddress(address);
  };

  // #endregion

  // #region Candles Orchestration
  const queryCandles = useCallback(async () => {
    let quantities = { 1: 0, 2: 0, 3: 0 };
    for (let id = 1; id <= 3; id++) {
      const balance = await candlesContract.balanceOf(userAddress, id);
      quantities[id] = parseInt(balance.toString(), 10);
    }
    setCandleQuantities(quantities);
  }, [userAddress, candlesContract]);
  

  const handleCandleClick = (tokenId) => {
    setSelectedCandle(tokenId);
  };

  const DisplayCandles = () => {
    const getCandleImage = (tokenId) => {
      switch (tokenId) {
        case 1: return rareCandle;
        case 2: return uncommonCandle;
        case 3: return commonCandle;
        default: return null;
      }
    };
  
    const totalCandles = Object.values(candleQuantities).reduce((acc, quantity) => acc + quantity, 0);
  
    if (totalCandles === 0) {
      return <Text color="grey" fontSize="x-large">No Candles Present</Text>;
    }
  
    return (
      <div className="candle-container">
        {Object.entries(candleQuantities).flatMap(([tokenId, quantity]) =>
          Array.from({ length: quantity }, (_, index) => (
            <img
              key={`${tokenId}-${index}`}
              src={getCandleImage(parseInt(tokenId, 10))}
              alt={`Candle ${tokenId}`}
              className={`candle-image ${selectedCandle === tokenId ? 'selected' : ''}`}
              onClick={() => handleCandleClick(tokenId)}
            />
          ))
        )}
      </div>
    );
  };
  //#endregion
  
  // #region Skull Grid Management
  const ScrollingSkullsGrid = () => {
    const allSkulls = Array.from({ length: 365 }, (_, i) => {
      const formattedId = String(i + 1).padStart(3, '0');
      return (
        <img
          key={i}
          src={`/images/skulls/DW365-${formattedId}.jpg`}
          alt={`Skull ${formattedId}`}
          className="skull-image"
          onClick={() => { setSelectedSkullId(formattedId); onOpen(); }}
        />
      );
    });

    return (
      <div>
        <div className="scrolling-skulls-grid">{allSkulls}</div>
        {selectedSkullId && (
          <Modal isOpen={isOpen} onClose={onClose}>
            {/* Modal content */}
          </Modal>
        )}
      </div>
    );
  };
  //#endregion

  // #region Live Updates / Effects
  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      setIsWalletConnected(accounts.length > 0);
      setUserAddress(accounts[0] || '');
      if (accounts.length > 0) {
        await queryCandles();
      } else {
        setCandleQuantities({ 1: 0, 2: 0, 3: 0 });
      }
    };
  
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
  
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [queryCandles]);
  // #endregion

  return (
    <ChakraProvider theme={theme}>
      <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
        <Image src={logo} width="400px" marginTop={"50px"} />
        {isWalletConnected && <DisplayCandles />}
        <Button
          colorScheme="red"
          onClick={!isWalletConnected ? connectWallet : () => {/* perform ritual action */}}
          m={4}
        >
          {selectedCandle ? 'Perform Ritual' : 'Connect Wallet'}
        </Button>
        {isWalletConnected ? 
          <Text color="white" fontSize="small" opacity={.5}>{userAddress}</Text> : 
          <Text color="white" fontSize="small" opacity={0}>.</Text>
        }
        <ScrollingSkullsGrid />
      </VStack>
    </ChakraProvider>
  );
  
}

export default App;
