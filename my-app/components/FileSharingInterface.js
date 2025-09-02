import React, { useState, useEffect } from 'react';
import { ShareIcon, LinkIcon, UserGroupIcon, ShieldCheckIcon, ClockIcon, EyeIcon, PencilIcon, TrashIcon, DocumentDuplicateIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AccessControlService } from '../utils/accessControl';
import { EncryptionService } from '../utils/encryption';
import { getFileManagerContract, getProvider, getSigner } from '../utils/web3';
import { ethers } from 'ethers';

const FileSharingInterface = ({ file, onClose }) => {
  const [shareLinks, setShareLinks] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [newShare, setNewShare] = useState({
    type: 'link', // 'link' or 'user'
    email: '',
    permission: 'read',
    expiresIn: '7d',
    password: '',
    downloadLimit: 0,
    allowedIPs: []
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState('');
  const [blockchainError, setBlockchainError] = useState('');

  const accessControl = new AccessControlService();
  const encryption = new EncryptionService();

  useEffect(() => {
    loadExistingShares();
    checkWalletConnection();
  }, [file]);

  const checkWalletConnection = async () => {
    try {
      const provider = getProvider();
      if (provider && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletConnected(true);
          setUserAddress(accounts[0]);
        }
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
      setBlockchainError('Failed to connect to wallet');
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setBlockchainError('Please install MetaMask to use blockchain features');
        return;
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletConnected(true);
        setUserAddress(accounts[0]);
        setBlockchainError('');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setBlockchainError('Failed to connect wallet: ' + error.message);
    }
  };

  const loadExistingShares = async () => {
    try {
      // Load existing share links and permissions for the file
      const links = await accessControl.getFileShareLinks(file.id);
      const perms = await accessControl.getFilePermissions(file.id);
      setShareLinks(links);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load existing shares:', error);
    }
  };

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const shareData = {
        fileId: file.id,
        fileName: file.name,
        permission: newShare.permission,
        expiresIn: newShare.expiresIn,
        password: newShare.password,
        downloadLimit: newShare.downloadLimit,
        allowedIPs: newShare.allowedIPs.filter(ip => ip.trim()),
        createdBy: 'current_user_id' // Replace with actual user ID
      };

      const shareLink = await accessControl.createSecureShareLink(shareData);
      
      setShareLinks(prev => [...prev, {
        id: shareLink.id,
        url: shareLink.url,
        permission: newShare.permission,
        expiresAt: shareLink.expiresAt,
        createdAt: new Date().toISOString(),
        downloadCount: 0,
        downloadLimit: newShare.downloadLimit,
        isPasswordProtected: !!newShare.password,
        allowedIPs: newShare.allowedIPs
      }]);

      // Reset form
      setNewShare({
        type: 'link',
        email: '',
        permission: 'read',
        expiresIn: '7d',
        password: '',
        downloadLimit: 0,
        allowedIPs: []
      });
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareWithUser = async () => {
    if (!walletConnected) {
      setBlockchainError('Please connect your wallet first');
      return;
    }

    if (!ethers.isAddress(newShare.email)) {
      setBlockchainError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setTransactionStatus('Estimating gas fees...');
    setBlockchainError('');
    
    try {
      const contract = await getFileManagerContract();
      
      // Estimate gas for the transaction
      const gasEstimate = await contract.grantFileAccess.estimateGas(file.id, newShare.email);
      const provider = getProvider();
      const gasPrice = await provider.getFeeData();
      const estimatedCost = gasEstimate * gasPrice.gasPrice;
      
      setGasEstimate({
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
        estimatedCost: ethers.formatEther(estimatedCost)
      });
      
      setTransactionStatus('Please confirm the transaction in your wallet...');
      
      // Execute the blockchain transaction
      const tx = await contract.grantFileAccess(file.id, newShare.email);
      
      setTransactionStatus('Transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTransactionStatus('Transaction confirmed! Access granted successfully.');
        
        // Update local state
        setPermissions(prev => [...prev, {
          id: receipt.transactionHash,
          userAddress: newShare.email,
          permission: newShare.permission,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          createdAt: new Date().toISOString(),
          status: 'active',
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber
        }]);
        
        // Reset form
        setNewShare({
          type: 'link',
          email: '',
          permission: 'read',
          expiresIn: '7d',
          password: '',
          downloadLimit: 0,
          allowedIPs: []
        });
        
        setTimeout(() => setTransactionStatus(''), 5000);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Failed to share with user:', error);
      setBlockchainError('Transaction failed: ' + (error.reason || error.message));
      setTransactionStatus('');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const revokeShareLink = async (linkId) => {
    try {
      await accessControl.revokeShareLink(linkId);
      setShareLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (error) {
      console.error('Failed to revoke share link:', error);
    }
  };

  const revokePermission = async (permissionId, userAddress) => {
    if (!walletConnected) {
      setBlockchainError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setTransactionStatus('Revoking access...');
    setBlockchainError('');
    
    try {
      const contract = await getFileManagerContract();
      
      // Estimate gas for the revoke transaction
      const gasEstimate = await contract.revokeFileAccess.estimateGas(file.id, userAddress);
      const provider = getProvider();
      const gasPrice = await provider.getFeeData();
      const estimatedCost = gasEstimate * gasPrice.gasPrice;
      
      setGasEstimate({
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice.gasPrice, 'gwei'),
        estimatedCost: ethers.formatEther(estimatedCost)
      });
      
      setTransactionStatus('Please confirm the revoke transaction in your wallet...');
      
      // Execute the blockchain transaction
      const tx = await contract.revokeFileAccess(file.id, userAddress);
      
      setTransactionStatus('Transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setTransactionStatus('Access revoked successfully!');
        
        // Update local state
        setPermissions(prev => prev.filter(perm => perm.id !== permissionId));
        
        setTimeout(() => setTransactionStatus(''), 3000);
      } else {
        throw new Error('Revoke transaction failed');
      }
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      setBlockchainError('Revoke failed: ' + (error.reason || error.message));
      setTransactionStatus('');
    } finally {
      setLoading(false);
    }
  };

  const addIPAddress = () => {
    setNewShare(prev => ({
      ...prev,
      allowedIPs: [...prev.allowedIPs, '']
    }));
  };

  const updateIPAddress = (index, value) => {
    setNewShare(prev => ({
      ...prev,
      allowedIPs: prev.allowedIPs.map((ip, i) => i === index ? value : ip)
    }));
  };

  const removeIPAddress = (index) => {
    setNewShare(prev => ({
      ...prev,
      allowedIPs: prev.allowedIPs.filter((_, i) => i !== index)
    }));
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'read': return <EyeIcon className="w-4 h-4" />;
      case 'write': return <PencilIcon className="w-4 h-4" />;
      case 'admin': return <ShieldCheckIcon className="w-4 h-4" />;
      default: return <EyeIcon className="w-4 h-4" />;
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'read': return 'text-blue-600 bg-blue-100';
      case 'write': return 'text-green-600 bg-green-100';
      case 'admin': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatExpiryDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    return `Expires in ${diffDays} days`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ShareIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Share File</h2>
              <p className="text-sm text-gray-500">{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Wallet Connection Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  walletConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {walletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
                  </h4>
                  {walletConnected && (
                    <p className="text-sm text-gray-600">
                      {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
              {!walletConnected && (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Transaction Status */}
          {transactionStatus && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                <p className="text-sm text-yellow-800">{transactionStatus}</p>
              </div>
            </div>
          )}

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Transaction Details</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Gas Limit:</span>
                  <p className="font-medium">{gasEstimate.gasLimit}</p>
                </div>
                <div>
                  <span className="text-gray-600">Gas Price:</span>
                  <p className="font-medium">{gasEstimate.gasPrice} Gwei</p>
                </div>
                <div>
                  <span className="text-gray-600">Estimated Cost:</span>
                  <p className="font-medium">{gasEstimate.estimatedCost} ETH</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {blockchainError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{blockchainError}</p>
              </div>
            </div>
          )}

          {/* Share Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Share</h3>
            
            {/* Share Type Toggle */}
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setNewShare(prev => ({ ...prev, type: 'link' }))}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  newShare.type === 'link'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                <LinkIcon className="w-4 h-4 inline mr-2" />
                Share Link
              </button>
              <button
                onClick={() => setNewShare(prev => ({ ...prev, type: 'user' }))}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  newShare.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                <UserGroupIcon className="w-4 h-4 inline mr-2" />
                Share with User
              </button>
            </div>

            {/* User Address Input (for user sharing) */}
            {newShare.type === 'user' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ethereum Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={newShare.email}
                  onChange={(e) => setNewShare(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    newShare.email && !ethers.isAddress(newShare.email) 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590645d4"
                />
                {newShare.email && !ethers.isAddress(newShare.email) && (
                  <p className="text-sm text-red-600 mt-1">
                    Please enter a valid Ethereum address
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter the Ethereum wallet address of the user you want to share with
                </p>
              </div>
            )}

            {/* Permission Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission Level
                </label>
                <select
                  value={newShare.permission}
                  onChange={(e) => setNewShare(prev => ({ ...prev, permission: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="read">Read Only</option>
                  <option value="write">Read & Write</option>
                  <option value="admin">Full Access</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires In
                </label>
                <select
                  value={newShare.expiresIn}
                  onChange={(e) => setNewShare(prev => ({ ...prev, expiresIn: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="mb-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>
            </div>

            {showAdvanced && (
              <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-200">
                {/* Password Protection */}
                {newShare.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Protection (Optional)
                    </label>
                    <input
                      type="password"
                      value={newShare.password}
                      onChange={(e) => setNewShare(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                    />
                  </div>
                )}

                {/* Download Limit */}
                {newShare.type === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Download Limit (0 = unlimited)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newShare.downloadLimit}
                      onChange={(e) => setNewShare(prev => ({ ...prev, downloadLimit: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* IP Restrictions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed IP Addresses (Optional)
                  </label>
                  {newShare.allowedIPs.map((ip, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={ip}
                        onChange={(e) => updateIPAddress(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="192.168.1.1"
                      />
                      <button
                        onClick={() => removeIPAddress(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addIPAddress}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add IP Address
                  </button>
                </div>
              </div>
            )}

            {/* Create Share Button */}
            <button
              onClick={newShare.type === 'link' ? generateShareLink : shareWithUser}
              disabled={
                loading || 
                (newShare.type === 'user' && (!newShare.email || !ethers.isAddress(newShare.email))) ||
                (newShare.type === 'user' && !walletConnected)
              }
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={
                newShare.type === 'user' && !walletConnected 
                  ? 'Connect wallet to share with users on blockchain'
                  : newShare.type === 'user' && !ethers.isAddress(newShare.email)
                  ? 'Enter a valid Ethereum address'
                  : ''
              }
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Create ${newShare.type === 'link' ? 'Share Link' : 'Blockchain Permission'}`
              )}
            </button>
            
            {newShare.type === 'user' && !walletConnected && (
              <p className="text-sm text-amber-600 mt-2 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                Blockchain sharing requires wallet connection
              </p>
            )}
          </div>

          {/* Existing Share Links */}
          {shareLinks.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Active Share Links</h3>
              <div className="space-y-3">
                {shareLinks.map((link) => (
                  <div key={link.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getPermissionColor(link.permission)
                          }`}>
                            {getPermissionIcon(link.permission)}
                            <span className="ml-1 capitalize">{link.permission}</span>
                          </span>
                          {link.isPasswordProtected && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-yellow-600 bg-yellow-100">
                              <ShieldCheckIcon className="w-3 h-3 mr-1" />
                              Password Protected
                            </span>
                          )}
                          {link.downloadLimit > 0 && (
                            <span className="text-xs text-gray-500">
                              {link.downloadCount}/{link.downloadLimit} downloads
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="flex-1 bg-gray-100 px-3 py-1 rounded text-sm font-mono truncate">
                            {link.url}
                          </code>
                          <button
                            onClick={() => copyToClipboard(link.url, link.id)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {copied === link.id ? (
                              <CheckIcon className="w-4 h-4" />
                            ) : (
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {formatExpiryDate(link.expiresAt)}
                          </span>
                          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => revokeShareLink(link.id)}
                        className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Permissions */}
          {permissions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Permissions</h3>
              <div className="space-y-3">
                {permissions.map((permission) => (
                  <div key={permission.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {permission.userEmail.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{permission.userEmail}</div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getPermissionColor(permission.permission)
                            }`}>
                              {getPermissionIcon(permission.permission)}
                              <span className="ml-1 capitalize">{permission.permission}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatExpiryDate(permission.expiresAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => revokePermission(permission.id, permission.userAddress || permission.userEmail)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        disabled={!walletConnected}
                        title={!walletConnected ? 'Connect wallet to revoke access' : 'Revoke access'}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileSharingInterface;