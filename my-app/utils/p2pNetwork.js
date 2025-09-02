/**
 * P2P Network Service for Decentralized Storage
 * Handles peer discovery, file distribution, and network communication
 */

class P2PNetworkService {
    constructor() {
        this.nodeId = this.generateNodeId();
        this.peers = new Map();
        this.files = new Map();
        this.connections = new Map();
        this.isOnline = false;
        this.maxPeers = 50;
        this.heartbeatInterval = 30000; // 30 seconds
        this.discoveryInterval = 60000; // 1 minute
        this.bootstrapNodes = [
            'ws://localhost:8001',
            'ws://localhost:8002',
            'ws://localhost:8003'
        ];
        this.messageHandlers = new Map();
        this.fileChunks = new Map();
        this.downloadQueue = new Map();
        this.uploadQueue = new Map();
        
        this.setupMessageHandlers();
    }

    /**
     * Generate unique node identifier
     * @returns {string} Node ID
     */
    generateNodeId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 15);
        return `node_${timestamp}_${randomStr}`;
    }

    /**
     * Initialize P2P network connection
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            console.log(`Initializing P2P network for node: ${this.nodeId}`);
            
            // Start WebRTC peer connection setup
            await this.setupWebRTC();
            
            // Connect to bootstrap nodes
            await this.connectToBootstrapNodes();
            
            // Start discovery process
            this.startPeerDiscovery();
            
            // Start heartbeat
            this.startHeartbeat();
            
            this.isOnline = true;
            console.log('P2P network initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize P2P network:', error);
            return false;
        }
    }

    /**
     * Setup WebRTC for peer-to-peer connections
     */
    async setupWebRTC() {
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        // Initialize local peer connection
        this.localConnection = new RTCPeerConnection(this.rtcConfig);
        
        // Setup data channel for file transfer
        this.dataChannel = this.localConnection.createDataChannel('fileTransfer', {
            ordered: true,
            maxRetransmits: 3
        });
        
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };
        
        this.dataChannel.onmessage = (event) => {
            this.handleDataChannelMessage(event.data);
        };
        
        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
        };
    }

    /**
     * Connect to bootstrap nodes for initial peer discovery
     */
    async connectToBootstrapNodes() {
        const connectionPromises = this.bootstrapNodes.map(async (nodeUrl) => {
            try {
                const ws = new WebSocket(nodeUrl);
                
                return new Promise((resolve, reject) => {
                    ws.onopen = () => {
                        console.log(`Connected to bootstrap node: ${nodeUrl}`);
                        this.sendMessage(ws, {
                            type: 'PEER_DISCOVERY',
                            nodeId: this.nodeId,
                            timestamp: Date.now()
                        });
                        resolve(ws);
                    };
                    
                    ws.onerror = (error) => {
                        console.warn(`Failed to connect to bootstrap node ${nodeUrl}:`, error);
                        reject(error);
                    };
                    
                    ws.onmessage = (event) => {
                        this.handleWebSocketMessage(ws, event.data);
                    };
                    
                    setTimeout(() => reject(new Error('Connection timeout')), 5000);
                });
            } catch (error) {
                console.warn(`Bootstrap connection failed for ${nodeUrl}:`, error);
                return null;
            }
        });
        
        const results = await Promise.allSettled(connectionPromises);
        const successfulConnections = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
        
        console.log(`Connected to ${successfulConnections.length} bootstrap nodes`);
        return successfulConnections;
    }

    /**
     * Setup message handlers for different message types
     */
    setupMessageHandlers() {
        this.messageHandlers.set('PEER_DISCOVERY', this.handlePeerDiscovery.bind(this));
        this.messageHandlers.set('PEER_LIST', this.handlePeerList.bind(this));
        this.messageHandlers.set('FILE_REQUEST', this.handleFileRequest.bind(this));
        this.messageHandlers.set('FILE_CHUNK', this.handleFileChunk.bind(this));
        this.messageHandlers.set('FILE_METADATA', this.handleFileMetadata.bind(this));
        this.messageHandlers.set('HEARTBEAT', this.handleHeartbeat.bind(this));
        this.messageHandlers.set('PEER_CONNECT', this.handlePeerConnect.bind(this));
        this.messageHandlers.set('PEER_DISCONNECT', this.handlePeerDisconnect.bind(this));
    }

    /**
     * Handle WebSocket messages
     * @param {WebSocket} ws WebSocket connection
     * @param {string} data Message data
     */
    handleWebSocketMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            const handler = this.messageHandlers.get(message.type);
            
            if (handler) {
                handler(ws, message);
            } else {
                console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    }

    /**
     * Handle data channel messages
     * @param {string} data Message data
     */
    handleDataChannelMessage(data) {
        try {
            const message = JSON.parse(data);
            const handler = this.messageHandlers.get(message.type);
            
            if (handler) {
                handler(null, message);
            }
        } catch (error) {
            // Handle binary data (file chunks)
            this.handleBinaryData(data);
        }
    }

    /**
     * Handle peer discovery messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handlePeerDiscovery(ws, message) {
        console.log('Peer discovery from:', message.nodeId);
        
        // Add peer to known peers
        this.peers.set(message.nodeId, {
            nodeId: message.nodeId,
            connection: ws,
            lastSeen: Date.now(),
            status: 'connected'
        });
        
        // Send back peer list
        this.sendMessage(ws, {
            type: 'PEER_LIST',
            peers: Array.from(this.peers.keys()).filter(id => id !== message.nodeId),
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
    }

    /**
     * Handle peer list messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handlePeerList(ws, message) {
        console.log('Received peer list:', message.peers);
        
        // Attempt to connect to new peers
        message.peers.forEach(async (peerId) => {
            if (!this.peers.has(peerId) && this.peers.size < this.maxPeers) {
                await this.connectToPeer(peerId);
            }
        });
    }

    /**
     * Handle file request messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handleFileRequest(ws, message) {
        console.log('File request for:', message.fileId);
        
        if (this.files.has(message.fileId)) {
            const fileData = this.files.get(message.fileId);
            
            // Send file metadata first
            this.sendMessage(ws, {
                type: 'FILE_METADATA',
                fileId: message.fileId,
                fileName: fileData.fileName,
                fileSize: fileData.fileSize,
                chunkCount: fileData.chunks.length,
                contentHash: fileData.contentHash,
                timestamp: Date.now()
            });
            
            // Send file chunks
            this.sendFileChunks(ws, message.fileId, fileData);
        } else {
            // File not found, try to find it from other peers
            this.requestFileFromPeers(message.fileId);
        }
    }

    /**
     * Handle file chunk messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handleFileChunk(ws, message) {
        const { fileId, chunkIndex, chunkData, isLast } = message;
        
        if (!this.fileChunks.has(fileId)) {
            this.fileChunks.set(fileId, new Map());
        }
        
        const chunks = this.fileChunks.get(fileId);
        chunks.set(chunkIndex, chunkData);
        
        console.log(`Received chunk ${chunkIndex} for file ${fileId}`);
        
        if (isLast) {
            this.assembleFile(fileId);
        }
    }

    /**
     * Handle file metadata messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handleFileMetadata(ws, message) {
        console.log('Received file metadata:', message);
        
        // Store metadata for file assembly
        this.downloadQueue.set(message.fileId, {
            fileName: message.fileName,
            fileSize: message.fileSize,
            chunkCount: message.chunkCount,
            contentHash: message.contentHash,
            receivedChunks: 0,
            startTime: Date.now()
        });
    }

    /**
     * Handle heartbeat messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handleHeartbeat(ws, message) {
        // Update peer's last seen timestamp
        if (this.peers.has(message.nodeId)) {
            const peer = this.peers.get(message.nodeId);
            peer.lastSeen = Date.now();
        }
        
        // Send heartbeat response
        this.sendMessage(ws, {
            type: 'HEARTBEAT',
            nodeId: this.nodeId,
            timestamp: Date.now(),
            response: true
        });
    }

    /**
     * Handle peer connect messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handlePeerConnect(ws, message) {
        console.log('Peer connect request from:', message.nodeId);
        
        // Establish WebRTC connection
        this.establishWebRTCConnection(message.nodeId, message.offer);
    }

    /**
     * Handle peer disconnect messages
     * @param {WebSocket} ws WebSocket connection
     * @param {Object} message Message object
     */
    handlePeerDisconnect(ws, message) {
        console.log('Peer disconnect:', message.nodeId);
        
        if (this.peers.has(message.nodeId)) {
            this.peers.delete(message.nodeId);
        }
    }

    /**
     * Start peer discovery process
     */
    startPeerDiscovery() {
        setInterval(() => {
            if (this.peers.size < this.maxPeers) {
                this.discoverNewPeers();
            }
        }, this.discoveryInterval);
    }

    /**
     * Start heartbeat process
     */
    startHeartbeat() {
        setInterval(() => {
            this.sendHeartbeat();
            this.cleanupStaleConnections();
        }, this.heartbeatInterval);
    }

    /**
     * Send heartbeat to all connected peers
     */
    sendHeartbeat() {
        const heartbeatMessage = {
            type: 'HEARTBEAT',
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
        
        this.peers.forEach((peer, peerId) => {
            if (peer.connection && peer.connection.readyState === WebSocket.OPEN) {
                this.sendMessage(peer.connection, heartbeatMessage);
            }
        });
    }

    /**
     * Clean up stale connections
     */
    cleanupStaleConnections() {
        const now = Date.now();
        const staleThreshold = this.heartbeatInterval * 3; // 90 seconds
        
        this.peers.forEach((peer, peerId) => {
            if (now - peer.lastSeen > staleThreshold) {
                console.log(`Removing stale peer: ${peerId}`);
                this.peers.delete(peerId);
                
                if (peer.connection) {
                    peer.connection.close();
                }
            }
        });
    }

    /**
     * Discover new peers
     */
    async discoverNewPeers() {
        // Request peer lists from connected peers
        const discoveryMessage = {
            type: 'PEER_DISCOVERY',
            nodeId: this.nodeId,
            timestamp: Date.now()
        };
        
        this.peers.forEach((peer) => {
            if (peer.connection && peer.connection.readyState === WebSocket.OPEN) {
                this.sendMessage(peer.connection, discoveryMessage);
            }
        });
    }

    /**
     * Connect to a specific peer
     * @param {string} peerId Peer ID to connect to
     */
    async connectToPeer(peerId) {
        try {
            // In a real implementation, you would need a signaling server
            // to exchange connection information between peers
            console.log(`Attempting to connect to peer: ${peerId}`);
            
            // This is a simplified version - in practice, you'd need
            // proper WebRTC signaling
            const offer = await this.localConnection.createOffer();
            await this.localConnection.setLocalDescription(offer);
            
            // Send connection request through existing peers
            this.broadcastMessage({
                type: 'PEER_CONNECT',
                targetPeer: peerId,
                fromPeer: this.nodeId,
                offer: offer,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error(`Failed to connect to peer ${peerId}:`, error);
        }
    }

    /**
     * Establish WebRTC connection
     * @param {string} peerId Peer ID
     * @param {Object} offer WebRTC offer
     */
    async establishWebRTCConnection(peerId, offer) {
        try {
            const peerConnection = new RTCPeerConnection(this.rtcConfig);
            
            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            // Store connection
            this.connections.set(peerId, peerConnection);
            
            console.log(`WebRTC connection established with ${peerId}`);
        } catch (error) {
            console.error(`Failed to establish WebRTC connection with ${peerId}:`, error);
        }
    }

    /**
     * Add file to the network
     * @param {string} fileId File identifier
     * @param {Object} fileData File data and metadata
     */
    addFile(fileId, fileData) {
        // Split file into chunks for efficient transfer
        const chunks = this.splitFileIntoChunks(fileData.content);
        
        this.files.set(fileId, {
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            contentHash: fileData.contentHash,
            chunks: chunks,
            uploadTime: Date.now()
        });
        
        console.log(`File ${fileId} added to network`);
        
        // Announce file availability to peers
        this.announceFileAvailability(fileId, fileData);
    }

    /**
     * Request file from the network
     * @param {string} fileId File identifier
     * @returns {Promise<Object>} File data
     */
    async requestFile(fileId) {
        return new Promise((resolve, reject) => {
            // Check if file is already available locally
            if (this.files.has(fileId)) {
                resolve(this.files.get(fileId));
                return;
            }
            
            // Request file from peers
            const requestMessage = {
                type: 'FILE_REQUEST',
                fileId: fileId,
                requesterId: this.nodeId,
                timestamp: Date.now()
            };
            
            this.broadcastMessage(requestMessage);
            
            // Set timeout for file request
            const timeout = setTimeout(() => {
                reject(new Error(`File request timeout for ${fileId}`));
            }, 30000); // 30 seconds timeout
            
            // Store resolve function for when file is received
            this.downloadQueue.set(fileId, {
                resolve: resolve,
                reject: reject,
                timeout: timeout,
                startTime: Date.now()
            });
        });
    }

    /**
     * Split file into chunks for transfer
     * @param {ArrayBuffer} fileContent File content
     * @returns {Array} Array of chunks
     */
    splitFileIntoChunks(fileContent) {
        const chunkSize = 64 * 1024; // 64KB chunks
        const chunks = [];
        
        for (let i = 0; i < fileContent.byteLength; i += chunkSize) {
            const chunk = fileContent.slice(i, i + chunkSize);
            chunks.push({
                index: chunks.length,
                data: chunk,
                size: chunk.byteLength
            });
        }
        
        return chunks;
    }

    /**
     * Send file chunks to a peer
     * @param {WebSocket} ws WebSocket connection
     * @param {string} fileId File identifier
     * @param {Object} fileData File data
     */
    sendFileChunks(ws, fileId, fileData) {
        fileData.chunks.forEach((chunk, index) => {
            const chunkMessage = {
                type: 'FILE_CHUNK',
                fileId: fileId,
                chunkIndex: index,
                chunkData: Array.from(new Uint8Array(chunk.data)),
                isLast: index === fileData.chunks.length - 1,
                timestamp: Date.now()
            };
            
            // Add small delay between chunks to prevent overwhelming
            setTimeout(() => {
                this.sendMessage(ws, chunkMessage);
            }, index * 10);
        });
    }

    /**
     * Assemble file from received chunks
     * @param {string} fileId File identifier
     */
    assembleFile(fileId) {
        const chunks = this.fileChunks.get(fileId);
        const downloadInfo = this.downloadQueue.get(fileId);
        
        if (!chunks || !downloadInfo) {
            console.error(`Cannot assemble file ${fileId}: missing data`);
            return;
        }
        
        // Sort chunks by index and combine
        const sortedChunks = Array.from(chunks.entries())
            .sort(([a], [b]) => a - b)
            .map(([, data]) => data);
        
        // Combine chunks into file
        const totalSize = sortedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const fileBuffer = new ArrayBuffer(totalSize);
        const fileView = new Uint8Array(fileBuffer);
        
        let offset = 0;
        sortedChunks.forEach(chunk => {
            fileView.set(chunk, offset);
            offset += chunk.length;
        });
        
        // Create file object
        const assembledFile = {
            fileName: downloadInfo.fileName,
            fileSize: downloadInfo.fileSize,
            content: fileBuffer,
            contentHash: downloadInfo.contentHash,
            downloadTime: Date.now() - downloadInfo.startTime
        };
        
        // Store file locally
        this.files.set(fileId, assembledFile);
        
        // Resolve download promise
        if (downloadInfo.resolve) {
            downloadInfo.resolve(assembledFile);
            clearTimeout(downloadInfo.timeout);
        }
        
        // Cleanup
        this.fileChunks.delete(fileId);
        this.downloadQueue.delete(fileId);
        
        console.log(`File ${fileId} assembled successfully`);
    }

    /**
     * Announce file availability to peers
     * @param {string} fileId File identifier
     * @param {Object} fileData File metadata
     */
    announceFileAvailability(fileId, fileData) {
        const announcement = {
            type: 'FILE_AVAILABLE',
            fileId: fileId,
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            contentHash: fileData.contentHash,
            providerId: this.nodeId,
            timestamp: Date.now()
        };
        
        this.broadcastMessage(announcement);
    }

    /**
     * Request file from other peers
     * @param {string} fileId File identifier
     */
    requestFileFromPeers(fileId) {
        const requestMessage = {
            type: 'FILE_REQUEST',
            fileId: fileId,
            requesterId: this.nodeId,
            timestamp: Date.now()
        };
        
        this.broadcastMessage(requestMessage);
    }

    /**
     * Broadcast message to all connected peers
     * @param {Object} message Message to broadcast
     */
    broadcastMessage(message) {
        this.peers.forEach((peer) => {
            if (peer.connection && peer.connection.readyState === WebSocket.OPEN) {
                this.sendMessage(peer.connection, message);
            }
        });
    }

    /**
     * Send message to a specific connection
     * @param {WebSocket} connection WebSocket connection
     * @param {Object} message Message to send
     */
    sendMessage(connection, message) {
        try {
            if (connection && connection.readyState === WebSocket.OPEN) {
                connection.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    /**
     * Handle binary data (file chunks)
     * @param {ArrayBuffer} data Binary data
     */
    handleBinaryData(data) {
        // Handle binary file chunk data
        console.log('Received binary data:', data.byteLength, 'bytes');
    }

    /**
     * Get network statistics
     * @returns {Object} Network statistics
     */
    getNetworkStats() {
        return {
            nodeId: this.nodeId,
            isOnline: this.isOnline,
            connectedPeers: this.peers.size,
            availableFiles: this.files.size,
            activeDownloads: this.downloadQueue.size,
            activeUploads: this.uploadQueue.size,
            totalDataTransferred: this.getTotalDataTransferred(),
            uptime: this.isOnline ? Date.now() - this.startTime : 0
        };
    }

    /**
     * Get total data transferred
     * @returns {number} Total bytes transferred
     */
    getTotalDataTransferred() {
        // Calculate total data transferred (simplified)
        let total = 0;
        this.files.forEach(file => {
            total += file.fileSize || 0;
        });
        return total;
    }

    /**
     * Disconnect from the network
     */
    disconnect() {
        console.log('Disconnecting from P2P network');
        
        // Close all peer connections
        this.peers.forEach((peer) => {
            if (peer.connection) {
                peer.connection.close();
            }
        });
        
        // Close WebRTC connections
        this.connections.forEach((connection) => {
            connection.close();
        });
        
        // Clear data
        this.peers.clear();
        this.connections.clear();
        this.isOnline = false;
        
        console.log('Disconnected from P2P network');
    }

    /**
     * Get connected peers information
     * @returns {Array} Array of peer information
     */
    getConnectedPeers() {
        return Array.from(this.peers.entries()).map(([peerId, peer]) => ({
            nodeId: peerId,
            lastSeen: peer.lastSeen,
            status: peer.status,
            connectionType: peer.connection ? 'websocket' : 'webrtc'
        }));
    }

    /**
     * Get available files in the network
     * @returns {Array} Array of available files
     */
    getAvailableFiles() {
        return Array.from(this.files.entries()).map(([fileId, file]) => ({
            fileId: fileId,
            fileName: file.fileName,
            fileSize: file.fileSize,
            contentHash: file.contentHash,
            uploadTime: file.uploadTime
        }));
    }
}

export default P2PNetworkService;