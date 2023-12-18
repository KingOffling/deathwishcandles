import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button, Text, VStack, ChakraProvider, extendTheme, Image, Spinner, Box, Input,
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
import './App.css';



const theme = extendTheme({
  colors: {
    red: { 500: '#E53E3E' },
    black: { 500: '#000000' },
  },
});

function App() {
  // eslint-disable-next-line
  const [TEST, setTEST] = useState(false);


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
  const [intendedSkullId, setIntendedSkullId] = useState(null);
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
  const [isRitualCompleteModalOpen, setIsRitualCompleteModalOpen] = useState(false);
  const [inputSkullId, setInputSkullId] = useState('');
  const [inputEffect, setInputEffect] = useState('');
  // eslint-disable-next-line
  const [isCandleTransferApproved, setIsCandleTransferApproved] = useState(false);




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
    setBurningCandle(null);
    setSelectedTokenPrestigeStatus("Undetermined");

    queryCandles();
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
    const spenderAddress = '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e';
    try {
      return await candlesContract.isApprovedForAll(userAddress, spenderAddress);
    } catch (error) {
      console.error('Error checking approval:', error);
      showMessageModal('There was an issue checking the approval status. Please try again.');
      return false;
    }
  }, [userAddress, candlesContract, showMessageModal]); // Ensure showMessageModal is included if used


  const requestApproval = async () => {
    const spenderAddress = '0xb4449C28e27b1bD9D74083B80183b65EaB67E49e';
    try {
      await candlesContract.setApprovalForAll(spenderAddress, true);
      showMessageModal('Approval request submitted. Please confirm the transaction in your wallet.');
    } catch (error) {
      console.error('Error requesting approval:', error);
      showMessageModal('There was an issue requesting approval. Please try again.');
    }
  };




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

  // eslint-disable-next-line
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

    const handleCandleInteraction = (tokenId, quantity) => {
      if (quantity > 0 && canClickCandles) {
        setSelectedCandle(tokenId);
      } else if (burningCandle) {

      } else {
        window.open(`https://opensea.io/assets/ethereum/0x521945fdcea1626e056e89a3abbdee709cf3a837/${tokenId}`, '_blank');
      }
    };

    const getText = () => {
      if (!isWalletConnected) return "-";
      if (!MainImage) return "Select Skull";
      if (!selectedCandle) return "Select Candle";
      if (isTransactionConfirmed) return "Ritual Complete";
      return "Perform Ritual";
    };

    return (
      <div>
        <Text color="white" fontFamily="Rockledge" fontSize="x-large" textAlign="center" mb="20px">
          {getText()}
        </Text>

        {
          Object.values(candleQuantities).every(qty => qty === 0) &&
          transactionStage !== 'complete' &&
          !isTransactionConfirmed && (
            <Text color="#969696" fontFamily="Rockledge" fontSize="4xl" textAlign="center" mb="20px">
              You Need A Candle<br />To Perform A Ritual
            </Text>
          )
        }


        <div className="candle-container">
          {Object.entries(candleQuantities).map(([tokenId, quantity]) => (
            <div key={tokenId} className="candle-item">
              <img
                src={getCandleImage(parseInt(tokenId, 10))}
                alt={`Candle ${tokenId}`}
                className={`candle-image ${selectedCandle === tokenId ? 'selected' : 'non-selected'} ${burningCandle === tokenId ? 'burning' : ''} ${quantity === 0 ? 'low-quantity' : ''}`}
                onClick={() => handleCandleInteraction(tokenId, quantity)}
              />
              <Text color="white" fontFamily="Rockledge" fontSize="2xl">
                {quantity}
              </Text>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const updateCandleQuantitiesPostTransaction = () => {
    if (selectedCandle) {
      setCandleQuantities(prevQuantities => ({
        ...prevQuantities,
        [selectedCandle]: Math.max(0, prevQuantities[selectedCandle] - 1) // Decrease by 1 but not below 0
      }));
    }
  };

  //#endregion

  // #region Skull Grid Searchbar

  const handleSkullIdSubmit = () => {
    const id = parseInt(inputSkullId);
    if (id >= 1 && id <= 365) {
      handleSkullClick(String(id).padStart(3, '0'));
      setInputEffect('');
    } else {
      setInputEffect('shake-and-flash-animation');
      setTimeout(() => setInputEffect(''), 500); // Remove class after animation
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setInputSkullId(value);
  };


  // #endregion

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
            Owned by:<br />{displayText}
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
                  {!isMobile && (
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
                  )}
                </div>
                <div className="date-container">
                  <Text color="black" fontFamily={"Arial"} fontSize="12px">
                    {mintedDate}
                  </Text>
                </div>
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

                {isMobile && (
                  <div className="close-button-container">
                    <Button className="close-button" colorScheme="red" onClick={() => setIsModalOpen(false)}>
                      Close
                    </Button>
                  </div>
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
    if (canClickCandles) {
      if (buttonText === 'Not Yet Migrated') {
        window.open('https://migrate.deathwishnft.io/', '_blank');
      } else if (buttonText === 'Select Skull' && selectedSkullId) {
        setMainImage(`/images/skulls/DW365-${selectedSkullId}.jpg`);
        setIntendedSkullId(selectedSkullId);
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
      const isApproved = await checkApproval();
      if (!isApproved) {
        await requestApproval();
        return;
      }

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

      setTransactionStage('loading');
      const tx = await ritualsContract.performRitual(intendedSkullId, selectedCandle);
      await tx.wait();

      showMessageModal('Ritual successfully performed!');
      handleTransactionCompletion();
    } catch (error) {
      console.error('Error performing ritual:', error);
      setTransactionStage('inert');

      if (error.code === 'ACTION_REJECTED') {
        showMessageModal('User rejected the Ritual transaction.');
      } else if (error.message.includes('execution reverted: You must own the DW365 token')) {
        showMessageModal(`Ritual failed: You must own the DW365 token.\n\nSelected Skull ID: ${selectedSkullId}\nIntended Skull ID: ${intendedSkullId}`);
      } else if (error.message.includes('execution reverted: ERC1155: Caller is not owner nor approved')) {
        showMessageModal('You have not yet approved transfer for your Candles.');
      } else {
        showMessageModal('Failed to perform ritual. Please try again later.');
      }
    }
  };






  // #endregion

  // #region Transaction Completion Effects

  const handleTransactionCompletion = () => {
    setIsTransactionConfirmed(true);
    setTransactionStage('complete');
    updateCandleQuantitiesPostTransaction();
    setBurningCandle(selectedCandle);
    setIsRitualCompleteModalOpen(true);
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

  // #region Completion Modal (Twitter)


  const handleBragClick = () => {
    const candleTypes = {
      1: 'Rare Candle',
      2: 'Odd Candle',
      3: 'Candle'
    };
    const tweetSkulls = {
      1: 3,
      2: 5,
      3: 7
    };


    const punchyComments = [
      "In the flicker of defiance, our shadows dance with fire.",
      "Candles aren't just for praying, they're for proclaiming power.",
      'Skulls grin in the candlelight, mocking mortality.',
      'Each flame a tiny rebellion, each skull a testament to defiance.',
      "In the ritual's heart, we find our wildest truths.",
      "Where candles burn, the world's rules blur and bend.",
      'The skulls know things – whispered in flames, secrets of the untamed.',
      'Every candle is a small anarchy, a spark of the unyielding.',
      "In the skull's empty gaze, we see our raw potential.",
      "Flames don't just light the dark, they ignite our rebel spirits.",
      "In the dance of fire and bone, there's a story untold, uncontrolled.",
      "The candle's glow, a beacon for the brave and the bold.",
      "Skulls aren't silent; listen close, they speak in fire's tongue.",
      'Each candlelit is a step off the beaten path, into the wild unknown.',
      "In the ritual's embrace, we find the courage to defy.",
      'Skulls and candles, our relics of rebellion, our icons of the irreverent.',
      'In the heart of the flame, we find our untamed, unapologetic selves.',
      "Where fire meets bone, there's a power unowned and unknown.",
      "In the ritual's light, we're not just alive – we're alight.",
      'Candles flicker like punk rock anthems, skulls our mosh pit.',
      "The candle's flame, a small riot in the night, a spark of the insurgent.",
      "With each skull's stare, we're dared to be different, to dissent.",
      "In the ritual's resonance, we find the rhythm of the rebels.",
      'Skulls aglow, not with fear, but with the fire of the fearless.',
      "The candle's flame, a whispered rebellion against the night.",
      "In the ritual's heart, chaos finds its order.",
      'Candles flicker, taunting the shadows with secrets untold.',
      'Each skull, a testament to defiant truths.',
      "The flame's embrace, a dance with destiny's wild side.",
      "Darkness and light, the skull's eternal revelry.",
      'Where the candle burns, the mundane shatters.',
      "Power, not for the faint-hearted, thrives in the ritual's depths.",
      'Skulls, not silent, echo with tales of the damned and the daring.',
      "In the inferno's heart, destiny’s rogue waves are born.",
      'Rebellion kindled, each flame a beacon of the unbound spirit.',
      'Skulls, candles, and midnight whispers – the triad of the untamed.',
      "Where the candle's light pierces, shadows bow in awe.",
      'Each skull, a defiant guardian of the flame’s untold stories.',
      "Candles, not just burning, but igniting souls' wildest dreams.",
      "In the skull's hollow, echoes of liberty resonate.",
      'Rituals, not for the meek, but for the bold seekers of the abyss.',
      "Flames, the skull's silent conspirators in the dance of defiance.",
      "Each flicker, a challenge to the world's forgotten corners.",
      'Where skulls gaze, the veils of reality tremble.',
      "Candles, the skull's partners in the waltz against conformity.",
      'Rituals, not just acts, but declarations of untamed power.',
      "In the candle's glow, the world's hypocrisy stands naked.",
      'Skulls, not mere bone, but thrones of rebel souls.',
      'Where the fire rages, the truth’s raw face emerges.',
      "In the ritual's embrace, the world's facade crumbles."
    ];



    const getRandomComment = () => {
      const randomIndex = Math.floor(Math.random() * punchyComments.length);
      return punchyComments[randomIndex];
    };

    const candleType = candleTypes[selectedCandle];

    const getSkulls = (candleTypeNumber) => {
      const numberOfSkulls = tweetSkulls[candleTypeNumber] || 3;
      return '💀'.repeat(numberOfSkulls);
    };

    const getSkullImageUrl = (skullId) => {
      const formattedSkullId = skullId.toString().padStart(3, '0');
      return `https://dwritual.netlify.app/images/skulls/DW365-${formattedSkullId}.jpg`;
    };

    const skulls = getSkulls(selectedCandle);
    // eslint-disable-next-line
    const skullImageUrl = getSkullImageUrl(selectedSkullId);

    const tweetContent = `🕯 A RITUAL HAS BEEN COMPLETED 🕯\n\n${skulls}\nThe ${candleType} has been lit\nDW365-${selectedSkullId} is now ${prestigeStatus}.\n${getRandomComment()}\n${skulls}\n\n#DeathWishRitual\n\nDo you have a DeathWish?\n@deathwishnft\ndeathwishnft.io\ndiscord.gg/deathwishnft`;

    const encodedTweet = encodeURIComponent(tweetContent);
    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodedTweet}`;

    window.open(twitterIntentUrl, '_blank');
  };

  const getPrestigeStatusFromCandleID = (candleID) => {
    const mapping = {
      1: 'Mythic',
      2: 'Epic',
      3: 'Rare',
      4: 'Uncommon',
      5: 'Common',
    };

    return mapping[candleID] || 'Unknown';  // Default to 'Unknown' if no mapping found
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

        {/* General Message Modal */}
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



        {/* Ritual Complete Modal */}
        {selectedSkullId && (
          <Modal isOpen={isRitualCompleteModalOpen} onClose={() => setIsRitualCompleteModalOpen(false)} isCentered>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader fontFamily="Rockledge, sans-serif" fontSize="3xl" textAlign="center">Ritual Complete</ModalHeader>
              <ModalBody display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Image
                  src={MainImage}
                  alt={`Selected Skull ${selectedSkullId}`}
                  boxSize={{ base: "60%", md: "90%" }}
                  className={`${mainImageClass} ritual-complete-image`}
                  style={{ aspectRatio: '1 / 1' }}
                />
                <Text fontFamily="Rockledge, sans-serif" fontSize="3xl" mt="10px">DW365-{selectedSkullId.padStart(3, '0')}</Text>
                <Text fontFamily="Rockledge, sans-serif" style={getPrestigeStatusStyle(prestigeStatus)} mt="5px">
                  Prestige Status: {getPrestigeStatusFromCandleID(selectedCandle)}
                </Text>

              </ModalBody>
              <ModalFooter justifyContent="center">
                <Button colorScheme="blue" onClick={handleBragClick}>Brag</Button>
                {isMobile && (
                  <Button colorScheme="red" ml={3} onClick={() => setIsRitualCompleteModalOpen(false)}>Close</Button>
                )}
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}





        <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500" >
          <Image src={logo} width="400px" marginTop={"50px"} />
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Light Your Candle</Text>
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"-1em"} opacity={1}>Complete the ritual</Text>
          <Text color="white" fontFamily={"Rockledge"} fontSize="2em" mb={"1em"} opacity={1}>Unlock Your Prestige</Text>
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
            onClick={!isWalletConnected ? connectWallet : isTransactionConfirmed ? resetState : isCandleTransferApproved ? performRitual : approveCandles}
            m={4}
            isDisabled={!canClickCandles && !isTransactionConfirmed}
            _disabled={{ cursor: 'not-allowed' }}
          >
            {!isWalletConnected ? 'Connect Wallet' : isTransactionConfirmed ? 'Reset Ritual' : isCandleTransferApproved ? 'Perform Ritual' : 'Approve Transfer'}
          </Button>





          {isWalletConnected ?
            <Text color="white" fontSize="small" opacity={.5}>{displayAddress}</Text> :
            <Text color="white" fontSize="small" opacity={0}>.</Text>
          }


          {/* Input Field and Submit Button */}
          <HStack alignSelf="center" ml={5}>
            <Text color="white" fontFamily="Rockledge" fontSize="2xl" letterSpacing="0.15em" mr={"-10px"}>DW365-</Text>
            <Input
              value={inputSkullId}
              onChange={handleInputChange}
              placeholder="000"
              size='md'
              maxLength={3}
              width="58px"
              className={inputEffect}
              style={{
                color: 'white',
                fontFamily: 'Rockledge',
                borderColor: 'darkgrey',
                backgroundColor: 'transparent',
                fontSize: '2xl',
                letterSpacing: '0.15em'
              }}
            />
            <Button
              onClick={handleSkullIdSubmit}
              size="sm"
              colorScheme="black"
              outlineColor={"whiteAlpha.400"}
            >
              💀
            </Button>
          </HStack>


          <ScrollingSkullsGrid
            selectedSkullId={selectedSkullId}
            setSelectedSkullId={setSelectedSkullId}
            isModalOpen={isModalOpen}
          />
          <HStack spacing={4} m={"20px"}>
            <a href="https://twitter.com/deathwishnft" target="_blank" rel="noopener noreferrer" style={{ color: '#636363' }}>Twitter</a>
            <a href="https://opensea.io/deathwish-365" target="_blank" rel="noopener noreferrer" style={{ color: '#636363' }}>OpenSea</a>
            <a href="https://discord.gg/deathwishnft" target="_blank" rel="noopener noreferrer" style={{ color: '#636363' }}>Discord</a>
          </HStack>

        </VStack>
      </div>
    </ChakraProvider>

  );

}

export default App;
