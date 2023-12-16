import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image, Spinner, Box,
  Modal, HStack, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter
} from '@chakra-ui/react';
import { ethers } from 'ethers';
import candlesABI from './candlesABI.json';
import skullsABI from './skullsABI.json';
import rareCandle from './images/candles/rare.png';
import uncommonCandle from './images/candles/uncommon.png';
import commonCandle from './images/candles/common.png';
import logo from './images/logo.png';
import ritualABI from './ritualABI.json';
// eslint-disable-next-line
import MobileVersion from './MobileVersion';
import './App.css';



const theme = extendTheme({
  colors: {
    red: { 500: '#E53E3E' },
    black: { 500: '#000000' },
  },
});

function App() {
  // eslint-disable-next-line
  const [TEST, setTEST] = useState(true);


  // eslint-disable-next-line
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
  const [burningCandle, setBurningCandle] = useState(null);
  const [skullDescription, setSkullDescription] = useState('');
  const [quoteAuthor, setQuoteAuthor] = useState('');
  const [mintedDate, setMintedDate] = useState('');
  const [prestigeStatus, setPrestigeStatus] = useState('');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [isModalContentLoading, setIsModalContentLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mainImageClass, setMainImageClass] = useState('');
  const [transactionStage, setTransactionStage] = useState(null);
  const [canClickCandles, setCanClickCandles] = useState(true);


  // eslint-disable-next-line
  const [isTransactionConfirmed, setIsTransactionConfirmed] = useState(false);


  // eslint-disable-next-line
  const [selectedCandleImage, setSelectedCandleImage] = useState(null);
  // eslint-disable-next-line
  const [MainImage, setMainImage] = useState(null);
  // eslint-disable-next-line
  const [ModalImage, setModalImage] = useState(null);
  // eslint-disable-next-line
  const [selectedTokenPrestigeStatus, setSelectedTokenPrestigeStatus] = useState("Undetermined");

  // eslint-disable-next-line
  const getCandleImage = (tokenId) => {
    switch (tokenId) {
      case 1: return rareCandle;
      case 2: return uncommonCandle;
      case 3: return commonCandle;
      default: return null;
    }
  };

  const resetState = () => {
    setSelectedCandle(null);
    setSelectedSkullId(null);
    setIsLoading(false);
    setMainImageClass('');
    setTransactionStage(null);
    setCanClickCandles(true);
    setIsTransactionConfirmed(false);
    setSelectedCandleImage(null);
    setMainImage(null);
    setModalImage(null);
    setSelectedTokenPrestigeStatus("Undetermined");
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

  // #region Approval Checks

  const checkApproval = useCallback(async () => {
    try {
      const spenderAddress = '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e';
      const isApproved = await candlesContract.isApprovedForAll(userAddress, spenderAddress);

      if (!isApproved) {
        // If approval is not granted for any candle, update the button and return
        setButtonText('Approve Candles');
        setButtonColor('yellow');
        return;
      }
    } catch (error) {
      console.error('Error checking approval:', error);
    }
  }, [userAddress, candlesContract]);

  useEffect(() => {
    if (isWalletConnected) {
      checkApproval();
    }
  }, [isWalletConnected, selectedCandle, checkApproval]);




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
    if (canClickCandles) {
      setSelectedCandle(tokenId);
    }
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

    const getText = () => {
      if (!isWalletConnected) return "-";
      if (!MainImage) return "Select Skull";
      if (!selectedCandle) return "Select Candle";
      if (isTransactionConfirmed) return "Ritual Complete";
      return "Perform Ritual";
    };

    return (
      <div>
        {totalCandles > 0 ? (
          <Text color={getText() === "-" ? "black" : "white"} fontFamily="Rockledge" fontSize="x-large" textAlign="center" mb="20px">
            {getText()}
          </Text>
        ) : (
          <Text color="#969696" fontFamily="Rockledge" fontSize="4xl" textAlign="center" mb="20px">
            You Need A Candle<br />To Perform A Ritual
          </Text>
        )}


        <div className="candle-container">
          {Object.entries(candleQuantities).flatMap(([tokenId, quantity]) =>
            Array.from({ length: quantity }, (_, index) => (
              <img
                key={`${tokenId}-${index}`}
                src={getCandleImage(parseInt(tokenId, 10))}
                alt={`Candle ${tokenId}`}
                className={`candle-image ${selectedCandle === tokenId ? 'selected' : 'non-selected'} ${burningCandle === tokenId ? 'burning' : ''} ${!canClickCandles ? 'no-click' : ''}`}
                onClick={canClickCandles ? () => handleCandleClick(tokenId) : undefined}
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

        // Update the selected skull images based on context
        setModalImage(`/images/skulls/DW365-${formattedId}.jpg`);
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
  const getPrestigeStatus = (prestigeNumber) => {
    let buttonText = "";
    let buttonColor = "";

    switch (prestigeNumber) {
      case 1:
        buttonText = "Prestige: Mythic";
        buttonColor = "orange.500";
        break;
      case 2:
        buttonText = "Prestige: Epic";
        buttonColor = "purple.500";
        break;
      case 3:
        buttonText = "Prestige: Rare";
        buttonColor = "blue.500"
        break;
      case 4:
        buttonText = "Prestige: Uncommon";
        buttonColor = "green.500"
        break;
      default:
        buttonText = "Select Skull";
        buttonColor = "red.500";
    }

    return { buttonText, buttonColor };
  };


  const checkTokenOwnership = async (tokenId) => {
    try {
      console.log(`Checking ownership for token ID: ${tokenId}`);
      const owner = await skullsContract.ownerOf(tokenId);
      console.log(`Owner of the token: ${owner}`);

      // Check if the ritual has been performed for the given token ID
      const ritualResult = await deathwishRitualsContract.ritualPerformed(tokenId);

      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        const { buttonText, buttonColor } = getPrestigeStatus(ritualResult);
        setButtonText(buttonText);
        setButtonColor(buttonColor);
      } else {
        const ensName = await getEnsName(owner);
        let displayText = ensName || `${owner.substring(0, 6)}...${owner.substring(owner.length - 6)}`;
        setButtonText(
          <>
            Owned by: {displayText}
          </>
        );
        setButtonColor('black.500');
      }
    } catch (error) {
      if (error.message.includes("invalid token ID")) {
        setButtonText("Not Yet Migrated");
        setButtonColor("red");
      } else {
        console.error("Error checking token ownership:", error);
      }
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
          className={`skull-image ${!canClickCandles ? 'no-click' : ''}`}
          onClick={canClickCandles ? () => handleSkullClick(formattedId) : undefined}
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
        <div className={`scrolling-skulls-grid ${isLoading ? 'no-pointer' : ''}`}>
          {skulls}
        </div>
        {selectedSkullId && (
          <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setButtonText('Loading...'); setButtonColor('black'); }} transform={isMobile ? "scale(0.7)" : "none"}>
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
                    src={ModalImage}
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
                  isLoading={isLoading}
                  loadingText="Loading..."
                  isDisabled={!canClickCandles || isLoading}
                  _disabled={{ cursor: 'not-allowed' }} 
                >
                  {buttonText}
                </Button>
                )}
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
    if (canClickCandles){
      if (buttonText === 'Not Yet Migrated') {
        window.open('https://migrate.deathwishnft.io/', '_blank');
      } else if (buttonText === 'Select Skull' && selectedSkullId) {
        setMainImage(`/images/skulls/DW365-${selectedSkullId}.jpg`);
        setIsModalOpen(false);
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      } else if (buttonText === 'Approve Candles') {
        approveCandles();
      } else {
        const skullIdNumber = parseInt(selectedSkullId, 10);
        const url = `https://opensea.io/assets/ethereum/0x67e3e965ce5ae4d6a49ac643205897acb32fcf6e/${skullIdNumber}`;
        window.open(url, '_blank');
      }
    }
  };

  // #endregion

  // #region Contract Approvals

  const approveCandles = async () => {
    try {
      if (!window.ethereum || !window.ethereum.selectedAddress) {
        showMessageModal('You must connect a wallet first.');
        return;
      }

      const spenderAddress = '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e';

      await candlesContract.methods.setApprovalForAll(spenderAddress, true).send({ from: window.ethereum.selectedAddress });

      setButtonText('Perform Ritual');
      setButtonColor('red');
    } catch (error) {
      console.error('Error approving candles:', error);
      showMessageModal('There was an error approving the candles.');

    }
  };





  // #endregion

  // #region Perform Ritual

  const deathwishRitualsContract = new ethers.Contract(
    '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e', // Replace with the actual contract address
    ritualABI,
    provider // Use your existing Ethereum provider
  );


  const performRitual = async () => {
    if (!selectedCandle || !selectedSkullId) {
      showMessageModal('Please select both a candle and a skull to continue.');
      return;
    }

    try {
      // Check if the ritual is active
      const isRitualActive = await deathwishRitualsContract.ritualActive();

      if (!isRitualActive) {
        showMessageModal('Rituals are not currently permitted.');
        return;
      }

      // Get the signer
      const signer = provider.getSigner();

      // Create a contract instance using the signer
      const ritualsContract = new ethers.Contract(
        '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e', // Replace with the actual contract address
        ritualABI,
        signer
      );

      // Perform the ritual
      setTransactionStage('loading');
      const tx = await ritualsContract.performRitual(selectedSkullId, selectedCandle);
      await tx.wait();

      // Transaction successful, you can display a success message or update your UI.
      showMessageModal('Ritual successfully performed!');
      handleTransactionCompletion();
    } catch (error) {
      console.error('Error performing ritual:', error);
      setTransactionStage('inert');
      // Check if the error is due to a rejected transaction
      if (error.code === 'ACTION_REJECTED') {
        showMessageModal('User rejected the Ritual transaction.');
        setTransactionStage('inert');
      } else {
        // Handle other errors and display an appropriate message.
        showMessageModal('Failed to perform ritual. Please try again later.');
        setTransactionStage('inert');
      }
    }
  };






  // #endregion

  // #region Transaction Completion Effects

  const handleTransactionCompletion = () => {
    setIsTransactionConfirmed(true);
    setTransactionStage('complete');

    setBurningCandle(selectedCandle);

    setTimeout(() => {
      setBurningCandle(null);
    }, 3000);
  };

  const simulateTransactionCompletion = () => {
    setTransactionStage('loading');
  
    setTimeout(() => {
      handleTransactionCompletion();
    }, 3000);
  };
  
  useEffect(() => {
    let className = "main-image-container";
  
    if (transactionStage === 'loading') {
      className += " loading";
      setCanClickCandles(false);
    } else if (transactionStage === 'complete') {
      // Convert selectedCandle to an integer
      const selectedCandleInt = parseInt(selectedCandle, 10);
      console.log("Selected Candle:", selectedCandleInt);

      switch (selectedCandleInt) {
        case 1:
          className += " mythic";
          break;
        case 2:
          className += " epic";
          break;
        case 3:
          className += " rare";
          break;
        case 4:
          className += " uncommon";
          break;
        case 5:
          className += " common";
          break;
        default:
          className += " default-class";
      }
    } else if (transactionStage === 'inert') {
      className += " inert";
      setCanClickCandles(true);
    }

    console.log("Current className:", className);

    setMainImageClass(className);
}, [transactionStage, selectedCandle]);




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

      // Reset selected candle, skull, and main image when the wallet changes
      setSelectedCandle(null);
      setSelectedSkullId(null);
      setMainImage(null);

      if (accounts.length > 0) {
        setCandleQuantities({ 1: 0, 2: 0, 3: 0 });
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

        <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500" >
          <Image src={logo} width="400px" marginTop={"50px"} />
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Light Your Candle</Text>
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Complete the ritual</Text>
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"1em"} opacity={1}>Define Prestige</Text>
          {MainImage && (
            <Box
              className={mainImageClass}
              boxSize="400px"
              border="3px solid white"
              borderRadius="10px"
              overflow="hidden"
              transition="transform 0.2s, cursor 0.2s"
              _hover={{
                cursor: "pointer",
                transform: "scale(1.05)",
              }}
            >
              <Image
                src={MainImage}
                alt={`Selected Skull ${selectedSkullId}`}
                boxSize="100%"
              />
            </Box>
          )}


          {isWalletConnected && <DisplayCandles />}

          {TEST && (
            <Button
              colorScheme="blue"
              onClick={simulateTransactionCompletion}
              m={4}
            >
              TEST Ritual
            </Button>
          )}

      <Button
        colorScheme={!isWalletConnected ? 'red' : isTransactionConfirmed ? 'yellow' : 'red'}
        onClick={!isWalletConnected ? connectWallet : isTransactionConfirmed ? resetState : performRitual}
        m={4}
        isDisabled={!canClickCandles && !isTransactionConfirmed}
        _disabled={{ cursor: 'not-allowed' }}
      >
        {!isWalletConnected ? 'Connect Wallet' : isTransactionConfirmed ? 'Reset Ritual' : 'Perform Ritual'}
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

  );

}

export default App;
