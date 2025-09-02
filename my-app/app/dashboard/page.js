"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { downloadWithIntegrityCheck, performIntegrityCheck, displayIntegrityResults } from '../../utils/fileIntegrity';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';

// Components
import Sidebar from '../../components/Sidebar';
import FileCrystal from '../../components/FileCrystal';
import FileTable from '../../components/FileTable';
import Dashboard from '../../components/Dashboard';
import FileSharing from '../../components/FileSharing';
import FileVersions from '../../components/FileVersions';
import SharedFiles from '../../components/SharedFiles';
import ModernSidebar from '../../components/dashboard/ModernSidebar';
import StatCard from '../../components/dashboard/StatCard';
import UploadCenter from '../../components/UploadCenter';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';



export default function DashboardPage() {
  const router = useRouter();
  const { account, connectWallet, contract, disconnectWallet, isInitialized } = useWallet();

  // All useState hooks must be called before any early returns
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState('');
  const [isClient, setIsClient] = useState(false); // State to handle hydration
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFileForSharing, setSelectedFileForSharing] = useState(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState(null);
  const [activeTab, setActiveTab] = useState('myFiles'); // 'myFiles' or 'sharedFiles'
  const [activeSection, setActiveSection] = useState('dashboard'); // 'dashboard', 'vault', 'upload', 'analytics', 'settings'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsed: '0 MB',
    uploadsThisMonth: 0,
    activeShares: 0
  });

  // All useEffect hooks must be called before any early returns
  // This effect runs only once on the client after the component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to login if not connected
  useEffect(() => {
    if (isClient && isInitialized && !account) {
      router.push('/auth/login');
    }
  }, [account, isClient, router, isInitialized]);

  // Load files effect - moved before early return
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
          
          // Update statistics
          setStats({
            totalFiles: loadedFiles.length,
            storageUsed: `${(loadedFiles.length * 2.5).toFixed(1)} MB`, // Estimated
            uploadsThisMonth: loadedFiles.filter(file => {
              const uploadDate = new Date(file.uploadDate);
              const now = new Date();
              return uploadDate.getMonth() === now.getMonth() && uploadDate.getFullYear() === now.getFullYear();
            }).length,
            activeShares: Math.floor(loadedFiles.length * 0.3) // Estimated 30% shared
          });
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

  // Show loading state while wallet is initializing - MUST be after all hooks
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900 to-space-indigo flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-cyan/30 border-t-electric-cyan rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-silver">Initializing wallet connection...</p>
        </div>
      </div>
    );
  }


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
    setShowVersionModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Render different sections based on activeSection
  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Files Stored"
                value={stats.totalFiles}
                icon="📁"
                trend={12}
              />
              <StatCard
                title="Storage Used"
                value={stats.storageUsed}
                icon="💾"
                trend={-5}
              />
              <StatCard
                title="Uploads This Month"
                value={stats.uploadsThisMonth}
                icon="⬆️"
                trend={25}
              />
              <StatCard
                title="Active File Shares"
                value={stats.activeShares}
                icon="🔗"
                trend={8}
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-light-silver mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {files.slice(0, 5).map((file, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-electric-cyan/5 rounded-lg border border-electric-cyan/10">
                    <div className="w-10 h-10 bg-electric-cyan/20 rounded-lg flex items-center justify-center">
                      <span className="text-electric-cyan">📄</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-light-silver font-medium">{file.name}</p>
                      <p className="text-light-silver/60 text-sm">Uploaded on {file.uploadDate}</p>
                    </div>
                    <span className="text-electric-cyan text-sm">{file.type}</span>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="text-center py-8 text-light-silver/60">
                    <span className="text-4xl mb-4 block">📭</span>
                    <p>No files uploaded yet. Start by uploading your first file!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-light-silver mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveSection('upload')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">⬆️</span>
                  <h3 className="text-light-silver font-semibold mb-1">Upload Files</h3>
                  <p className="text-light-silver/60 text-sm">Add new files to your vault</p>
                </button>
                <button
                  onClick={() => setActiveSection('vault')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">🗃️</span>
                  <h3 className="text-light-silver font-semibold mb-1">Browse Vault</h3>
                  <p className="text-light-silver/60 text-sm">View and manage your files</p>
                </button>
                <button
                  onClick={() => setActiveSection('analytics')}
                  className="p-4 bg-electric-cyan/10 border border-electric-cyan/20 rounded-lg hover:bg-electric-cyan/20 transition-all duration-200 text-left"
                >
                  <span className="text-2xl mb-2 block">📈</span>
                  <h3 className="text-light-silver font-semibold mb-1">View Analytics</h3>
                  <p className="text-light-silver/60 text-sm">Track your storage usage</p>
                </button>
              </div>
            </div>
          </div>
        );

      case 'vault':
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-light-silver">My Vault</h1>
              <div className="flex items-center space-x-6">
                {/* Tab Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('myFiles')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'myFiles'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'bg-electric-cyan/20 text-electric-cyan hover:bg-electric-cyan/30'
                    }`}
                  >
                    My Files
                  </button>
                  <button
                    onClick={() => setActiveTab('sharedFiles')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === 'sharedFiles'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'bg-electric-cyan/20 text-electric-cyan hover:bg-electric-cyan/30'
                    }`}
                  >
                    Shared With Me
                  </button>
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2 bg-space-indigo/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'table'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'text-light-silver/60 hover:text-light-silver'
                    }`}
                    title="Table View"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === 'grid'
                        ? 'bg-electric-cyan text-space-indigo'
                        : 'text-light-silver/60 hover:text-light-silver'
                    }`}
                    title="3D View"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'myFiles' ? (
              viewMode === 'table' ? (
                <FileTable 
                  files={files} 
                  onDownload={handleDownload}
                  onShare={handleShareFile}
                  onViewVersions={handleViewVersions}
                />
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {files.map((file, index) => (
                    <div key={index} className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6 hover:border-electric-cyan/40 transition-all duration-300 group">
                      <div className="text-center mb-4">
                        <FileCrystal 
                          fileName={file.name} 
                          fileSize={file.size || '0 MB'}
                          uploadDate={file.uploadDate}
                          viewMode="grid"
                        />
                      </div>
                      <h3 className="text-light-silver font-semibold mb-2 truncate text-center">{file.name}</h3>
                      <p className="text-light-silver/60 text-sm mb-4 text-center">{file.uploadDate}</p>
                      <div className="space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => handleDownload(file)}
                          className="w-full px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors duration-200"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleShareFile(file)}
                          className="w-full px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors duration-200"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => handleViewVersions(file)}
                          className="w-full px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors duration-200"
                        >
                          Versions
                        </button>
                      </div>
                    </div>
                ))}
                {files.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <span className="text-6xl mb-4 block">📁</span>
                    <h3 className="text-2xl font-bold text-light-silver mb-2">Your vault is empty</h3>
                    <p className="text-light-silver/60 mb-6">Upload your first file to get started</p>
                    <button
                      onClick={() => setActiveSection('upload')}
                      className="px-6 py-3 bg-electric-cyan text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300"
                    >
                      Upload Files
                    </button>
                  </div>
                )}
              </div>
              )
            ) : (
              <SharedFiles account={account} contract={contract} />
            )}
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-light-silver mb-2">Upload Center</h1>
              <p className="text-light-silver/60">Securely upload and encrypt your files to the decentralized network.</p>
            </div>
            <UploadCenter 
               onUpload={(files, options) => {
                 console.log('Uploading files:', files, options);
                 // Handle file upload logic here
                 files.forEach(fileData => {
                   const newFile = {
                     id: Date.now() + Math.random(),
                     name: fileData.name,
                     size: formatFileSize(fileData.file.size),
                     uploadDate: new Date().toLocaleDateString(),
                     type: fileData.type,
                     cid: `Qm${Math.random().toString(36).substr(2, 44)}`, // Mock CID
                     encrypted: options.encryptionEnabled
                   };
                   setFiles(prev => [...prev, newFile]);
                 });
               }}
             />
          </div>
        );

      case 'analytics':
        return (
          <AnalyticsDashboard files={files} />
        );

      case 'settings':
        return (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-light-silver">Settings</h1>
            <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6">
              <h2 className="text-xl font-bold text-light-silver mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-electric-cyan/5 rounded-lg">
                  <div>
                    <h3 className="text-light-silver font-medium">Wallet Address</h3>
                    <p className="text-light-silver/60 text-sm">{account}</p>
                  </div>
                  <button className="px-4 py-2 bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30 rounded-lg hover:bg-electric-cyan/30 transition-colors duration-200">
                    Copy
                  </button>
                </div>
                <div className="flex justify-between items-center p-4 bg-electric-cyan/5 rounded-lg">
                  <div>
                    <h3 className="text-light-silver font-medium">Network</h3>
                    <p className="text-light-silver/60 text-sm">Polygon Amoy Testnet</p>
                  </div>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Connected</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex items-center justify-center">
        <div className="text-electric-cyan text-xl">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex items-center justify-center">
        <div className="text-electric-cyan text-xl">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex">
      {/* Sidebar */}
      <ModernSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        account={account}
        disconnectWallet={disconnectWallet}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderMainContent()}
        </div>
      </div>

      {/* Modals */}
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
    </div>
  );
}

