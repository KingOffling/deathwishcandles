import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image, Spinner,
  Modal, HStack, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import candlesABI from './candlesABI.json';
import skullsABI from './skullsABI.json';
import rareCandle from './images/candles/rare.png';
import uncommonCandle from './images/candles/uncommon.png';
import commonCandle from './images/candles/common.png';
import logo from './images/logo.png';
import MobileVersion from './MobileVersion'; 
import './App.css';



const theme = extendTheme({
  colors: {
    red: { 500: '#E53E3E' },
    black: { 500: '#000000' },
  },
});

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [candleQuantities, setCandleQuantities] = useState({ 1: 0, 2: 0, 3: 0 });
  const [selectedCandle, setSelectedCandle] = useState(null);
  const [selectedSkullId, setSelectedSkullId] = useState(null);
  const [buttonText, setButtonText] = useState('Loading...');
  const [buttonColor, setButtonColor] = useState('black');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayAddress, setDisplayAddress] = useState('');
  const [skullDescription, setSkullDescription] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [mintedDate, setMintedDate] = useState('');
  const [prestigeStatus, setPrestigeStatus] = useState('');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isModalContentLoading, setIsModalContentLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // eslint-disable-next-line
  const [selectedCandleImage, setSelectedCandleImage] = useState(null);
  // eslint-disable-next-line
  const [selectedSkullImage, setSelectedSkullImage] = useState(null);
  // eslint-disable-next-line
  const [selectedTokenPrestigeStatus, setSelectedTokenPrestigeStatus] = useState("Undetermined");

  const getCandleImage = (tokenId) => {
    switch (tokenId) {
      case 1: return rareCandle;
      case 2: return uncommonCandle;
      case 3: return commonCandle;
      default: return null;
    }
  };


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
    const ensName = await getEnsName(address);
    setDisplayAddress(ensName || formatAddress(address));
  };


  const getEnsName = useCallback(async (address) => {
    try {
      const ensName = await provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error("Error resolving ENS name:", error);
      return null;
    }
  }, [provider]);


  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

  const handleSkullClick = async (formattedId) => {
    console.log("Skull clicked: ", formattedId);
    setSelectedSkullId(formattedId);
    setIsModalContentLoading(true);
    setIsLoading(true);
  
    try {
        // eslint-disable-next-line
      const [ownershipData, metadata] = await Promise.all([
        checkTokenOwnership(formattedId),
        fetchSkullMetadata(formattedId),
      ]);
  
      if (metadata) {
        setSkullDescription(metadata.description);
        setQuoteAuthor(metadata.quoteAuthor);
        setMintedDate(formatDate(metadata.mintedDate));
        const prestige = metadata.prestigeStatus || "Undetermined"; // Default to "Undetermined"
        setPrestigeStatus(prestige);
        setSelectedTokenPrestigeStatus(prestige); // Set the selected token's prestige status
      }
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching data for skull:", error);
    } finally {
      setIsModalContentLoading(false);
      setIsLoading(false);
    }
  };
  
  


  // #endregion

  // #region Token Ownership
  const checkTokenOwnership = async (tokenId) => {
    try {
      console.log(`Checking ownership for token ID: ${tokenId}`);
      const owner = await skullsContract.ownerOf(tokenId);
      console.log(`Owner of the token: ${owner}`);
  
      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        setButtonText("Select Skull"); // Always show "Select Skull" to the owner
        setButtonColor("red.500");
      } else {
        const ensName = await getEnsName(owner);
        let displayText = ensName || `${owner.substring(0, 6)}...${owner.substring(owner.length - 6)}`;
        setButtonText(
          <>
            Owned by:<br />
            {displayText}
          </>
        );
        setButtonColor('black.500');
      }
    } catch (error) {
      console.error("Error checking token ownership:", error);
    }
  };
  
  
  


  // #endregion

  // #region Skull Grid

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

    // #endregion

    // #region Skull Grid Modal

    return (
      <div>
        <div className="scrolling-skulls-grid">{skulls}</div>
        {selectedSkullId && (
          <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setButtonText('Loading...'); setButtonColor('black'); }}>
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
                <Text style={getPrestigeStatusStyle(prestigeStatus)} align={"center"} fontSize={"26px"} mb={"-14px"} mt={"-14px"}>
                  {prestigeStatus}
                </Text>
              </ModalHeader>

              <ModalBody display="flex" flexDirection="column" justifyContent="center" style={{ paddingBottom: '25px' }}>
                <div className="image-overlay-container">
                  <Image
                    src={`/images/skulls/DW365-${selectedSkullId}.jpg`}
                    alt={`Skull ${selectedSkullId}`}
                    boxSize="400px"
                    border="2px solid black"
                  />
                  <div className="overlay-text">
                    <Text
                      style={{
                        color: "white",
                        fontSize: calculateFontSize(),
                        overflowWrap: "break-word",
                        textAlign: "left",
                        padding: "10px",
                        marginBottom: "auto", 
                      }}
                      className="description-text"
                    >
                      {skullDescription}
                    </Text>
                    <Text
                      style={{
                        color: "white",
                        fontSize: calculateFontSize(),
                        overflowWrap: "break-word",
                        textAlign: "right",
                        padding: "10px"
                      }}
                      className="author-text"
                    >
                      {quoteAuthor}
                    </Text>
                  </div>
                </div>
                <Text color="black" fontFamily={"Arial"} fontSize="12px">
                  {mintedDate}
                </Text>
                {isModalContentLoading ? (
        <Spinner /> 
    ) : (
      <Button
      colorScheme={buttonColor === "gold" ? "yellow" : buttonColor === "red.500" ? "red" : "black"}
      mt="10px"
      alignSelf={"center"}
      onClick={handleButtonClick}
      isLoading={isLoading} // Add isLoading prop here
      loadingText="Loading..." // Optional loading text
    >
      {buttonText}
    </Button>)}
              </ModalBody>

            </ModalContent>
          </Modal>
        )}
      </div>
    );
  };



  //#endregion

  // #region Button Pushing

  const handleButtonClick = () => {
    const skullIdNumber = parseInt(selectedSkullId, 10);
    const url = `https://opensea.io/assets/ethereum/0x67e3e965ce5ae4d6a49ac643205897acb32fcf6e/${skullIdNumber}`;
    window.open(url, '_blank');
  };


  // #endregion

  // #region Perform Ritual
  const performRitual = () => {
    if (!selectedCandle || !selectedSkullId) {
      showMessageModal('Please select both a candle and a skull to continue.');
      return;
    }
    if (selectedCandle && selectedSkullId) {
      setSelectedCandleImage(getCandleImage(selectedCandle));
      setSelectedSkullImage(`/images/skulls/DW365-${selectedSkullId}.jpg`);
      setIsModalOpen(true);
    } else {
      alert('Please select both a candle and a skull to continue.');
    }
  };


  // #endregion

  // #region Message Modal

  const showMessageModal = (message) => {
    setModalMessage(message);
    setIsMessageModalOpen(true);
  };
  

  // #endregion

  // #region Metadata Collection

  const formatDate = (unixTimestamp) => {
    const date = new Date(unixTimestamp * 1000);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const fetchSkullMetadata = async (id) => {
    const skullIdNumber = parseInt(id, 10);
    const metadataUrl = `https://metadata.deathwishnft.io/metadata/${skullIdNumber}`;
    try {
      const response = await fetch(metadataUrl);
      const metadata = await response.json();
      return {
        description: metadata.description,
        quoteAuthor: metadata.attributes.find(attr => attr.trait_type === "Quote Author")?.value,
        mintedDate: metadata.attributes.find(attr => attr.trait_type === "Minted")?.value,
        prestigeStatus: metadata.attributes.find(attr => attr.trait_type === "Prestige Status")?.value,
      };
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return null;
    }
  };

  const getPrestigeStatusStyle = (status) => {
    const baseStyle = {
      fontFamily: "Rockledge, sans-serif",
      letterSpacing: "2px"
    };
    switch (status) {
      case "Mythic":
        return { ...baseStyle, color: "#e69a0e" };
      case "Epic":
        return { ...baseStyle, color: "#ba03fc" };
      case "Rare":
        return { ...baseStyle, color: "#39c0e0" };
      case "Uncommon":
        return { ...baseStyle, color: "#66f28b" };
      case "Common":
      case "Undetermined":
        return { ...baseStyle, color: "#c7c7c7" };
      default:
        return baseStyle;
    }
  };

  const calculateFontSize = () => {
    const combinedLength = skullDescription.length + quoteAuthor.length;
    const baseFontSize = 48; // Starting font size
    const maxFontSize = 28; // Maximum font size you want
    const fontSizeDecreaseRate = 0.8; // Decrease rate per character
  
    // Calculate the font size based on the combined length
    const fontSize = Math.max(baseFontSize - fontSizeDecreaseRate * combinedLength, maxFontSize);
  
    return `${fontSize}px`;
  };
  
  
  


  // #endregion

  // #region Live Updates / Effects
  useEffect(() => {
    const handleAccountsChanged = async (accounts) => {
      setIsWalletConnected(accounts.length > 0);
      const address = accounts[0] || '';
      setUserAddress(address);
      if (accounts.length > 0) {
        await queryCandles();
        const ensName = await getEnsName(address);
        setDisplayAddress(ensName || formatAddress(address));
      } else {
        setCandleQuantities({ 1: 0, 2: 0, 3: 0 });
        setDisplayAddress('');
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
  }, [queryCandles, getEnsName]);
  // #endregion

  return (
    <div>
      {isMobile ? (
        <MobileVersion /> 
      ) : (   
    <ChakraProvider theme={theme}>

<div className={isModalOpen ? "blur-background" : ""}>
      <Modal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ritual Update</ModalHeader>
          <ModalBody>
            <Text>{modalMessage}</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setIsMessageModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
        <Image src={logo} width="400px" marginTop={"50px"} />
        <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Light Your Candle</Text>
        <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Complete the ritual</Text>
        <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"1em"} opacity={1}>Define Prestige</Text>
        {isWalletConnected && <DisplayCandles />}
        <Button
  colorScheme="red"
  onClick={!isWalletConnected ? connectWallet : performRitual}
  m={4}
>
  {!isWalletConnected ? 'Connect Wallet' : 'Perform Ritual'}
</Button>

        {isWalletConnected ?
          <Text color="white" fontSize="small" opacity={.5}>{displayAddress}</Text> :
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
          <a href="https://discord.gg/deathwishnft" target="_blank" rel="noopener noreferrer">Discord</a>
        </HStack>
      </VStack>
      </div>
    </ChakraProvider>
    )}
    </div>
  );

}

export default App;
