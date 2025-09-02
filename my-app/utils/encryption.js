import CryptoJS from 'crypto-js';

/**
 * Advanced encryption utility for decentralized storage
 * Provides AES-256 encryption, SHA-256 hashing, and secure key management
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'AES';
    this.keySize = 256;
    this.ivSize = 128;
    this.iterations = 10000;
  }

  /**
   * Generate a secure random encryption key
   * @returns {string} Base64 encoded encryption key
   */
  generateEncryptionKey() {
    const key = CryptoJS.lib.WordArray.random(this.keySize / 8);
    return CryptoJS.enc.Base64.stringify(key);
  }

  /**
   * Generate initialization vector for encryption
   * @returns {string} Base64 encoded IV
   */
  generateIV() {
    const iv = CryptoJS.lib.WordArray.random(this.ivSize / 8);
    return CryptoJS.enc.Base64.stringify(iv);
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - User password
   * @param {string} salt - Salt for key derivation
   * @returns {string} Derived key
   */
  deriveKeyFromPassword(password, salt) {
    const saltWordArray = CryptoJS.enc.Base64.parse(salt);
    const key = CryptoJS.PBKDF2(password, saltWordArray, {
      keySize: this.keySize / 32,
      iterations: this.iterations
    });
    return CryptoJS.enc.Base64.stringify(key);
  }

  /**
   * Encrypt file data using AES-256
   * @param {ArrayBuffer|Uint8Array} fileData - File data to encrypt
   * @param {string} encryptionKey - Base64 encoded encryption key
   * @returns {Object} Encrypted data with metadata
   */
  async encryptFile(fileData, encryptionKey) {
    try {
      // Convert file data to WordArray
      const wordArray = CryptoJS.lib.WordArray.create(fileData);
      const key = CryptoJS.enc.Base64.parse(encryptionKey);
      const iv = CryptoJS.lib.WordArray.random(this.ivSize / 8);

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Calculate content hash before encryption
      const contentHash = this.calculateSHA256(fileData);

      return {
        encryptedData: encrypted.toString(),
        iv: CryptoJS.enc.Base64.stringify(iv),
        contentHash,
        algorithm: 'AES-256-CBC',
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt file data
   * @param {string} encryptedData - Encrypted data string
   * @param {string} encryptionKey - Base64 encoded encryption key
   * @param {string} iv - Base64 encoded initialization vector
   * @returns {ArrayBuffer} Decrypted file data
   */
  async decryptFile(encryptedData, encryptionKey, iv) {
    try {
      const key = CryptoJS.enc.Base64.parse(encryptionKey);
      const ivWordArray = CryptoJS.enc.Base64.parse(iv);

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Convert back to ArrayBuffer
      const typedArray = this.wordArrayToUint8Array(decrypted);
      return typedArray.buffer;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Calculate SHA-256 hash of file content
   * @param {ArrayBuffer|Uint8Array} data - File data
   * @returns {string} Hex encoded hash
   */
  calculateSHA256(data) {
    const wordArray = CryptoJS.lib.WordArray.create(data);
    const hash = CryptoJS.SHA256(wordArray);
    return hash.toString(CryptoJS.enc.Hex);
  }

  /**
   * Verify file integrity using hash
   * @param {ArrayBuffer|Uint8Array} data - File data
   * @param {string} expectedHash - Expected SHA-256 hash
   * @returns {boolean} True if hash matches
   */
  verifyIntegrity(data, expectedHash) {
    const actualHash = this.calculateSHA256(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate content identifier (CID) for file
   * @param {ArrayBuffer|Uint8Array} data - File data
   * @param {Object} metadata - File metadata
   * @returns {string} Content identifier
   */
  generateCID(data, metadata = {}) {
    const hash = this.calculateSHA256(data);
    const metadataHash = CryptoJS.SHA256(JSON.stringify(metadata)).toString();
    const combinedHash = CryptoJS.SHA256(hash + metadataHash).toString();
    
    // Format as IPFS-style CID (simplified)
    return `Qm${combinedHash.substring(0, 44)}`;
  }

  /**
   * Create encrypted file chunk for distributed storage
   * @param {ArrayBuffer} fileData - File data
   * @param {number} chunkSize - Size of each chunk in bytes
   * @param {string} encryptionKey - Encryption key
   * @returns {Array} Array of encrypted chunks
   */
  async createEncryptedChunks(fileData, chunkSize = 1024 * 1024, encryptionKey) {
    const chunks = [];
    const totalSize = fileData.byteLength;
    
    for (let offset = 0; offset < totalSize; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, totalSize);
      const chunkData = fileData.slice(offset, end);
      
      const encryptedChunk = await this.encryptFile(chunkData, encryptionKey);
      chunks.push({
        index: Math.floor(offset / chunkSize),
        size: end - offset,
        offset,
        ...encryptedChunk
      });
    }
    
    return chunks;
  }

  /**
   * Reconstruct file from encrypted chunks
   * @param {Array} encryptedChunks - Array of encrypted chunks
   * @param {string} encryptionKey - Decryption key
   * @returns {ArrayBuffer} Reconstructed file data
   */
  async reconstructFromChunks(encryptedChunks, encryptionKey) {
    // Sort chunks by index
    const sortedChunks = encryptedChunks.sort((a, b) => a.index - b.index);
    const decryptedChunks = [];
    
    for (const chunk of sortedChunks) {
      const decryptedData = await this.decryptFile(
        chunk.encryptedData,
        encryptionKey,
        chunk.iv
      );
      decryptedChunks.push(new Uint8Array(decryptedData));
    }
    
    // Combine all chunks
    const totalSize = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of decryptedChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }

  /**
   * Convert CryptoJS WordArray to Uint8Array
   * @param {Object} wordArray - CryptoJS WordArray
   * @returns {Uint8Array} Converted array
   */
  wordArrayToUint8Array(wordArray) {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
      u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    
    return u8;
  }

  /**
   * Generate secure salt for key derivation
   * @returns {string} Base64 encoded salt
   */
  generateSalt() {
    const salt = CryptoJS.lib.WordArray.random(256 / 8);
    return CryptoJS.enc.Base64.stringify(salt);
  }
}

// Export singleton instance
export default new EncryptionService();

// Export class for testing
export { EncryptionService };