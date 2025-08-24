// my-app/utils/web3.js
import { ethers } from 'ethers';
// Make sure the path to your ABI file is correct
import FileManagerABI from '../contracts/FileManager.json';

// Get the contract address from your .env.local file
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Helper function to get the browser's provider (MetaMask)
export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Helper function to get the signer, which is needed to send transactions
export const getSigner = async () => {
  const provider = getProvider();
  if (!provider) throw new Error('No wallet provider found');
  return await provider.getSigner();
};

// Helper function to create a contract instance that can send transactions
export const getFileManagerContract = async () => {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, FileManagerABI.abi, signer);
};