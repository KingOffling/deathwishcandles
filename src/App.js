import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image, HStack,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import candlesABI from './candlesABI.json';
import skullsABI from './skullsABI.json';
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
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const candlesAddress = "0x521945fDCEa1626E056E89A3abBDEe709cf3a837";
  const skullsAddress = "0x67e3e965ce5ae4d6a49ac643205897acb32fcf6e";
  const candlesContract = new ethers.Contract(candlesAddress, candlesABI, provider);
  const skullsContract = new ethers.Contract(skullsAddress, skullsABI, provider);
  const [candleQuantities, setCandleQuantities] = useState({ 1: 0, 2: 0, 3: 0 });

  const skullSize = 55;
  const skullsPerRow = Math.floor(window.innerWidth / skullSize);
  const rowsPerScreen = Math.floor(window.innerHeight / skullSize);
  const initialSkullsCount = 365;
  const [skullsLoaded, setSkullsLoaded] = useState(initialSkullsCount);


  useEffect(() => {
    if (userAddress) {
      queryCandles();
    }
  }, [userAddress]);

  const queryCandles = async () => {
    try {
      let quantities = { 1: 0, 2: 0, 3: 0 };
      for (let id = 1; id <= 3; id++) {
        const balance = await candlesContract.balanceOf(userAddress, id);
        quantities[id] = parseInt(balance.toString(), 10);
      }
      setCandleQuantities(quantities);
    } catch (error) {
      console.error("Error querying candles:", error);
    }
  };

  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        setIsWalletConnected(false);
        setUserAddress('');
        setCandleQuantities({ 1: 0, 2: 0, 3: 0 });
      } else {
        const newAddress = accounts[0];
        setUserAddress(newAddress);
        setIsWalletConnected(true);
        await queryCandles();
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
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask!');
      return;
    }

    await provider.send("eth_requestAccounts", []);
    const address = await signer.getAddress();

    setIsWalletConnected(true);
    setUserAddress(address);
  };

  const [selectedCandle, setSelectedCandle] = useState(null);

  const handleCandleClick = useCallback((candleId) => {
    setSelectedCandle(candleId);
  }, []);

  const DisplayCandles = React.memo(({ candleQuantities }) => {
    const totalCandles = Object.values(candleQuantities).reduce((acc, quantity) => acc + quantity, 0);

    const getCandleImage = (tokenId) => {
      switch (tokenId) {
        case 1: return rareCandle;
        case 2: return uncommonCandle;
        case 3: return commonCandle;
        default: return null;
      }
    };

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
  });

  const ScrollingSkullsGrid = () => {
    const [allSkulls, setAllSkulls] = useState([]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selectedSkullId, setSelectedSkullId] = useState(null);

    useEffect(() => {
      let newSkulls = [];
      for (let i = 1; i <= skullsLoaded; i++) {
        let formattedId = String(((i - 1) % 365) + 1).padStart(3, '0');
        let imgSrc = `/images/skulls/DW365-${formattedId}.jpg`;
        newSkulls.push(
          <img key={i} src={imgSrc} alt={`Skull ${i}`} className="skull-image"
            onClick={() => { setSelectedSkullId(formattedId); onOpen(); }} />
        );
      }
      setAllSkulls(newSkulls);
    }, [skullsLoaded, onOpen]);

    return (
      <div>
        <div className="scrolling-skulls-grid">
          {allSkulls}
        </div>
        {selectedSkullId && (
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>DW365-{selectedSkullId}</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Image src={`/images/skulls/DW365-${selectedSkullId}.jpg`} width="400px" height="400px" />
              </ModalBody>
            </ModalContent>
          </Modal>
        )}
      </div>
    );
  };

  // This useEffect hook has been removed
  // useEffect(() => {
  //   const handleScroll = () => {
  //     if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
  //       setSkullsLoaded(prev => prev + skullsPerRow);
  //     }
  //   };
  //   window.addEventListener('scroll', handleScroll);
  //   return () => window.removeEventListener('scroll', handleScroll);
  // }, [skullsPerRow]);

  return (
    <ChakraProvider theme={theme}>
      <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
        <Image src={logo} width="400px" marginTop={"50px"} />
        {isWalletConnected && candleQuantities && <Text color="white" fontSize="x-large">Select Your Candle</Text>}
        {candleQuantities && <DisplayCandles candleQuantities={candleQuantities} />}
        <Button
          colorScheme="red"
          onClick={!isWalletConnected ? connectWallet : () => {/* perform ritual action */}}
          m={4}
        >
          {selectedCandle ? 'Perform Ritual' : 'Connect Wallet'}
        </Button>
        {isWalletConnected ? <Text color="white" fontSize="small" opacity={.5}>{userAddress}</Text> : <Text color="white" fontSize="small" opacity={0}>.</Text>}
        <ScrollingSkullsGrid />
          <HStack spacing={4} m={"20px"}>
            <a href="https://twitter.com/deathwishnft" target="_blank" rel="noopener noreferrer">Twitter</a>
            <a href="https://opensea.io/deathwish-365" target="_blank" rel="noopener noreferrer">OpenSea</a>
            <a href="https://discord.gg/deathwishnft" target="_blank" rel="noopener noreferrer">OpenSea</a>
          </HStack>
      </VStack>
      
          
      
    </ChakraProvider>
  );
}

export default App;
