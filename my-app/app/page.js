'use client';
import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { getFileManagerContract } from '../utils/web3';
import axios from 'axios';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
console.log("Reading Contract Address:", contractAddress);

export default function Home() {
  const { account, isConnected, isLoading, connectWallet } = useWallet();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }
    const file = selectedFile;

    try {
      setIsUploading(true);
      setUploadStatus('Uploading to IPFS...');

      const formData = new FormData();
      formData.append('file', file);

      const pinataResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
            'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
          },
        }
      );

      const fileCid = pinataResponse.data.IpfsHash;
      console.log('File uploaded to IPFS with CID:', fileCid);
      setUploadStatus('Recording ownership on blockchain...');

      const fileManagerContract = await getFileManagerContract();
      const transaction = await fileManagerContract.addFile(file.name, fileCid);
      setUploadStatus('Waiting for transaction confirmation...');

      await transaction.wait();

      setUploadStatus('Success! File uploaded and ownership recorded.');
      setTimeout(() => setUploadStatus(''), 3000);

      await loadUserFiles();

    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 4001) {
        setUploadStatus('Transaction rejected by user');
      } else {
        setUploadStatus('Upload failed. Please try again.');
      }
      setTimeout(() => setUploadStatus(''), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  const loadUserFiles = async () => {
    if (!isConnected) return;
    try {
      setIsLoadingFiles(true);
      const contract = await getFileManagerContract();
      const files = await contract.getMyFiles();

      // Since our contract returns an array of CIDs, we format it here
      const formattedFiles = files.map((cid, index) => ({
        id: index,
        fileCid: cid,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      }));

      setUserFiles(formattedFiles);
    } catch (error) {
      console.error('Error loading user files:', error);
      alert('Failed to load files. Make sure you are connected to the correct network.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isConnected && account) {
      loadUserFiles();
    }
  }, [isConnected, account]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Web3 Cloud Storage</h1>
        <p className="text-gray-600">Decentralized file storage on IPFS with Polygon blockchain ownership</p>
      </header>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Wallet Connection</h2>
        {!isConnected ? (
          <button onClick={connectWallet} disabled={isLoading} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50">
            {isLoading ? 'Connecting...' : 'Connect MetaMask'}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 font-medium">✅ Wallet Connected</p>
              <p className="text-sm text-gray-500">{account.slice(0, 6)}...{account.slice(-4)}</p>
            </div>
            <div className="text-sm text-gray-500">Network: Polygon Amoy Testnet</div>
          </div>
        )}
      </div>

      {isConnected && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Upload File</h2>
            <div className="space-y-4">
              <div>
                <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <button onClick={handleUpload} disabled={!selectedFile || isUploading} className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? 'Uploading...' : 'Upload to Web3 Storage'}
              </button>
              {uploadStatus && (
                <div className={`p-3 rounded-lg ${uploadStatus.includes('Success') ? 'bg-green-100 text-green-700' : uploadStatus.includes('failed') || uploadStatus.includes('rejected') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">My Files</h2>
              <button onClick={loadUserFiles} disabled={isLoadingFiles} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                {isLoadingFiles ? 'Loading...' : 'Refresh Files'}
              </button>
            </div>
            {isLoadingFiles ? <p>Loading files...</p> : userFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userFiles.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-800 break-all">CID: {file.fileCid}</p>
                      </div>
                      <a href={file.ipfsUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                        View File
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
