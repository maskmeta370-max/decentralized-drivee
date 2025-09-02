import React, { useState, useEffect } from 'react';
import { 
  createFileSharingPackage, 
  SharedFileStorage, 
  generateFileId,
  grantUserAccess,
  revokeUserAccess,
  validateAccessToken
} from '../utils/keyManagement';

const FileSharing = ({ file, contract, account, onClose }) => {
  const [shareAddress, setShareAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sharingPackage, setSharingPackage] = useState(null);
  const [fileId, setFileId] = useState(null);

  useEffect(() => {
    if (file && account) {
      initializeSharing();
    }
  }, [file, account]);

  const initializeSharing = async () => {
    try {
      const id = generateFileId(file.name, account);
      setFileId(id);
      
      // Check if sharing package already exists
      let existingPackage = SharedFileStorage.getSharedFile(id);
      
      if (!existingPackage) {
        // Create new sharing package if it doesn't exist
        // Note: We'll create this when first user is added to avoid unnecessary processing
        console.log('No existing sharing package found for file:', file.name);
      } else {
        setSharingPackage(existingPackage);
        // Load shared users from the package
        const users = Object.keys(existingPackage.accessTokens || {});
        setSharedUsers(users);
      }
    } catch (error) {
      console.error('Error initializing sharing:', error);
    }
  };

  const handleGrantAccess = async () => {
    if (!shareAddress || !contract || !account) {
      alert('Please enter a valid address and ensure wallet is connected');
      return;
    }

    try {
      setLoading(true);
      
      // First, grant access on the blockchain
      console.log('Granting blockchain access for file:', file.id, 'to user:', shareAddress);
      const tx = await contract.grantFileAccess(file.id, shareAddress);
      console.log('Transaction submitted:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        // Transaction successful - now handle local key management
        let currentPackage = sharingPackage;
        
        if (!currentPackage) {
          // Create new sharing package
          currentPackage = {
            accessTokens: {},
            fileMetadata: {
              name: file.name,
              type: file.type || 'application/octet-stream',
              cid: file.cid
            },
            sharedKey: 'temp_shared_key_' + Date.now() // This should be the actual shared key
          };
        }
        
        // Add new user to access tokens
        const updatedTokens = grantUserAccess(
          currentPackage.accessTokens, 
          shareAddress, 
          currentPackage.sharedKey
        );
        
        currentPackage.accessTokens = updatedTokens;
        
        // Store updated package
        SharedFileStorage.storeSharedFile(fileId, currentPackage);
        setSharingPackage(currentPackage);
        
        // Update local state
        setSharedUsers([...sharedUsers, shareAddress]);
        
        alert(`Access granted to ${shareAddress}! Transaction hash: ${tx.hash}`);
        setShareAddress('');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error granting access:', error);
      if (error.code === 'ACTION_REJECTED') {
        alert('Transaction was rejected by user');
      } else if (error.message.includes('Only owner can grant access')) {
        alert('Error: You can only grant access to files you own');
      } else {
        alert('Error granting access: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userAddress) => {
    if (!contract || !account) {
      alert('Please ensure wallet is connected');
      return;
    }

    try {
      setLoading(true);
      
      // First, revoke access on the blockchain
      console.log('Revoking blockchain access for file:', file.id, 'from user:', userAddress);
      const tx = await contract.revokeFileAccess(file.id, userAddress);
      console.log('Transaction submitted:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      if (receipt.status === 1) {
        // Transaction successful - now handle local key management
        if (sharingPackage) {
          const updatedTokens = revokeUserAccess(sharingPackage.accessTokens, userAddress);
          const updatedPackage = { ...sharingPackage, accessTokens: updatedTokens };
          
          SharedFileStorage.storeSharedFile(fileId, updatedPackage);
          setSharingPackage(updatedPackage);
        }
        
        // Update local state
        setSharedUsers(sharedUsers.filter(user => user !== userAddress));
        
        alert(`Access revoked from ${userAddress}! Transaction hash: ${tx.hash}`);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      if (error.code === 'ACTION_REJECTED') {
        alert('Transaction was rejected by user');
      } else if (error.message.includes('Only owner can revoke access')) {
        alert('Error: You can only revoke access from files you own');
      } else {
        alert('Error revoking access: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Share File</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg text-white mb-2">{file.name}</h3>
          <p className="text-gray-400 text-sm">Grant access to other users by entering their wallet address</p>
        </div>

        <div className="mb-6">
          <label className="block text-white text-sm font-medium mb-2">
            Wallet Address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareAddress}
              onChange={(e) => setShareAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleGrantAccess}
              disabled={loading || !isValidAddress(shareAddress)}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Grant'}
            </button>
          </div>
          {shareAddress && !isValidAddress(shareAddress) && (
            <p className="text-red-400 text-sm mt-1">Please enter a valid wallet address</p>
          )}
        </div>

        <div>
          <h4 className="text-white font-medium mb-3">Shared with:</h4>
          {sharedUsers.length === 0 ? (
            <p className="text-gray-400 text-sm">No users have access to this file</p>
          ) : (
            <div className="space-y-2">
              {sharedUsers.map((userAddress, index) => {
                const hasValidToken = sharingPackage && 
                  sharingPackage.accessTokens[userAddress] && 
                  validateAccessToken(userAddress, sharingPackage.accessTokens[userAddress]);
                
                return (
                  <div key={index} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-mono">
                        {userAddress.substring(0, 6)}...{userAddress.substring(38)}
                      </span>
                      <span className={`text-xs ${
                        hasValidToken ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {hasValidToken ? '🔐 Secure Access Active' : '⚠️ Access Token Invalid'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(userAddress)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-600"
                    >
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs">
            Note: Users with access can download and decrypt this file if they have the encryption key.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileSharing;