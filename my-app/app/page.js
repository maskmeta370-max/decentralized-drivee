// my-app/app/page.js
'use client';
import { useState, useEffect, Suspense } from 'react';
import Sidebar from '../components/Sidebar';
import { useWallet } from '../hooks/useWallet';
import { getFileManagerContract } from '../utils/web3';
import axios from 'axios';
import { Canvas } from '@react-three/fiber';
import { FileCrystal } from '../components/FileCrystal';

// ... (The FileUpload component code remains exactly the same as before)
const FileUpload = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    setIsUploading(true);
    setUploadStatus('1/3: Uploading to IPFS...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const pinataResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
            'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
          },
        }
      );
      const fileCid = pinataResponse.data.IpfsHash;
      setUploadStatus('2/3: Recording ownership on blockchain...');

      const contract = await getFileManagerContract();
      const transaction = await contract.addFile(selectedFile.name, fileCid);
      setUploadStatus('3/3: Waiting for transaction confirmation...');

      await transaction.wait();

      setUploadStatus('✅ Success! Your file is secured.');
      onUploadSuccess();

    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 4001) {
        setUploadStatus('❌ Transaction rejected by user.');
      } else {
        setUploadStatus('❌ Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  return (
    <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">Upload a New Asset</h2>
      <div className="flex items-center space-x-4">
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
          className="block w-full text-sm text-light-silver file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-electric-cyan/20 file:text-electric-cyan hover:file:bg-electric-cyan/30 cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="bg-electric-cyan/80 hover:bg-electric-cyan text-space-indigo font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isUploading ? 'Processing...' : 'Upload to Vault'}
        </button>
      </div>
      {uploadStatus && <p className="text-sm text-white/70 mt-4">{uploadStatus}</p>}
    </div>
  );
};


// NEW FileList component with 3D Canvas
const FileList = ({ files, isLoading }) => {
  if (isLoading) {
    return <div className="text-center text-white/60 py-10">Loading your vault...</div>;
  }

  return (
    <div className="bg-white/10 border border-white/20 rounded-lg p-6 h-[500px]">
       <h2 className="text-2xl font-bold text-white mb-4">Your Vault</h2>
       {files.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-center text-white/60">Your vault is empty. Upload a file to get started.</p>
          </div>
       ) : (
        <Canvas camera={{ position: [0, 0, 10], fov: 25 }}>
          <Suspense fallback={null}>
            {/* Add some lighting to the scene */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.3} color="magenta" />

            {files.map((file) => (
              <FileCrystal key={file.id} file={file} />
            ))}
          </Suspense>
        </Canvas>
       )}
    </div>
  );
};

// Main page component
export default function Home() {
  const { account, isLoading, connectWallet } = useWallet();
  const [userFiles, setUserFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const loadUserFiles = async () => {
    if (!account) return;
    setIsLoadingFiles(true);
    try {
      const contract = await getFileManagerContract();
      const filesFromChain = await contract.getMyFiles();

      // Calculate positions for a grid layout
      const formattedFiles = filesFromChain.map((file, index) => {
        const x = (index % 4 - 1.5) * 3; // 4 items per row
        const y = -Math.floor(index / 4) * 4;
        return {
          id: Number(file.id),
          fileName: file.fileName,
          fileCid: file.fileCid,
          ipfsUrl: `https://gateway.pinata.cloud/ipfs/${file.fileCid}`,
          position: [x, y, 0], // Position in 3D space
        }
      });

      setUserFiles(formattedFiles.reverse());
    } catch (error) {
      console.error('Error loading user files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (account) {
      loadUserFiles();
    }
  }, [account]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">My Vault</h1>
            <p className="text-white/60">Manage your secure, decentralized files.</p>
          </div>
          <div>
            {account ? (
              <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="bg-electric-cyan/80 hover:bg-electric-cyan text-space-indigo font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {account ? (
          <div>
            <FileUpload onUploadSuccess={loadUserFiles} />
            <FileList files={userFiles} isLoading={isLoadingFiles} />
          </div>
        ) : (
          <div className="text-center py-16 bg-white/5 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Your Digital Vault</h2>
            <p className="text-white/60">Connect your wallet to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
