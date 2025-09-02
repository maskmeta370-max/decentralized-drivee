import CryptoJS from 'crypto-js';

/**
 * Generates a random shared key for file access
 * @returns {string} - A randomly generated key
 */
export const generateSharedKey = () => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};

/**
 * Encrypts data with a shared key
 * @param {string} data - The data to encrypt
 * @param {string} sharedKey - The shared encryption key
 * @returns {string} - Encrypted data
 */
export const encryptWithSharedKey = (data, sharedKey) => {
  return CryptoJS.AES.encrypt(data, sharedKey).toString();
};

/**
 * Decrypts data with a shared key
 * @param {string} encryptedData - The encrypted data
 * @param {string} sharedKey - The shared decryption key
 * @returns {string} - Decrypted data
 */
export const decryptWithSharedKey = (encryptedData, sharedKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, sharedKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Creates a file sharing package that includes the file and access information
 * @param {File} file - The original file
 * @param {string} userEncryptionKey - The user's primary encryption key
 * @param {Array} sharedWithUsers - Array of user addresses to share with
 * @returns {Object} - Sharing package with encrypted file and shared keys
 */
export const createFileSharingPackage = async (file, userEncryptionKey, sharedWithUsers) => {
  try {
    // Generate a unique shared key for this file
    const sharedKey = generateSharedKey();
    
    // Convert file to data URL
    const fileDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Encrypt the file with the shared key
    const encryptedFileData = encryptWithSharedKey(fileDataUrl, sharedKey);
    
    // Create access tokens for each user
    const accessTokens = {};
    sharedWithUsers.forEach(userAddress => {
      // Encrypt the shared key with a combination of user address and a salt
      const userSalt = CryptoJS.SHA256(userAddress + Date.now()).toString();
      const userSpecificKey = CryptoJS.SHA256(userAddress + userSalt).toString().substring(0, 32);
      
      accessTokens[userAddress] = {
        encryptedSharedKey: encryptWithSharedKey(sharedKey, userSpecificKey),
        salt: userSalt,
        timestamp: Date.now()
      };
    });
    
    return {
      encryptedFileData,
      accessTokens,
      sharedKey, // Keep this for the file owner
      fileMetadata: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      }
    };
  } catch (error) {
    console.error('Error creating file sharing package:', error);
    throw error;
  }
};

/**
 * Retrieves the shared key for a user from their access token
 * @param {string} userAddress - The user's wallet address
 * @param {Object} accessToken - The access token for this user
 * @returns {string} - The decrypted shared key
 */
export const getSharedKeyFromToken = (userAddress, accessToken) => {
  try {
    const { encryptedSharedKey, salt } = accessToken;
    const userSpecificKey = CryptoJS.SHA256(userAddress + salt).toString().substring(0, 32);
    return decryptWithSharedKey(encryptedSharedKey, userSpecificKey);
  } catch (error) {
    console.error('Error retrieving shared key:', error);
    throw new Error('Failed to decrypt shared key');
  }
};

/**
 * Decrypts a shared file using the user's access token
 * @param {string} encryptedFileData - The encrypted file data
 * @param {string} userAddress - The user's wallet address
 * @param {Object} accessToken - The user's access token
 * @returns {string} - The decrypted file data URL
 */
export const decryptSharedFile = (encryptedFileData, userAddress, accessToken) => {
  try {
    const sharedKey = getSharedKeyFromToken(userAddress, accessToken);
    return decryptWithSharedKey(encryptedFileData, sharedKey);
  } catch (error) {
    console.error('Error decrypting shared file:', error);
    throw new Error('Failed to decrypt shared file');
  }
};

/**
 * Validates an access token for a user
 * @param {string} userAddress - The user's wallet address
 * @param {Object} accessToken - The access token to validate
 * @param {number} maxAge - Maximum age of token in milliseconds (default: 30 days)
 * @returns {boolean} - Whether the token is valid
 */
export const validateAccessToken = (userAddress, accessToken, maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    if (!accessToken || !accessToken.timestamp || !accessToken.salt || !accessToken.encryptedSharedKey) {
      return false;
    }
    
    // Check if token is not expired
    const tokenAge = Date.now() - accessToken.timestamp;
    if (tokenAge > maxAge) {
      return false;
    }
    
    // Try to decrypt the shared key to validate the token
    getSharedKeyFromToken(userAddress, accessToken);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Revokes access by invalidating the access token
 * @param {Object} accessTokens - The current access tokens object
 * @param {string} userAddress - The user address to revoke access for
 * @returns {Object} - Updated access tokens object
 */
export const revokeUserAccess = (accessTokens, userAddress) => {
  const updatedTokens = { ...accessTokens };
  delete updatedTokens[userAddress];
  return updatedTokens;
};

/**
 * Grants access to a new user by creating an access token
 * @param {Object} accessTokens - The current access tokens object
 * @param {string} userAddress - The user address to grant access to
 * @param {string} sharedKey - The shared key for the file
 * @returns {Object} - Updated access tokens object
 */
export const grantUserAccess = (accessTokens, userAddress, sharedKey) => {
  const userSalt = CryptoJS.SHA256(userAddress + Date.now()).toString();
  const userSpecificKey = CryptoJS.SHA256(userAddress + userSalt).toString().substring(0, 32);
  
  const newAccessToken = {
    encryptedSharedKey: encryptWithSharedKey(sharedKey, userSpecificKey),
    salt: userSalt,
    timestamp: Date.now()
  };
  
  return {
    ...accessTokens,
    [userAddress]: newAccessToken
  };
};

/**
 * Storage utilities for managing shared files and access tokens
 */
export const SharedFileStorage = {
  /**
   * Stores shared file data in localStorage
   * @param {string} fileId - Unique identifier for the file
   * @param {Object} sharingPackage - The file sharing package
   */
  storeSharedFile: (fileId, sharingPackage) => {
    try {
      const key = `shared_file_${fileId}`;
      localStorage.setItem(key, JSON.stringify(sharingPackage));
    } catch (error) {
      console.error('Error storing shared file:', error);
    }
  },
  
  /**
   * Retrieves shared file data from localStorage
   * @param {string} fileId - Unique identifier for the file
   * @returns {Object|null} - The file sharing package or null if not found
   */
  getSharedFile: (fileId) => {
    try {
      const key = `shared_file_${fileId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving shared file:', error);
      return null;
    }
  },
  
  /**
   * Updates access tokens for a shared file
   * @param {string} fileId - Unique identifier for the file
   * @param {Object} newAccessTokens - Updated access tokens
   */
  updateAccessTokens: (fileId, newAccessTokens) => {
    try {
      const sharingPackage = SharedFileStorage.getSharedFile(fileId);
      if (sharingPackage) {
        sharingPackage.accessTokens = newAccessTokens;
        SharedFileStorage.storeSharedFile(fileId, sharingPackage);
      }
    } catch (error) {
      console.error('Error updating access tokens:', error);
    }
  },
  
  /**
   * Removes a shared file from storage
   * @param {string} fileId - Unique identifier for the file
   */
  removeSharedFile: (fileId) => {
    try {
      const key = `shared_file_${fileId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing shared file:', error);
    }
  },
  
  /**
   * Lists all shared files for the current user
   * @returns {Array} - Array of shared file IDs
   */
  listSharedFiles: () => {
    try {
      const sharedFiles = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('shared_file_')) {
          sharedFiles.push(key.replace('shared_file_', ''));
        }
      }
      return sharedFiles;
    } catch (error) {
      console.error('Error listing shared files:', error);
      return [];
    }
  }
};

/**
 * Utility to generate a unique file ID
 * @param {string} fileName - The file name
 * @param {string} userAddress - The owner's address
 * @returns {string} - Unique file ID
 */
export const generateFileId = (fileName, userAddress) => {
  return CryptoJS.SHA256(fileName + userAddress + Date.now()).toString();
};