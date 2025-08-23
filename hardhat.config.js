require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config({ path: './my-app/.env.local' });

// Get the environment variables
const { NEXT_PUBLIC_MUMBAI_RPC_URL, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.9",
  networks: {
    mumbai: {
      url: NEXT_PUBLIC_MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};