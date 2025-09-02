import CryptoJS from 'crypto-js';

/**
 * Automatic Encryption/Decryption System
 * Manages encryption keys securely without user intervention
 */

class AutoEncryptionManager {
  constructor() {
    this.keyStore = new Map();
    this.masterKey = null;
    this.initializeMasterKey();
  }

  /**
   * Initialize or retrieve the master key from secure storage
   */
  initializeMasterKey() {
    try {
      // Try to get existing master key from localStorage (encrypted)
      const storedMasterKey = localStorage.getItem('vault_master_key');
      
      if (storedMasterKey) {
        // In production, this would be decrypted using user's wallet signature
        this.masterKey = storedMasterKey;
      } else {
        // Generate new master key
        this.masterKey = this.generateSecureKey();
        // Store encrypted master key (in production, encrypt with wallet signature)
        localStorage.setItem('vault_master_key', this.masterKey);
      }
    } catch (error) {
      console.error('Failed to initialize master key:', error);
      // Fallback: generate temporary key
      this.masterKey = this.generateSecureKey();
    }
  }

  /**
   * Generate a cryptographically secure key
   */
  generateSecureKey() {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * Generate a file-specific encryption key
   */
  generateFileKey(fileId, userAddress) {
    const keyMaterial = `${fileId}_${userAddress}_${this.masterKey}_${Date.now()}`;
    return CryptoJS.SHA256(keyMaterial).toString();
  }

  /**
   * Store file encryption key securely
   */
  storeFileKey(fileId, userAddress, encryptionKey) {
    const keyId = `${fileId}_${userAddress}`;
    
    // Encrypt the file key with master key
    const encryptedKey = CryptoJS.AES.encrypt(encryptionKey, this.masterKey).toString();
    
    // Store in memory
    this.keyStore.set(keyId, encryptedKey);
    
    // Store in localStorage (encrypted)
    try {
      const existingKeys = JSON.parse(localStorage.getItem('vault_file_keys') || '{}');
      existingKeys[keyId] = encryptedKey;
      localStorage.setItem('vault_file_keys', JSON.stringify(existingKeys));
    } catch (error) {
      console.error('Failed to store file key:', error);
    }
  }

  /**
   * Retrieve file encryption key
   */
  getFileKey(fileId, userAddress) {
    const keyId = `${fileId}_${userAddress}`;
    
    // Try memory first
    let encryptedKey = this.keyStore.get(keyId);
    
    // Fallback to localStorage
    if (!encryptedKey) {
      try {
        const storedKeys = JSON.parse(localStorage.getItem('vault_file_keys') || '{}');
        encryptedKey = storedKeys[keyId];
        
        if (encryptedKey) {
          // Cache in memory
          this.keyStore.set(keyId, encryptedKey);
        }
      } catch (error) {
        console.error('Failed to retrieve file key:', error);
        return null;
      }
    }
    
    if (!encryptedKey) {
      return null;
    }
    
    try {
      // Decrypt the file key with master key
      const decryptedKey = CryptoJS.AES.decrypt(encryptedKey, this.masterKey).toString(CryptoJS.enc.Utf8);
      return decryptedKey;
    } catch (error) {
      console.error('Failed to decrypt file key:', error);
      return null;
    }
  }

  /**
   * Automatically encrypt file content
   */
  async encryptFile(fileContent, fileId, userAddress) {
    try {
      // Generate unique encryption key for this file
      const encryptionKey = this.generateFileKey(fileId, userAddress);
      
      // Store the key securely
      this.storeFileKey(fileId, userAddress, encryptionKey);
      
      // Encrypt the file content
      const encrypted = CryptoJS.AES.encrypt(fileContent, encryptionKey).toString();
      
      return {
        success: true,
        encryptedContent: encrypted,
        keyId: `${fileId}_${userAddress}`,
        metadata: {
          algorithm: 'AES-256',
          timestamp: Date.now(),
          fileId,
          userAddress
        }
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Automatically decrypt file content
   */
  async decryptFile(encryptedContent, fileId, userAddress) {
    try {
      // Retrieve the encryption key
      const encryptionKey = this.getFileKey(fileId, userAddress);
      
      if (!encryptionKey) {
        throw new Error('Encryption key not found. You may not have access to this file.');
      }
      
      // Decrypt the file content
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, encryptionKey).toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Failed to decrypt file. The file may be corrupted or the key is invalid.');
      }
      
      return {
        success: true,
        decryptedContent: decrypted,
        metadata: {
          fileId,
          userAddress,
          decryptedAt: Date.now()
        }
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Grant access to another user by sharing the file key
   */
  async grantFileAccess(fileId, ownerAddress, granteeAddress) {
    try {
      // Get the file key (only owner can do this)
      const fileKey = this.getFileKey(fileId, ownerAddress);
      
      if (!fileKey) {
        throw new Error('File key not found. Only the file owner can grant access.');
      }
      
      // Store the key for the grantee
      this.storeFileKey(fileId, granteeAddress, fileKey);
      
      return {
        success: true,
        message: `Access granted to ${granteeAddress} for file ${fileId}`
      };
    } catch (error) {
      console.error('Failed to grant access:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Revoke access by removing the file key
   */
  async revokeFileAccess(fileId, ownerAddress, revokedAddress) {
    try {
      const keyId = `${fileId}_${revokedAddress}`;
      
      // Verify owner has access
      const ownerKey = this.getFileKey(fileId, ownerAddress);
      if (!ownerKey) {
        throw new Error('Only the file owner can revoke access.');
      }
      
      // Remove from memory
      this.keyStore.delete(keyId);
      
      // Remove from localStorage
      try {
        const storedKeys = JSON.parse(localStorage.getItem('vault_file_keys') || '{}');
        delete storedKeys[keyId];
        localStorage.setItem('vault_file_keys', JSON.stringify(storedKeys));
      } catch (error) {
        console.error('Failed to remove key from storage:', error);
      }
      
      return {
        success: true,
        message: `Access revoked for ${revokedAddress} from file ${fileId}`
      };
    } catch (error) {
      console.error('Failed to revoke access:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if user has access to a file
   */
  hasFileAccess(fileId, userAddress) {
    const fileKey = this.getFileKey(fileId, userAddress);
    return fileKey !== null;
  }

  /**
   * Clear all stored keys (for logout/reset)
   */
  clearAllKeys() {
    this.keyStore.clear();
    try {
      localStorage.removeItem('vault_file_keys');
      localStorage.removeItem('vault_master_key');
    } catch (error) {
      console.error('Failed to clear stored keys:', error);
    }
  }

  /**
   * Get encryption statistics
   */
  getEncryptionStats() {
    try {
      const storedKeys = JSON.parse(localStorage.getItem('vault_file_keys') || '{}');
      return {
        totalEncryptedFiles: Object.keys(storedKeys).length,
        memoryKeysCount: this.keyStore.size,
        hasMasterKey: !!this.masterKey
      };
    } catch (error) {
      return {
        totalEncryptedFiles: 0,
        memoryKeysCount: this.keyStore.size,
        hasMasterKey: !!this.masterKey
      };
    }
  }
}

// Create singleton instance
const autoEncryptionManager = new AutoEncryptionManager();

// Export convenience functions
export const encryptFile = (fileContent, fileId, userAddress) => {
  return autoEncryptionManager.encryptFile(fileContent, fileId, userAddress);
};

export const decryptFile = (encryptedContent, fileId, userAddress) => {
  return autoEncryptionManager.decryptFile(encryptedContent, fileId, userAddress);
};

export const grantFileAccess = (fileId, ownerAddress, granteeAddress) => {
  return autoEncryptionManager.grantFileAccess(fileId, ownerAddress, granteeAddress);
};

export const revokeFileAccess = (fileId, ownerAddress, revokedAddress) => {
  return autoEncryptionManager.revokeFileAccess(fileId, ownerAddress, revokedAddress);
};

export const hasFileAccess = (fileId, userAddress) => {
  return autoEncryptionManager.hasFileAccess(fileId, userAddress);
};

export const clearAllKeys = () => {
  return autoEncryptionManager.clearAllKeys();
};

export const getEncryptionStats = () => {
  return autoEncryptionManager.getEncryptionStats();
};

export default autoEncryptionManager;