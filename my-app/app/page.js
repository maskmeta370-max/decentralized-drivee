"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { downloadWithIntegrityCheck, performIntegrityCheck, displayIntegrityResults } from '../utils/fileIntegrity';
import { useRouter } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';

// Components
import Sidebar from '../components/Sidebar';
import FileCrystal from '../components/FileCrystal';
import Dashboard from '../components/Dashboard';
import FileSharing from '../components/FileSharing';
import FileVersions from '../components/FileVersions';
import SharedFiles from '../components/SharedFiles';

export default function Home() {
  const router = useRouter();
  const { account, connectWallet, contract, disconnectWallet } = useWallet();
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isClient, setIsClient] = useState(false); // State to handle hydration
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFileForSharing, setSelectedFileForSharing] = useState(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState(null);
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles' or 'sharedFiles'

  // This effect runs only once on the client after the component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);





  useEffect(() => {
    const loadFiles = async () => {
      if (contract && account) {
        try {
          const fileCount = await contract.getUserFileCount(account);
          const loadedFiles = [];
          
          for (let i = 0; i < fileCount; i++) {
            try {
              const [fileName, fileType, cid, timestamp] = await contract.getFile(account, i);
              loadedFiles.push({
                id: i,
                name: fileName,
                type: fileType,
                cid: cid,
                size: 'Unknown',
                uploadDate: new Date(Number(timestamp) * 1000).toLocaleDateString()
              });
            } catch (fileError) {
              console.error(`Error loading file ${i}:`, fileError);
            }
          }
          
          setFiles(loadedFiles);
        } catch (error) {
          console.error('Could not fetch files.', error);
          if (error.code === 'BAD_DATA' && error.value === '0x') {
            console.log('Contract returned empty data. Please ensure:');
            console.log('1. MetaMask is connected to localhost:8545');
            console.log('2. You are using the correct account');
            console.log('3. The contract is deployed and accessible');
          }
        }
      }
    };

    if (account) {
      loadFiles();
    }
  }, [contract, account]);


  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile || !encryptionKey) {
      alert("Please select a file and enter an encryption key.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fileContent = reader.result;
        const encrypted = CryptoJS.AES.encrypt(fileContent, encryptionKey).toString();

        const blob = new Blob([encrypted], { type: 'text/plain' });
        const formData = new FormData();
        formData.append('file', blob, selectedFile.name);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
          headers: {
            'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
            'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
          },
        });

        const cid = res.data.IpfsHash;
        const tx = await contract.addFile(selectedFile.name, selectedFile.type, cid);
        await tx.wait();
        alert('File uploaded successfully!');
        // Reload files after upload
        const fileCount = await contract.getUserFileCount(account);
        const loadedFiles = [];
        
        for (let i = 0; i < fileCount; i++) {
          try {
            const [fileName, fileType, cid, timestamp] = await contract.getFile(account, i);
            loadedFiles.push({
              id: i,
              name: fileName,
              type: fileType,
              cid: cid,
              size: 'Unknown',
              uploadDate: new Date(Number(timestamp) * 1000).toLocaleDateString()
            });
          } catch (fileError) {
            console.error(`Error loading file ${i}:`, fileError);
          }
        }
        
        setFiles(loadedFiles);

      } catch (error) {
        console.error('Error uploading file:', error);
        alert('File upload failed.');
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleShareFile = (file) => {
    setSelectedFileForSharing(file);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedFileForSharing(null);
  };

  const handleViewVersions = (file) => {
    setSelectedFileForVersions(file);
    setShowVersionsModal(true);
  };

  const closeVersionsModal = () => {
    setShowVersionsModal(false);
    setSelectedFileForVersions(null);
  };

  const handleDownload = async (file) => {
    if (!encryptionKey) {
        alert("Please enter the encryption key to download and decrypt the file.");
        return;
    }
    try {
        // Use the enhanced download function with integrity checking
        const success = await downloadWithIntegrityCheck(file.cid, file.name, encryptionKey, {
          fileName: file.name,
          cid: file.cid
        });
        
        if (success) {
          alert('File downloaded successfully with integrity verification!');
        }
    } catch(error) {
        console.error("Error downloading or decrypting file:", error);
        alert("Failed to download or decrypt. Is the key correct?");
    }
  };

  // FIX: Render a loading state or null on the server to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Drive</h1>
          <div className="flex items-center space-x-4">
            <span className="text-white">
              {account ? `${account.substring(0, 6)}...${account.substring(38)}` : 'Not connected'}
            </span>
            {account && (
               <button
                 onClick={() => {
                   disconnectWallet();
                 }}
                 className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
               >
                 Disconnect
               </button>
             )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('myFiles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'myFiles'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Files
          </button>
          <button
            onClick={() => setActiveTab('sharedFiles')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'sharedFiles'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Shared With Me
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'myFiles' ? (
          <>
            <div className="bg-gray-800 p-6 rounded-lg mb-8">
                <h2 className="text-xl mb-4">Upload New File</h2>
                <input type="file" onChange={handleFileChange} className="mb-4" />
                <input
                    type="password"
                    placeholder="Encryption Key"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    className="p-2 rounded bg-gray-700 border border-gray-600 mb-4 w-full"
                />
                <button onClick={handleUpload} className="px-6 py-2 bg-green-600 rounded hover:bg-green-700">Upload</button>
            </div>

            <Dashboard files={files} />
          </>
        ) : (
          <SharedFiles account={account} contract={contract} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
          {files.map((file, index) => (
            <div key={index}>
                <FileCrystal fileName={file.name} />
                <div className="mt-2 space-y-2">
                  <button onClick={() => handleDownload(file)} className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Download</button>
                  <button onClick={() => handleShareFile(file)} className="w-full px-4 py-2 bg-purple-600 rounded hover:bg-purple-700">Share</button>
                  <button onClick={() => handleViewVersions(file)} className="w-full px-4 py-2 bg-orange-600 rounded hover:bg-orange-700">Versions</button>
                </div>
            </div>
          ))}
        </div>

        {showShareModal && selectedFileForSharing && (
          <FileSharing
            file={selectedFileForSharing}
            contract={contract}
            account={account}
            onClose={closeShareModal}
          />
        )}

        {showVersionsModal && selectedFileForVersions && (
          <FileVersions
            file={selectedFileForVersions}
            contract={contract}
            account={account}
            encryptionKey={encryptionKey}
            onClose={closeVersionsModal}
          />
        )}
      </main>
    </div>
  );
}

