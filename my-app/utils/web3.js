import { ethers } from 'ethers';
import FileManagerABI from '../contracts/FileManager.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    // Note: ethers v6 uses BrowserProvider
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

export const getSigner = async () => {
  const provider = getProvider();
  if (!provider) throw new Error('No wallet provider found');

  // This is the correct method for ethers v6
  return await provider.getSigner();
};

export const getFileManagerContract = async () => {
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, FileManagerABI.abi, signer);
};

export const getFileManagerContractReadOnly = () => {
  const provider = getProvider();
  if (!provider) throw new Error('No provider found');

  return new ethers.Contract(CONTRACT_ADDRESS, FileManagerABI.abi, provider);
};