import React from 'react';
import {
  VStack,
  Image,
  Button,
} from '@chakra-ui/react';

function MobileVersion() {
  return (
    <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
      <Image src="path_to_your_logo_image.png" width="200px" marginTop={"50px"} />
      <Button
        colorScheme="red"
        onClick={() => {
          // Handle wallet connection logic here
        }}
        m={4}
      >
        Connect Wallet
      </Button>
    </VStack>
  );
}

export default MobileVersion;
