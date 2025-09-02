import CryptoJS from 'crypto-js';
import EncryptionService from './encryption.js';
import FileIntegrityService from './fileIntegrity.js';

/**
 * Comprehensive version control system for decentralized storage
 * Provides file versioning, change tracking, conflict resolution, and merkle tree-based history
 */
class VersionControlService {
  constructor() {
    this.fileVersions = new Map(); // fileId -> versions array
    this.branchHistory = new Map(); // fileId -> branches
    this.conflictResolutions = new Map(); // conflictId -> resolution data
    this.versionTrees = new Map(); // fileId -> merkle tree of versions
    this.changeLog = new Map(); // fileId -> change events
  }

  /**
   * Create initial version of a file
   * @param {string} fileId - File identifier
   * @param {ArrayBuffer|Uint8Array} fileData - File data
   * @param {Object} metadata - File metadata
   * @param {string} authorId - Author identifier
   * @returns {Object} Version information
   */
  createInitialVersion(fileId, fileData, metadata, authorId) {
    const versionId = this.generateVersionId();
    const contentHash = EncryptionService.calculateSHA256(fileData);
    const timestamp = Date.now();
    
    const version = {
      versionId,
      fileId,
      versionNumber: 1,
      contentHash,
      authorId,
      timestamp,
      metadata: {
        ...metadata,
        size: fileData.byteLength,
        mimeType: metadata.mimeType || 'application/octet-stream'
      },
      parentVersions: [],
      branchName: 'main',
      changeType: 'create',
      changeDescription: 'Initial file creation',
      merkleRoot: null,
      isHead: true
    };

    // Initialize version history
    this.fileVersions.set(fileId, [version]);
    
    // Initialize branch history
    this.branchHistory.set(fileId, {
      main: {
        name: 'main',
        head: versionId,
        created: timestamp,
        createdBy: authorId
      }
    });

    // Log change event
    this.logChangeEvent(fileId, {
      type: 'file_created',
      versionId,
      authorId,
      timestamp,
      details: { initialVersion: true }
    });

    return version;
  }

  /**
   * Create new version of existing file
   * @param {string} fileId - File identifier
   * @param {ArrayBuffer|Uint8Array} newFileData - New file data
   * @param {Object} metadata - Updated metadata
   * @param {string} authorId - Author identifier
   * @param {string} changeDescription - Description of changes
   * @param {string} branchName - Branch name (default: 'main')
   * @returns {Object} New version information
   */
  createNewVersion(fileId, newFileData, metadata, authorId, changeDescription, branchName = 'main') {
    const versions = this.fileVersions.get(fileId);
    if (!versions) {
      throw new Error('File not found in version control');
    }

    const currentHead = this.getBranchHead(fileId, branchName);
    if (!currentHead) {
      throw new Error(`Branch '${branchName}' not found`);
    }

    const versionId = this.generateVersionId();
    const contentHash = EncryptionService.calculateSHA256(newFileData);
    const timestamp = Date.now();
    const versionNumber = versions.length + 1;

    // Detect change type
    const changeType = this.detectChangeType(currentHead, newFileData, metadata);
    
    const newVersion = {
      versionId,
      fileId,
      versionNumber,
      contentHash,
      authorId,
      timestamp,
      metadata: {
        ...metadata,
        size: newFileData.byteLength,
        mimeType: metadata.mimeType || currentHead.metadata.mimeType
      },
      parentVersions: [currentHead.versionId],
      branchName,
      changeType,
      changeDescription,
      merkleRoot: null,
      isHead: true
    };

    // Update previous head
    currentHead.isHead = false;
    
    // Add new version
    versions.push(newVersion);
    
    // Update branch head
    const branches = this.branchHistory.get(fileId);
    branches[branchName].head = versionId;

    // Update merkle tree
    this.updateVersionMerkleTree(fileId);

    // Log change event
    this.logChangeEvent(fileId, {
      type: 'version_created',
      versionId,
      authorId,
      timestamp,
      changeType,
      changeDescription,
      branchName,
      details: { parentVersion: currentHead.versionId }
    });

    return newVersion;
  }

  /**
   * Create new branch from existing version
   * @param {string} fileId - File identifier
   * @param {string} sourceBranch - Source branch name
   * @param {string} newBranchName - New branch name
   * @param {string} authorId - Author identifier
   * @returns {Object} Branch information
   */
  createBranch(fileId, sourceBranch, newBranchName, authorId) {
    const branches = this.branchHistory.get(fileId);
    if (!branches || !branches[sourceBranch]) {
      throw new Error(`Source branch '${sourceBranch}' not found`);
    }

    if (branches[newBranchName]) {
      throw new Error(`Branch '${newBranchName}' already exists`);
    }

    const sourceHead = branches[sourceBranch].head;
    const timestamp = Date.now();

    branches[newBranchName] = {
      name: newBranchName,
      head: sourceHead,
      created: timestamp,
      createdBy: authorId,
      parentBranch: sourceBranch
    };

    this.logChangeEvent(fileId, {
      type: 'branch_created',
      branchName: newBranchName,
      sourceBranch,
      authorId,
      timestamp,
      details: { headVersion: sourceHead }
    });

    return branches[newBranchName];
  }

  /**
   * Merge branches with conflict detection
   * @param {string} fileId - File identifier
   * @param {string} sourceBranch - Source branch to merge from
   * @param {string} targetBranch - Target branch to merge into
   * @param {string} authorId - Author identifier
   * @param {Object} conflictResolution - Manual conflict resolution if needed
   * @returns {Object} Merge result
   */
  async mergeBranches(fileId, sourceBranch, targetBranch, authorId, conflictResolution = null) {
    const branches = this.branchHistory.get(fileId);
    if (!branches[sourceBranch] || !branches[targetBranch]) {
      throw new Error('Source or target branch not found');
    }

    const sourceHead = this.getVersion(fileId, branches[sourceBranch].head);
    const targetHead = this.getVersion(fileId, branches[targetBranch].head);

    // Check for conflicts
    const conflicts = this.detectMergeConflicts(sourceHead, targetHead);
    
    if (conflicts.length > 0 && !conflictResolution) {
      return {
        success: false,
        conflicts,
        conflictId: this.generateConflictId(),
        message: 'Merge conflicts detected. Manual resolution required.'
      };
    }

    // Perform merge
    const mergeResult = await this.performMerge(sourceHead, targetHead, conflicts, conflictResolution, authorId);
    
    if (mergeResult.success) {
      // Update target branch head
      branches[targetBranch].head = mergeResult.mergeVersionId;
      
      this.logChangeEvent(fileId, {
        type: 'branch_merged',
        sourceBranch,
        targetBranch,
        mergeVersionId: mergeResult.mergeVersionId,
        authorId,
        timestamp: Date.now(),
        details: { 
          conflicts: conflicts.length,
          resolved: conflictResolution ? true : false
        }
      });
    }

    return mergeResult;
  }

  /**
   * Get file version by version ID
   * @param {string} fileId - File identifier
   * @param {string} versionId - Version identifier
   * @returns {Object|null} Version data
   */
  getVersion(fileId, versionId) {
    const versions = this.fileVersions.get(fileId);
    if (!versions) return null;
    
    return versions.find(v => v.versionId === versionId) || null;
  }

  /**
   * Get current head version of a branch
   * @param {string} fileId - File identifier
   * @param {string} branchName - Branch name
   * @returns {Object|null} Head version
   */
  getBranchHead(fileId, branchName) {
    const branches = this.branchHistory.get(fileId);
    if (!branches || !branches[branchName]) return null;
    
    return this.getVersion(fileId, branches[branchName].head);
  }

  /**
   * Get version history for a file
   * @param {string} fileId - File identifier
   * @param {string} branchName - Branch name (optional)
   * @param {number} limit - Maximum versions to return
   * @returns {Array} Version history
   */
  getVersionHistory(fileId, branchName = null, limit = 50) {
    const versions = this.fileVersions.get(fileId);
    if (!versions) return [];

    let filteredVersions = versions;
    
    if (branchName) {
      filteredVersions = versions.filter(v => v.branchName === branchName);
    }

    return filteredVersions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Compare two versions and show differences
   * @param {string} fileId - File identifier
   * @param {string} version1Id - First version ID
   * @param {string} version2Id - Second version ID
   * @returns {Object} Comparison result
   */
  compareVersions(fileId, version1Id, version2Id) {
    const version1 = this.getVersion(fileId, version1Id);
    const version2 = this.getVersion(fileId, version2Id);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const differences = {
      contentChanged: version1.contentHash !== version2.contentHash,
      sizeChanged: version1.metadata.size !== version2.metadata.size,
      metadataChanges: this.compareMetadata(version1.metadata, version2.metadata),
      timeDifference: Math.abs(version2.timestamp - version1.timestamp),
      authorChanged: version1.authorId !== version2.authorId,
      branchChanged: version1.branchName !== version2.branchName
    };

    return {
      version1,
      version2,
      differences,
      similarity: this.calculateVersionSimilarity(version1, version2)
    };
  }

  /**
   * Revert to a previous version
   * @param {string} fileId - File identifier
   * @param {string} targetVersionId - Version to revert to
   * @param {string} authorId - Author identifier
   * @param {string} branchName - Branch name
   * @returns {Object} New version created from revert
   */
  revertToVersion(fileId, targetVersionId, authorId, branchName = 'main') {
    const targetVersion = this.getVersion(fileId, targetVersionId);
    if (!targetVersion) {
      throw new Error('Target version not found');
    }

    const currentHead = this.getBranchHead(fileId, branchName);
    
    // Create new version with reverted content
    const versionId = this.generateVersionId();
    const timestamp = Date.now();
    const versions = this.fileVersions.get(fileId);
    
    const revertVersion = {
      versionId,
      fileId,
      versionNumber: versions.length + 1,
      contentHash: targetVersion.contentHash,
      authorId,
      timestamp,
      metadata: {
        ...targetVersion.metadata,
        revertedFrom: targetVersion.versionId,
        revertedAt: timestamp
      },
      parentVersions: [currentHead.versionId],
      branchName,
      changeType: 'revert',
      changeDescription: `Reverted to version ${targetVersion.versionNumber}`,
      merkleRoot: null,
      isHead: true
    };

    // Update previous head
    currentHead.isHead = false;
    
    // Add revert version
    versions.push(revertVersion);
    
    // Update branch head
    const branches = this.branchHistory.get(fileId);
    branches[branchName].head = versionId;

    this.logChangeEvent(fileId, {
      type: 'version_reverted',
      versionId,
      targetVersionId,
      authorId,
      timestamp,
      branchName,
      details: { revertedToVersion: targetVersion.versionNumber }
    });

    return revertVersion;
  }

  /**
   * Detect type of change between versions
   * @param {Object} previousVersion - Previous version
   * @param {ArrayBuffer|Uint8Array} newData - New file data
   * @param {Object} newMetadata - New metadata
   * @returns {string} Change type
   */
  detectChangeType(previousVersion, newData, newMetadata) {
    const newHash = EncryptionService.calculateSHA256(newData);
    
    if (newHash === previousVersion.contentHash) {
      return 'metadata_only';
    }
    
    const sizeDiff = Math.abs(newData.byteLength - previousVersion.metadata.size);
    const sizeChangePercent = sizeDiff / previousVersion.metadata.size;
    
    if (sizeChangePercent > 0.5) {
      return 'major_change';
    } else if (sizeChangePercent > 0.1) {
      return 'moderate_change';
    } else {
      return 'minor_change';
    }
  }

  /**
   * Detect merge conflicts between two versions
   * @param {Object} sourceVersion - Source version
   * @param {Object} targetVersion - Target version
   * @returns {Array} Array of conflicts
   */
  detectMergeConflicts(sourceVersion, targetVersion) {
    const conflicts = [];
    
    // Check for content conflicts
    if (sourceVersion.contentHash !== targetVersion.contentHash) {
      conflicts.push({
        type: 'content_conflict',
        description: 'File content differs between branches',
        sourceHash: sourceVersion.contentHash,
        targetHash: targetVersion.contentHash
      });
    }
    
    // Check for metadata conflicts
    const metadataConflicts = this.compareMetadata(sourceVersion.metadata, targetVersion.metadata);
    if (metadataConflicts.length > 0) {
      conflicts.push({
        type: 'metadata_conflict',
        description: 'Metadata differs between branches',
        conflicts: metadataConflicts
      });
    }
    
    return conflicts;
  }

  /**
   * Perform merge operation
   * @param {Object} sourceVersion - Source version
   * @param {Object} targetVersion - Target version
   * @param {Array} conflicts - Detected conflicts
   * @param {Object} resolution - Conflict resolution
   * @param {string} authorId - Author identifier
   * @returns {Object} Merge result
   */
  async performMerge(sourceVersion, targetVersion, conflicts, resolution, authorId) {
    // For now, implement a simple merge strategy
    // In production, this would be more sophisticated
    
    const mergeVersionId = this.generateVersionId();
    const timestamp = Date.now();
    
    // Use resolution strategy or default to target version
    const mergedContentHash = resolution?.useSource ? sourceVersion.contentHash : targetVersion.contentHash;
    const mergedMetadata = {
      ...targetVersion.metadata,
      ...(resolution?.metadata || {}),
      mergedFrom: [sourceVersion.versionId, targetVersion.versionId],
      mergedAt: timestamp
    };
    
    const versions = this.fileVersions.get(sourceVersion.fileId);
    
    const mergeVersion = {
      versionId: mergeVersionId,
      fileId: sourceVersion.fileId,
      versionNumber: versions.length + 1,
      contentHash: mergedContentHash,
      authorId,
      timestamp,
      metadata: mergedMetadata,
      parentVersions: [sourceVersion.versionId, targetVersion.versionId],
      branchName: targetVersion.branchName,
      changeType: 'merge',
      changeDescription: `Merged ${sourceVersion.branchName} into ${targetVersion.branchName}`,
      merkleRoot: null,
      isHead: true
    };
    
    // Update previous heads
    sourceVersion.isHead = false;
    targetVersion.isHead = false;
    
    // Add merge version
    versions.push(mergeVersion);
    
    return {
      success: true,
      mergeVersionId,
      mergeVersion,
      resolvedConflicts: conflicts.length
    };
  }

  /**
   * Update merkle tree for version history
   * @param {string} fileId - File identifier
   */
  updateVersionMerkleTree(fileId) {
    const versions = this.fileVersions.get(fileId);
    if (!versions || versions.length === 0) return;
    
    const versionHashes = versions.map(v => v.contentHash);
    const merkleTree = FileIntegrityService.createMerkleTree(versionHashes.map(h => new TextEncoder().encode(h)));
    
    this.versionTrees.set(fileId, merkleTree);
    
    // Update latest version with merkle root
    const latestVersion = versions[versions.length - 1];
    latestVersion.merkleRoot = merkleTree.rootHash;
  }

  /**
   * Compare metadata between versions
   * @param {Object} metadata1 - First metadata
   * @param {Object} metadata2 - Second metadata
   * @returns {Array} Array of differences
   */
  compareMetadata(metadata1, metadata2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(metadata1), ...Object.keys(metadata2)]);
    
    for (const key of allKeys) {
      if (metadata1[key] !== metadata2[key]) {
        differences.push({
          key,
          oldValue: metadata1[key],
          newValue: metadata2[key]
        });
      }
    }
    
    return differences;
  }

  /**
   * Calculate similarity between versions
   * @param {Object} version1 - First version
   * @param {Object} version2 - Second version
   * @returns {number} Similarity score (0-1)
   */
  calculateVersionSimilarity(version1, version2) {
    let score = 0;
    let factors = 0;
    
    // Content similarity
    if (version1.contentHash === version2.contentHash) {
      score += 0.5;
    }
    factors += 0.5;
    
    // Size similarity
    const sizeDiff = Math.abs(version1.metadata.size - version2.metadata.size);
    const maxSize = Math.max(version1.metadata.size, version2.metadata.size);
    const sizeSimilarity = 1 - (sizeDiff / maxSize);
    score += sizeSimilarity * 0.3;
    factors += 0.3;
    
    // Metadata similarity
    const metadataDiffs = this.compareMetadata(version1.metadata, version2.metadata);
    const metadataKeys = new Set([...Object.keys(version1.metadata), ...Object.keys(version2.metadata)]);
    const metadataSimilarity = 1 - (metadataDiffs.length / metadataKeys.size);
    score += metadataSimilarity * 0.2;
    factors += 0.2;
    
    return score / factors;
  }

  /**
   * Log change event
   * @param {string} fileId - File identifier
   * @param {Object} event - Change event
   */
  logChangeEvent(fileId, event) {
    if (!this.changeLog.has(fileId)) {
      this.changeLog.set(fileId, []);
    }
    
    this.changeLog.get(fileId).push(event);
  }

  /**
   * Get change log for a file
   * @param {string} fileId - File identifier
   * @param {number} limit - Maximum events to return
   * @returns {Array} Change events
   */
  getChangeLog(fileId, limit = 100) {
    const events = this.changeLog.get(fileId) || [];
    return events
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Generate unique version identifier
   * @returns {string} Version ID
   */
  generateVersionId() {
    const randomBytes = CryptoJS.lib.WordArray.random(16);
    return CryptoJS.enc.Hex.stringify(randomBytes);
  }

  /**
   * Generate unique conflict identifier
   * @returns {string} Conflict ID
   */
  generateConflictId() {
    const randomBytes = CryptoJS.lib.WordArray.random(12);
    return `conflict_${CryptoJS.enc.Hex.stringify(randomBytes)}`;
  }

  /**
   * Clean up old version data
   * @param {string} fileId - File identifier
   * @param {number} maxVersions - Maximum versions to keep
   */
  cleanupOldVersions(fileId, maxVersions = 100) {
    const versions = this.fileVersions.get(fileId);
    if (!versions || versions.length <= maxVersions) return;
    
    // Keep the most recent versions and important milestones
    const sortedVersions = versions.sort((a, b) => b.timestamp - a.timestamp);
    const toKeep = sortedVersions.slice(0, maxVersions);
    
    this.fileVersions.set(fileId, toKeep);
  }
}

// Export singleton instance
export default new VersionControlService();

// Export class for testing
export { VersionControlService };