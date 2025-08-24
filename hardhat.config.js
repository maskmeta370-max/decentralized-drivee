require("@nomicfoundation/hardhat-toolbox");
// Make sure dotenv is installed: npm install dotenv
require('dotenv').config({ path: './my-app/.env.local' });

// Get the environment variables for Amoy
const { NEXT_PUBLIC_AMOY_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.9",
  networks: {
    // This section defines the 'amoy' network
    amoy: {
      url: NEXT_PUBLIC_AMOY_RPC_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 35000000000, // 35 gwei
      gas: 2100000, // Gas limit
      timeout: 60000 // 60 seconds
    }
  }
};
