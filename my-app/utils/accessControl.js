import CryptoJS from 'crypto-js';
import EncryptionService from './encryption.js';

/**
 * Token-based access control system with granular permissions
 * Manages file access, user permissions, and secure token generation
 */
class AccessControlService {
  constructor() {
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.permissions = {
      READ: 'read',
      WRITE: 'write',
      DELETE: 'delete',
      SHARE: 'share',
      ADMIN: 'admin'
    };
    this.userSessions = new Map();
    this.filePermissions = new Map();
    this.accessTokens = new Map();
  }

  /**
   * Generate secure access token for user
   * @param {string} userId - User identifier
   * @param {Array} permissions - Array of permissions
   * @param {number} expiryTime - Token expiry time (optional)
   * @returns {Object} Access token with metadata
   */
  generateAccessToken(userId, permissions = [], expiryTime = null) {
    const tokenId = this.generateSecureId();
    const issuedAt = Date.now();
    const expiresAt = expiryTime || (issuedAt + this.tokenExpiry);
    
    const tokenData = {
      tokenId,
      userId,
      permissions,
      issuedAt,
      expiresAt,
      scope: 'file_access'
    };

    // Create JWT-like token
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload = tokenData;
    const secret = this.generateTokenSecret(userId);
    
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
    
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    // Store token metadata
    this.accessTokens.set(tokenId, {
      ...tokenData,
      token,
      active: true
    });

    return {
      token,
      tokenId,
      expiresAt,
      permissions
    };
  }

  /**
   * Validate access token
   * @param {string} token - Access token to validate
   * @returns {Object|null} Token data if valid, null otherwise
   */
  validateToken(token) {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      if (!encodedHeader || !encodedPayload || !signature) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));
      const { tokenId, userId, expiresAt } = payload;

      // Check if token exists and is active
      const storedToken = this.accessTokens.get(tokenId);
      if (!storedToken || !storedToken.active) {
        return null;
      }

      // Check expiry
      if (Date.now() > expiresAt) {
        this.revokeToken(tokenId);
        return null;
      }

      // Verify signature
      const secret = this.generateTokenSecret(userId);
      const expectedSignature = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret);
      
      if (signature !== expectedSignature) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission for a file
   * @param {string} token - Access token
   * @param {string} fileId - File identifier
   * @param {string} permission - Required permission
   * @returns {boolean} True if user has permission
   */
  hasPermission(token, fileId, permission) {
    const tokenData = this.validateToken(token);
    if (!tokenData) {
      return false;
    }

    const { userId, permissions } = tokenData;
    
    // Check if user has admin permission (grants all access)
    if (permissions.includes(this.permissions.ADMIN)) {
      return true;
    }

    // Check specific permission
    if (!permissions.includes(permission)) {
      return false;
    }

    // Check file-specific permissions
    const filePerms = this.filePermissions.get(fileId);
    if (!filePerms) {
      return false;
    }

    const userFilePerms = filePerms.users?.[userId] || [];
    return userFilePerms.includes(permission) || userFilePerms.includes(this.permissions.ADMIN);
  }

  /**
   * Set file permissions for a user
   * @param {string} fileId - File identifier
   * @param {string} userId - User identifier
   * @param {Array} permissions - Array of permissions to grant
   * @param {string} grantedBy - User who granted the permissions
   */
  setFilePermissions(fileId, userId, permissions, grantedBy) {
    if (!this.filePermissions.has(fileId)) {
      this.filePermissions.set(fileId, {
        owner: grantedBy,
        users: {},
        groups: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    const filePerms = this.filePermissions.get(fileId);
    filePerms.users[userId] = permissions;
    filePerms.updatedAt = Date.now();
    
    // Log permission change
    this.logAccessEvent({
      type: 'permission_granted',
      fileId,
      userId,
      permissions,
      grantedBy,
      timestamp: Date.now()
    });
  }

  /**
   * Revoke file permissions for a user
   * @param {string} fileId - File identifier
   * @param {string} userId - User identifier
   * @param {string} revokedBy - User who revoked the permissions
   */
  revokeFilePermissions(fileId, userId, revokedBy) {
    const filePerms = this.filePermissions.get(fileId);
    if (filePerms && filePerms.users[userId]) {
      delete filePerms.users[userId];
      filePerms.updatedAt = Date.now();
      
      this.logAccessEvent({
        type: 'permission_revoked',
        fileId,
        userId,
        revokedBy,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Create file sharing link with specific permissions
   * @param {string} fileId - File identifier
   * @param {Array} permissions - Permissions for the link
   * @param {number} expiryTime - Link expiry time
   * @param {string} createdBy - User who created the link
   * @returns {Object} Sharing link data
   */
  createSharingLink(fileId, permissions, expiryTime, createdBy) {
    const linkId = this.generateSecureId();
    const shareToken = this.generateAccessToken(`share_${linkId}`, permissions, expiryTime);
    
    const sharingLink = {
      linkId,
      fileId,
      token: shareToken.token,
      permissions,
      createdBy,
      createdAt: Date.now(),
      expiresAt: expiryTime,
      accessCount: 0,
      active: true
    };

    // Store sharing link
    this.accessTokens.set(`share_${linkId}`, sharingLink);
    
    return {
      shareUrl: `${window.location.origin}/share/${linkId}`,
      linkId,
      expiresAt: expiryTime,
      permissions
    };
  }

  /**
   * Validate sharing link and grant temporary access
   * @param {string} linkId - Sharing link identifier
   * @returns {Object|null} Access data if valid
   */
  validateSharingLink(linkId) {
    const sharingData = this.accessTokens.get(`share_${linkId}`);
    
    if (!sharingData || !sharingData.active) {
      return null;
    }

    if (Date.now() > sharingData.expiresAt) {
      sharingData.active = false;
      return null;
    }

    // Increment access count
    sharingData.accessCount++;
    
    this.logAccessEvent({
      type: 'share_link_accessed',
      linkId,
      fileId: sharingData.fileId,
      timestamp: Date.now()
    });

    return {
      fileId: sharingData.fileId,
      permissions: sharingData.permissions,
      token: sharingData.token
    };
  }

  /**
   * Revoke access token
   * @param {string} tokenId - Token identifier to revoke
   */
  revokeToken(tokenId) {
    const tokenData = this.accessTokens.get(tokenId);
    if (tokenData) {
      tokenData.active = false;
      tokenData.revokedAt = Date.now();
    }
  }

  /**
   * Get user's active sessions
   * @param {string} userId - User identifier
   * @returns {Array} Array of active sessions
   */
  getUserSessions(userId) {
    const sessions = [];
    
    for (const [tokenId, tokenData] of this.accessTokens) {
      if (tokenData.userId === userId && tokenData.active && Date.now() < tokenData.expiresAt) {
        sessions.push({
          tokenId,
          issuedAt: tokenData.issuedAt,
          expiresAt: tokenData.expiresAt,
          permissions: tokenData.permissions
        });
      }
    }
    
    return sessions;
  }

  /**
   * Log access events for audit trail
   * @param {Object} event - Access event data
   */
  logAccessEvent(event) {
    // In a real implementation, this would write to a secure audit log
    console.log('Access Event:', event);
    
    // Store in memory for demo (in production, use persistent storage)
    if (!this.accessLogs) {
      this.accessLogs = [];
    }
    this.accessLogs.push(event);
  }

  /**
   * Get access logs for a file
   * @param {string} fileId - File identifier
   * @param {number} limit - Maximum number of logs to return
   * @returns {Array} Array of access logs
   */
  getAccessLogs(fileId, limit = 100) {
    if (!this.accessLogs) {
      return [];
    }
    
    return this.accessLogs
      .filter(log => log.fileId === fileId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Generate secure identifier
   * @returns {string} Secure random identifier
   */
  generateSecureId() {
    const randomBytes = CryptoJS.lib.WordArray.random(32);
    return CryptoJS.enc.Hex.stringify(randomBytes);
  }

  /**
   * Generate token secret for user
   * @param {string} userId - User identifier
   * @returns {string} Token secret
   */
  generateTokenSecret(userId) {
    // In production, this should be stored securely
    const secret = CryptoJS.SHA256(`${userId}_secret_${process.env.JWT_SECRET || 'default_secret'}`).toString();
    return secret;
  }

  /**
   * Create HMAC signature
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @returns {string} Base64 URL encoded signature
   */
  createSignature(data, secret) {
    const signature = CryptoJS.HmacSHA256(data, secret);
    return this.base64UrlEncode(CryptoJS.enc.Base64.stringify(signature));
  }

  /**
   * Base64 URL encode
   * @param {string} str - String to encode
   * @returns {string} Base64 URL encoded string
   */
  base64UrlEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   * @param {string} str - String to decode
   * @returns {string} Decoded string
   */
  base64UrlDecode(str) {
    str += '='.repeat((4 - str.length % 4) % 4);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    
    for (const [tokenId, tokenData] of this.accessTokens) {
      if (now > tokenData.expiresAt) {
        this.accessTokens.delete(tokenId);
      }
    }
  }
}

// Export singleton instance
export default new AccessControlService();

// Export class for testing
export { AccessControlService };