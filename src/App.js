import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image,
  Modal, useDisclosure, HStack, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody
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
  const [candleQuantities, setCandleQuantities] = useState({ 1: 0, 2: 0, 3: 0 });
  const [selectedCandle, setSelectedCandle] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedSkullId, setSelectedSkullId] = useState(null);
  const [buttonText, setButtonText] = useState('Loading...');
  const [buttonColor, setButtonColor] = useState('grey');
  const [isModalOpen, setIsModalOpen] = useState(false);


  const readOnlyProvider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/edd1ef15a39f46a495d9441c6bdb9c45");

  const provider = useMemo(() => {
    return new ethers.providers.Web3Provider(window.ethereum);
  }, []);

  const candlesContract = useMemo(() => {
    return new ethers.Contract("0x521945fDCEa1626E056E89A3abBDEe709cf3a837", candlesABI, provider);
  }, [provider]);

  const skullsContract = new ethers.Contract(
    "0x67e3e965ce5ae4d6a49ac643205897acb32fcf6e",
    skullsABI,
    readOnlyProvider
  );



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


  const getEnsName = async (address) => {
    try {
      const ensName = await provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error("Error resolving ENS name:", error);
      return null;
    }
  };
  

  // #endregion

  // #region Candles Orchestration
  const queryCandles = useCallback(async () => {
    if (!userAddress) return;

    let quantities = { 1: 0, 2: 0, 3: 0 };
    for (let id = 1; id <= 3; id++) {
      const balance = await candlesContract.balanceOf(userAddress, id);
      quantities[id] = parseInt(balance.toString(), 10);
    }
    setCandleQuantities(quantities);
  }, [userAddress, candlesContract]);

  useEffect(() => {
    queryCandles();
  }, [queryCandles]);


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

    return (
      <div>
        {totalCandles > 0 && (
          <Text color="white" fontSize="x-large" textAlign="center" mb="20px">
            {selectedCandle ? "Select a Skull" : "Select a Candle"}
          </Text>
        )}
        <div className="candle-container">
          {Object.entries(candleQuantities).flatMap(([tokenId, quantity]) =>
            Array.from({ length: quantity }, (_, index) => (
              <img
                key={`${tokenId}-${index}`}
                src={getCandleImage(parseInt(tokenId, 10))}
                alt={`Candle ${tokenId}`}
                className={`candle-image ${selectedCandle === tokenId ? 'selected' : 'non-selected'}`}
                onClick={() => handleCandleClick(tokenId)}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  //#endregion

  // #region Skull Grid Management
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleSkullClick = async (formattedId) => {
    console.log("Skull clicked: ", formattedId);
    setSelectedSkullId(formattedId);
    setIsModalOpen(true); // Open modal
    setButtonText('Loading...');
    setButtonColor('grey');
    await checkTokenOwnership(formattedId); // Fetch new data
  };


  // #region Token Ownership
  const checkTokenOwnership = async (tokenId) => {
    try {
        console.log(`Checking ownership for token ID: ${tokenId}`);
        const owner = await skullsContract.ownerOf(tokenId);
        console.log(`Owner of the token: ${owner}`);

        const ensName = await getEnsName(owner);
        console.log("ENS Name: ", ensName);  // Debug log

        let displayText;
        if (ensName) {
            displayText = ensName; // Full ENS name
        } else {
            displayText = `${owner.substring(0, 6)}...${owner.substring(owner.length - 6)}`;
        }
        
        console.log(`Display Text: ${displayText}`); // Debug log
        setButtonText(
            <>
                Owned by:<br />
                {displayText}
            </>
        );
        setButtonColor('black');
    } catch (error) {
        console.error("Error checking token ownership:", error);
    }
};


  // #endregion

  const ScrollingSkullsGrid = () => {

    const skulls = Array.from({ length: 365 }, (_, i) => {
      const formattedId = String(i + 1).padStart(3, '0');
      return (
        <img
          key={i}
          src={`/images/skulls/DW365-${formattedId}.jpg`}
          alt={`Skull ${formattedId}`}
          className="skull-image"
          onClick={() => handleSkullClick(formattedId)}
        />
      );
    });

    // Add the endcap image as the last item
    skulls.push(
      <img
        key="endcap"
        src="/endcap.png"
        alt="End Cap"
        className="endcap"
      />
    );



    return (
      <div>
        <div className="scrolling-skulls-grid">{skulls}</div>
        {selectedSkullId && (
          <Modal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setButtonText('Loading...'); setButtonColor('grey');}}>
          {console.log('Rendering Modal...')}

            <ModalOverlay />

            
            <ModalContent>
              <ModalHeader
                textAlign="center"
                fontFamily="Rockledge, sans-serif"
                style={{ fontSize: '3em' }}
                mb={"-5px"}
              >
                DW365-{selectedSkullId.padStart(3, '0')}
              </ModalHeader>

              <ModalBody display="flex" flexDirection="column" justifyContent="center" style={{ paddingBottom: '25px' }}>
                <Image
                  src={`/images/skulls/DW365-${selectedSkullId}.jpg`}
                  alt={`Skull ${selectedSkullId}`}
                  boxSize="400px"
                />
                <Button
                  style={{ backgroundColor: buttonColor, color: 'white' }}
                  width={"60%"}
                  mt="10px"
                  alignSelf={"center"}
                  border={"1px"}
                  borderColor={"black"}
                >
                  {buttonText}
                </Button>
              </ModalBody>

            </ModalContent>
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
          onClick={!isWalletConnected ? connectWallet : () => {/* perform ritual action */ }}
          m={4}
        >
          {selectedCandle ? 'Perform Ritual' : 'Connect Wallet'}
        </Button>
        {isWalletConnected ?
          <Text color="white" fontSize="small" opacity={.5}>{userAddress}</Text> :
          <Text color="white" fontSize="small" opacity={0}>.</Text>
        }
            <ScrollingSkullsGrid
      selectedSkullId={selectedSkullId}
      setSelectedSkullId={setSelectedSkullId}
      isModalOpen={isModalOpen}
    />
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
