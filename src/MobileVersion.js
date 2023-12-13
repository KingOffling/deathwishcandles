import React from 'react';
import {
  VStack,
  Image,
  Button,
} from '@chakra-ui/react';

import logo from './images/logo.png';

function MobileVersion() {
  return (
    <VStack spacing={4} align="center" justify="center" minHeight="100vh" bgColor="black.500">
      <Image src={logo} width="200px" marginTop={"50px"} />
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
