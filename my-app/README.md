Decentralized Cloud Storage Platform
This project is a decentralized cloud storage platform that provides a secure and resilient alternative to traditional centralized services. It leverages blockchain technology and peer-to-peer networks to empower users with full ownership and control over their data.

Key Features
Client-Side Encryption: All files are encrypted in the browser before being uploaded, ensuring that only the user with the secret key can view them.

Content Hashing: We use IPFS (InterPlanetary File System) which generates a unique content-based hash (CID) for every file, ensuring data integrity.

Access Control: A blockchain-based system allows users to grant and revoke access to their files for other users securely.

Version Control: The platform automatically tracks file changes over time, allowing users to access or revert to previous versions.

Incentive Layer (Conceptual): The architecture is designed to support a future cryptocurrency-based incentive layer to reward users who contribute storage to the network.

User Dashboard: A comprehensive dashboard provides users with an overview of their files, storage analytics, and upload/download history.

Getting Started
Prerequisites
Node.js and npm

MetaMask browser extension

A Pinata account for IPFS pinning

Installation
Clone the repository:

git clone <repository-url>
cd decentralized-drive

Install dependencies for the backend (Hardhat):

npm install

Install dependencies for the frontend (Next.js):

cd my-app
npm install

Set up environment variables:
Create a .env.local file in the my-app directory and add your Pinata API keys:

NEXT_PUBLIC_PINATA_API_KEY=your_api_key
NEXT_PUBLIC_PINATA_SECRET_API_KEY=your_secret_api_key

Running the Application
Deploy the Smart Contract:

Compile the contract: npx hardhat compile

Run a local node: npx hardhat node

Deploy to the local node: npx hardhat run scripts/deploy.js --network localhost

Note: Take the deployed contract address and update it in my-app/app/page.js.

Start the frontend:

cd my-app
npm run dev

Open your browser to http://localhost:3000 and connect your MetaMask wallet (configured for the localhost network).