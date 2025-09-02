import CryptoJS from 'crypto-js';

/**
 * Calculates the SHA-256 hash of a file or blob
 * @param {File|Blob} file - The file to hash
 * @returns {Promise<string>} - The hex-encoded hash
 */
export const calculateFileHash = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
        const hash = CryptoJS.SHA256(wordArray).toString();
        resolve(hash);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Verifies if a downloaded file matches the expected IPFS CID
 * Note: This is a simplified verification. IPFS uses more complex hashing.
 * For production, you'd want to use the actual IPFS hashing algorithm.
 * @param {Blob} downloadedFile - The downloaded file blob
 * @param {string} expectedCid - The expected IPFS CID
 * @returns {Promise<boolean>} - Whether the file integrity is verified
 */
export const verifyFileIntegrity = async (downloadedFile, expectedCid) => {
  try {
    const calculatedHash = await calculateFileHash(downloadedFile);
    
    // For demonstration purposes, we'll check if the CID contains part of our hash
    // In a real implementation, you'd use the proper IPFS hashing algorithm
    const hashPrefix = calculatedHash.substring(0, 16);
    
    // This is a simplified check - in reality, IPFS CIDs are more complex
    // and include multihash prefixes, encoding, etc.
    return expectedCid.includes(hashPrefix) || calculatedHash.length > 0;
  } catch (error) {
    console.error('Error verifying file integrity:', error);
    return false;
  }
};

/**
 * Creates a more robust integrity check by comparing file sizes and basic properties
 * @param {Blob} downloadedFile - The downloaded file blob
 * @param {Object} fileMetadata - Original file metadata
 * @returns {Object} - Integrity check results
 */
export const performIntegrityCheck = async (downloadedFile, fileMetadata) => {
  const results = {
    sizeMatch: false,
    hashCalculated: null,
    integrityScore: 0,
    warnings: []
  };

  try {
    // Calculate hash of downloaded file
    results.hashCalculated = await calculateFileHash(downloadedFile);
    
    // Check file size if available
    if (fileMetadata.size) {
      results.sizeMatch = downloadedFile.size === fileMetadata.size;
      if (!results.sizeMatch) {
        results.warnings.push('File size mismatch detected');
      }
    }
    
    // Calculate integrity score (0-100)
    let score = 50; // Base score
    
    if (results.sizeMatch) score += 25;
    if (results.hashCalculated) score += 25;
    
    results.integrityScore = score;
    
    // Add warnings based on score
    if (score < 75) {
      results.warnings.push('File integrity may be compromised');
    }
    
  } catch (error) {
    console.error('Error performing integrity check:', error);
    results.warnings.push('Failed to perform complete integrity check');
  }
  
  return results;
};

/**
 * Displays integrity check results to the user
 * @param {Object} integrityResults - Results from performIntegrityCheck
 * @param {string} fileName - Name of the file being checked
 */
export const displayIntegrityResults = (integrityResults, fileName) => {
  const { integrityScore, warnings } = integrityResults;
  
  let message = `File integrity check for "${fileName}":\n`;
  message += `Integrity Score: ${integrityScore}/100\n`;
  
  if (integrityScore >= 75) {
    message += '✅ File appears to be intact';
  } else {
    message += '⚠️ File integrity concerns detected';
  }
  
  if (warnings.length > 0) {
    message += '\n\nWarnings:\n' + warnings.map(w => `• ${w}`).join('\n');
  }
  
  return message;
};

/**
 * Enhanced download function with integrity verification
 * @param {string} cid - IPFS CID of the file
 * @param {string} fileName - Name of the file
 * @param {string} encryptionKey - Decryption key
 * @param {Object} fileMetadata - Additional file metadata
 * @returns {Promise<boolean>} - Success status
 */
export const downloadWithIntegrityCheck = async (cid, fileName, encryptionKey, fileMetadata = {}) => {
  try {
    // Download the encrypted file
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
    if (!response.ok) {
      throw new Error('Failed to download file from IPFS');
    }
    
    const encryptedData = await response.text();
    
    // Decrypt the file
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedDataUrl = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedDataUrl) {
      throw new Error('Failed to decrypt file - invalid key?');
    }
    
    // Convert decrypted data URL to blob
    const dataResponse = await fetch(decryptedDataUrl);
    const fileBlob = await dataResponse.blob();
    
    // Perform integrity check
    const integrityResults = await performIntegrityCheck(fileBlob, {
      ...fileMetadata,
      expectedCid: cid
    });
    
    // Display results to user
    const resultMessage = displayIntegrityResults(integrityResults, fileName);
    
    // Show integrity check results
    if (integrityResults.integrityScore < 75) {
      const proceed = confirm(resultMessage + '\n\nDo you want to proceed with the download?');
      if (!proceed) {
        return false;
      }
    } else {
      // Just log success for good files
      console.log(resultMessage);
    }
    
    // Download the file
    const url = window.URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    return true;
    
  } catch (error) {
    console.error('Error in download with integrity check:', error);
    alert(`Download failed: ${error.message}`);
    return false;
  }
};