// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title DecentralizedStorageManager
 * @dev Comprehensive smart contract for decentralized file storage with incentives
 */
contract DecentralizedStorageManager is Ownable, ReentrancyGuard {

    // Storage provider structure
    struct StorageProvider {
        address providerAddress;
        uint256 totalStorage; // in bytes
        uint256 usedStorage;
        uint256 reputation; // 0-1000 scale
        uint256 pricePerGB; // in wei per GB per day
        bool isActive;
        uint256 stakedAmount;
        uint256 joinedTimestamp;
        string nodeId; // IPFS node ID
        string region;
    }

    // File metadata structure
    struct FileMetadata {
        string fileId;
        string contentHash; // IPFS hash or content identifier
        address owner;
        uint256 fileSize;
        uint256 uploadTimestamp;
        uint256 lastAccessTimestamp;
        string encryptionKey; // encrypted with owner's public key
        bool isPublic;
        uint256 accessCount;
        string[] tags;
        mapping(address => bool) authorizedUsers;
        address[] storageProviders;
        uint256 replicationFactor;
    }

    // Storage contract structure
    struct StorageContract {
        string fileId;
        address provider;
        address client;
        uint256 duration; // in days
        uint256 pricePerDay;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 collateral;
        uint256 lastProofTime;
    }

    // Incentive pool structure
    struct IncentivePool {
        uint256 totalRewards;
        uint256 distributedRewards;
        uint256 rewardRate; // rewards per successful proof
        uint256 penaltyRate; // penalty for failed proofs
    }

    // State variables
    mapping(address => StorageProvider) public storageProviders;
    mapping(string => FileMetadata) public fileMetadata;
    mapping(bytes32 => StorageContract) public storageContracts;
    mapping(address => uint256) public userBalances;
    mapping(address => uint256) public providerEarnings;
    
    address[] public activeProviders;
    string[] public allFiles;
    IncentivePool public incentivePool;
    
    IERC20 public storageToken; // ERC20 token for payments
    uint256 public constant MIN_STAKE = 1000 * 10**18; // 1000 tokens
    uint256 public constant PROOF_INTERVAL = 1 days;
    uint256 public constant MAX_REPUTATION = 1000;
    
    // Events
    event ProviderRegistered(address indexed provider, string nodeId, uint256 stakedAmount);
    event FileUploaded(string indexed fileId, address indexed owner, uint256 fileSize);
    event StorageContractCreated(bytes32 indexed contractId, string fileId, address provider, address client);
    event ProofOfStorageSubmitted(bytes32 indexed contractId, address provider, bool success);
    event RewardDistributed(address indexed provider, uint256 amount);
    event PenaltyApplied(address indexed provider, uint256 amount);
    event FileAccessed(string indexed fileId, address indexed user);
    event ProviderSlashed(address indexed provider, uint256 amount, string reason);

    constructor(address _storageToken) Ownable(msg.sender) {
        storageToken = IERC20(_storageToken);
        incentivePool = IncentivePool({
            totalRewards: 0,
            distributedRewards: 0,
            rewardRate: 10 * 10**18, // 10 tokens per proof
            penaltyRate: 50 * 10**18  // 50 tokens penalty
        });
    }

    /**
     * @dev Register as a storage provider
     * @param _totalStorage Total storage capacity in bytes
     * @param _pricePerGB Price per GB per day in wei
     * @param _nodeId IPFS node identifier
     * @param _region Geographic region
     */
    function registerProvider(
        uint256 _totalStorage,
        uint256 _pricePerGB,
        string memory _nodeId,
        string memory _region
    ) external {
        require(_totalStorage > 0, "Storage capacity must be greater than 0");
        require(_pricePerGB > 0, "Price must be greater than 0");
        require(!storageProviders[msg.sender].isActive, "Provider already registered");
        
        // Stake tokens
        require(
            storageToken.transferFrom(msg.sender, address(this), MIN_STAKE),
            "Failed to stake tokens"
        );

        storageProviders[msg.sender] = StorageProvider({
            providerAddress: msg.sender,
            totalStorage: _totalStorage,
            usedStorage: 0,
            reputation: 500, // Start with medium reputation
            pricePerGB: _pricePerGB,
            isActive: true,
            stakedAmount: MIN_STAKE,
            joinedTimestamp: block.timestamp,
            nodeId: _nodeId,
            region: _region
        });

        activeProviders.push(msg.sender);
        emit ProviderRegistered(msg.sender, _nodeId, MIN_STAKE);
    }

    /**
     * @dev Upload file metadata to the contract
     * @param _fileId Unique file identifier
     * @param _contentHash IPFS content hash
     * @param _fileSize File size in bytes
     * @param _encryptionKey Encrypted encryption key
     * @param _isPublic Whether file is publicly accessible
     * @param _tags File tags for categorization
     * @param _replicationFactor Number of copies to maintain
     */
    function uploadFile(
        string memory _fileId,
        string memory _contentHash,
        uint256 _fileSize,
        string memory _encryptionKey,
        bool _isPublic,
        string[] memory _tags,
        uint256 _replicationFactor
    ) external {
        require(bytes(_fileId).length > 0, "File ID cannot be empty");
        require(bytes(_contentHash).length > 0, "Content hash cannot be empty");
        require(_fileSize > 0, "File size must be greater than 0");
        require(_replicationFactor > 0 && _replicationFactor <= 10, "Invalid replication factor");
        require(bytes(fileMetadata[_fileId].fileId).length == 0, "File already exists");

        FileMetadata storage newFile = fileMetadata[_fileId];
        newFile.fileId = _fileId;
        newFile.contentHash = _contentHash;
        newFile.owner = msg.sender;
        newFile.fileSize = _fileSize;
        newFile.uploadTimestamp = block.timestamp;
        newFile.lastAccessTimestamp = block.timestamp;
        newFile.encryptionKey = _encryptionKey;
        newFile.isPublic = _isPublic;
        newFile.accessCount = 0;
        newFile.tags = _tags;
        newFile.replicationFactor = _replicationFactor;

        allFiles.push(_fileId);
        emit FileUploaded(_fileId, msg.sender, _fileSize);

        // Automatically create storage contracts with best providers
        _createStorageContracts(_fileId, _replicationFactor);
    }

    /**
     * @dev Create storage contracts with selected providers
     * @param _fileId File identifier
     * @param _replicationFactor Number of providers needed
     */
    function _createStorageContracts(string memory _fileId, uint256 _replicationFactor) internal {
        address[] memory selectedProviders = _selectBestProviders(_replicationFactor, fileMetadata[_fileId].fileSize);
        
        for (uint256 i = 0; i < selectedProviders.length; i++) {
            address provider = selectedProviders[i];
            StorageProvider storage providerData = storageProviders[provider];
            
            bytes32 contractId = keccak256(abi.encodePacked(_fileId, provider, block.timestamp));
            uint256 duration = 365; // 1 year default
            uint256 pricePerDay = (providerData.pricePerGB * fileMetadata[_fileId].fileSize) / 10**9; // Convert to per day
            
            storageContracts[contractId] = StorageContract({
                fileId: _fileId,
                provider: provider,
                client: msg.sender,
                duration: duration,
                pricePerDay: pricePerDay,
                startTime: block.timestamp,
                endTime: block.timestamp + (duration * 1 days),
                isActive: true,
                collateral: pricePerDay * 30, // 30 days collateral
                lastProofTime: block.timestamp
            });

            // Update provider's used storage
            providerData.usedStorage = providerData.usedStorage + fileMetadata[_fileId].fileSize;
            fileMetadata[_fileId].storageProviders.push(provider);

            emit StorageContractCreated(contractId, _fileId, provider, msg.sender);
        }
    }

    /**
     * @dev Select best storage providers based on reputation, price, and availability
     * @param _count Number of providers to select
     * @param _fileSize Size of file to store
     * @return Array of selected provider addresses
     */
    function _selectBestProviders(uint256 _count, uint256 _fileSize) internal view returns (address[] memory) {
        require(_count <= activeProviders.length, "Not enough active providers");
        
        address[] memory availableProviders = new address[](activeProviders.length);
        uint256 availableCount = 0;
        
        // Filter available providers
        for (uint256 i = 0; i < activeProviders.length; i++) {
            address provider = activeProviders[i];
            StorageProvider storage providerData = storageProviders[provider];
            
            if (providerData.isActive && 
                providerData.totalStorage - providerData.usedStorage >= _fileSize) {
                availableProviders[availableCount] = provider;
                availableCount++;
            }
        }
        
        require(availableCount >= _count, "Not enough available storage capacity");
        
        // Simple selection based on reputation (in production, use more sophisticated algorithm)
        address[] memory selected = new address[](_count);
        for (uint256 i = 0; i < _count && i < availableCount; i++) {
            selected[i] = availableProviders[i];
        }
        
        return selected;
    }

    /**
     * @dev Submit proof of storage for a file
     * @param _contractId Storage contract identifier
     * @param _merkleProof Merkle proof of file possession
     * @param _challengeResponse Response to storage challenge
     */
    function submitProofOfStorage(
        bytes32 _contractId,
        bytes32[] memory _merkleProof,
        bytes32 _challengeResponse
    ) external {
        StorageContract storage storageContract = storageContracts[_contractId];
        require(storageContract.isActive, "Contract is not active");
        require(storageContract.provider == msg.sender, "Only provider can submit proof");
        require(
            block.timestamp >= storageContract.lastProofTime + PROOF_INTERVAL,
            "Proof submitted too early"
        );

        // Verify proof (simplified - in production, implement proper verification)
        bool proofValid = _verifyStorageProof(_merkleProof, _challengeResponse, storageContract.fileId);
        
        if (proofValid) {
            // Reward provider
            _rewardProvider(msg.sender, incentivePool.rewardRate);
            
            // Update reputation
            StorageProvider storage provider = storageProviders[msg.sender];
            if (provider.reputation < MAX_REPUTATION) {
                provider.reputation = provider.reputation + 1;
            }
            
            storageContract.lastProofTime = block.timestamp;
            emit ProofOfStorageSubmitted(_contractId, msg.sender, true);
        } else {
            // Penalize provider
            _penalizeProvider(msg.sender, incentivePool.penaltyRate);
            emit ProofOfStorageSubmitted(_contractId, msg.sender, false);
        }
    }

    /**
     * @dev Verify storage proof (simplified implementation)
     * @param _merkleProof Merkle proof
     * @param _challengeResponse Challenge response
     * @param _fileId File identifier
     * @return True if proof is valid
     */
    function _verifyStorageProof(
        bytes32[] memory _merkleProof,
        bytes32 _challengeResponse,
        string memory _fileId
    ) internal pure returns (bool) {
        // Simplified verification - in production, implement proper Merkle tree verification
        return _merkleProof.length > 0 && _challengeResponse != bytes32(0) && bytes(_fileId).length > 0;
    }

    /**
     * @dev Reward storage provider
     * @param _provider Provider address
     * @param _amount Reward amount
     */
    function _rewardProvider(address _provider, uint256 _amount) internal {
        require(incentivePool.totalRewards >= incentivePool.distributedRewards + _amount, "Insufficient reward pool");
        
        providerEarnings[_provider] = providerEarnings[_provider] + _amount;
        incentivePool.distributedRewards = incentivePool.distributedRewards + _amount;
        
        emit RewardDistributed(_provider, _amount);
    }

    /**
     * @dev Penalize storage provider
     * @param _provider Provider address
     * @param _amount Penalty amount
     */
    function _penalizeProvider(address _provider, uint256 _amount) internal {
        StorageProvider storage provider = storageProviders[_provider];
        
        if (provider.stakedAmount >= _amount) {
            provider.stakedAmount = provider.stakedAmount - _amount;
        } else {
            provider.stakedAmount = 0;
        }
        
        // Decrease reputation
        if (provider.reputation >= 10) {
            provider.reputation = provider.reputation >= 10 ? provider.reputation - 10 : 0;
        } else {
            provider.reputation = 0;
        }
        
        // Add to incentive pool
        incentivePool.totalRewards = incentivePool.totalRewards + _amount;
        
        emit PenaltyApplied(_provider, _amount);
    }

    /**
     * @dev Access a file (updates access statistics)
     * @param _fileId File identifier
     */
    function accessFile(string memory _fileId) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(bytes(file.fileId).length > 0, "File does not exist");
        require(
            file.isPublic || file.owner == msg.sender || file.authorizedUsers[msg.sender],
            "Access denied"
        );

        file.lastAccessTimestamp = block.timestamp;
        file.accessCount = file.accessCount + 1;
        
        emit FileAccessed(_fileId, msg.sender);
    }

    /**
     * @dev Grant access to a user for a specific file
     * @param _fileId File identifier
     * @param _user User address to grant access
     */
    function grantFileAccess(string memory _fileId, address _user) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(file.owner == msg.sender, "Only owner can grant access");
        
        file.authorizedUsers[_user] = true;
    }

    /**
     * @dev Revoke access from a user for a specific file
     * @param _fileId File identifier
     * @param _user User address to revoke access
     */
    function revokeFileAccess(string memory _fileId, address _user) external {
        FileMetadata storage file = fileMetadata[_fileId];
        require(file.owner == msg.sender, "Only owner can revoke access");
        
        file.authorizedUsers[_user] = false;
    }

    /**
     * @dev Withdraw earnings for storage providers
     */
    function withdrawEarnings() external nonReentrant {
        uint256 earnings = providerEarnings[msg.sender];
        require(earnings > 0, "No earnings to withdraw");
        
        providerEarnings[msg.sender] = 0;
        require(storageToken.transfer(msg.sender, earnings), "Transfer failed");
    }

    /**
     * @dev Add funds to incentive pool (only owner)
     * @param _amount Amount to add
     */
    function addToIncentivePool(uint256 _amount) external onlyOwner {
        require(
            storageToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );
        
        incentivePool.totalRewards = incentivePool.totalRewards + _amount;
    }

    /**
     * @dev Slash provider for misbehavior (only owner)
     * @param _provider Provider address
     * @param _amount Amount to slash
     * @param _reason Reason for slashing
     */
    function slashProvider(address _provider, uint256 _amount, string memory _reason) external onlyOwner {
        StorageProvider storage provider = storageProviders[_provider];
        require(provider.isActive, "Provider is not active");
        
        if (provider.stakedAmount >= _amount) {
            provider.stakedAmount = provider.stakedAmount - _amount;
        } else {
            provider.stakedAmount = 0;
        }
        
        // If stake falls below minimum, deactivate provider
        if (provider.stakedAmount < MIN_STAKE) {
            provider.isActive = false;
        }
        
        emit ProviderSlashed(_provider, _amount, _reason);
    }

    /**
     * @dev Get file information
     * @param _fileId File identifier
     * @return fileId The file identifier
     * @return contentHash The content hash of the file
     * @return owner The owner address
     * @return fileSize The size of the file
     * @return uploadTimestamp When the file was uploaded
     * @return isPublic Whether the file is public
     * @return accessCount Number of times accessed
     */
    function getFileInfo(string memory _fileId) external view returns (
        string memory fileId,
        string memory contentHash,
        address owner,
        uint256 fileSize,
        uint256 uploadTimestamp,
        bool isPublic,
        uint256 accessCount
    ) {
        FileMetadata storage file = fileMetadata[_fileId];
        return (
            file.fileId,
            file.contentHash,
            file.owner,
            file.fileSize,
            file.uploadTimestamp,
            file.isPublic,
            file.accessCount
        );
    }

    /**
     * @dev Get provider information
     * @param _provider Provider address
     * @return totalStorage Total storage capacity
     * @return usedStorage Currently used storage
     * @return reputation Provider reputation score
     * @return pricePerGB Price per GB in tokens
     * @return isActive Whether provider is active
     * @return stakedAmount Amount of tokens staked
     */
    function getProviderInfo(address _provider) external view returns (
        uint256 totalStorage,
        uint256 usedStorage,
        uint256 reputation,
        uint256 pricePerGB,
        bool isActive,
        uint256 stakedAmount
    ) {
        StorageProvider storage provider = storageProviders[_provider];
        return (
            provider.totalStorage,
            provider.usedStorage,
            provider.reputation,
            provider.pricePerGB,
            provider.isActive,
            provider.stakedAmount
        );
    }

    /**
     * @dev Get total number of files
     * @return Number of files
     */
    function getTotalFiles() external view returns (uint256) {
        return allFiles.length;
    }

    /**
     * @dev Get total number of active providers
     * @return Number of active providers
     */
    function getTotalProviders() external view returns (uint256) {
        return activeProviders.length;
    }

    /**
     * @dev Get incentive pool information
     * @return totalRewards Total rewards in the pool
     * @return distributedRewards Amount of rewards distributed
     * @return rewardRate Current reward rate
     * @return penaltyRate Current penalty rate
     */
    function getIncentivePoolInfo() external view returns (
        uint256 totalRewards,
        uint256 distributedRewards,
        uint256 rewardRate,
        uint256 penaltyRate
    ) {
        return (
            incentivePool.totalRewards,
            incentivePool.distributedRewards,
            incentivePool.rewardRate,
            incentivePool.penaltyRate
        );
    }
}
