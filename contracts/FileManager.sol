// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FileManager
 * @dev Manages file storage, versioning, and access control on a decentralized network.
 */
contract FileManager {
    // Represents a single version of a file, linking to its IPFS CID.
    struct FileVersion {
        string cid; // IPFS Content Identifier
        uint256 timestamp;
    }

    // Represents a file, including its history and ownership.
    struct File {
        string fileName;
        string fileType;
        uint256 currentVersion;
        mapping(uint256 => FileVersion) versions; // Version history
    }

    // State variables
    address public owner;
    mapping(address => mapping(uint256 => File)) private files;
    mapping(address => uint256) private fileCount;

    // Access control: fileId => userAddress => hasAccess
    mapping(bytes32 => mapping(address => bool)) public accessList;

    // Events
    event FileUploaded(
        address indexed user,
        uint256 fileId,
        string fileName,
        string cid,
        uint256 timestamp
    );
    event AccessGranted(
        bytes32 indexed fileId,
        address indexed user,
        address indexed grantedTo
    );
    event AccessRevoked(
        bytes32 indexed fileId,
        address indexed user,
        address indexed revokedFrom
    );

    /**
     * @dev Sets the contract deployer as the owner.
     */
    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Adds a new file or a new version of an existing file.
     * @param _fileName The name of the file.
     * @param _fileType The MIME type of the file.
     * @param _cid The IPFS CID of the file.
     */
    function addFile(
        string memory _fileName,
        string memory _fileType,
        string memory _cid
    ) public {
        // Search for existing file with the same name
        uint256 existingFileId = findFileByName(msg.sender, _fileName);
        
        if (existingFileId != type(uint256).max) {
            // File exists, add new version
            File storage existingFile = files[msg.sender][existingFileId];
            uint256 versionId = existingFile.currentVersion;
            existingFile.versions[versionId] = FileVersion(_cid, block.timestamp);
            existingFile.currentVersion++;
            emit FileUploaded(msg.sender, existingFileId, _fileName, _cid, block.timestamp);
        } else {
            // Create new file
            uint256 newFileId = fileCount[msg.sender];
            File storage newFile = files[msg.sender][newFileId];
            newFile.fileName = _fileName;
            newFile.fileType = _fileType;
            newFile.versions[0] = FileVersion(_cid, block.timestamp);
            newFile.currentVersion = 1;
            fileCount[msg.sender]++;
            emit FileUploaded(msg.sender, newFileId, _fileName, _cid, block.timestamp);
        }
    }

    /**
     * @dev Retrieves the latest version of a user's file.
     * @param _userAddress The address of the file owner.
     * @param _fileId The ID of the file.
     * @return The file name, file type, CID, and timestamp.
     */
    function getFile(address _userAddress, uint256 _fileId)
        public
        view
        returns (string memory, string memory, string memory, uint256)
    {
        bytes32 fileIdentifier = getFileIdentifier(_userAddress, _fileId);
        require(
            msg.sender == _userAddress || accessList[fileIdentifier][msg.sender],
            "Access denied"
        );
        File storage userFile = files[_userAddress][_fileId];
        uint256 latestVersion = userFile.currentVersion - 1;
        return (
            userFile.fileName,
            userFile.fileType,
            userFile.versions[latestVersion].cid,
            userFile.versions[latestVersion].timestamp
        );
    }

    /**
     * @dev Returns the total number of files for a user.
     */
    function getUserFileCount(address _userAddress)
        public
        view
        returns (uint256)
    {
        return fileCount[_userAddress];
    }

    /**
     * @dev Retrieves a specific version of a file.
     * @param _userAddress The address of the file owner.
     * @param _fileId The ID of the file.
     * @param _versionId The version ID to retrieve.
     * @return The CID and timestamp of the specified version.
     */
    function getFileVersion(address _userAddress, uint256 _fileId, uint256 _versionId)
        public
        view
        returns (string memory, uint256)
    {
        bytes32 fileIdentifier = getFileIdentifier(_userAddress, _fileId);
        require(
            msg.sender == _userAddress || accessList[fileIdentifier][msg.sender],
            "Access denied"
        );
        File storage userFile = files[_userAddress][_fileId];
        require(_versionId < userFile.currentVersion, "Version does not exist");
        return (
            userFile.versions[_versionId].cid,
            userFile.versions[_versionId].timestamp
        );
    }

    /**
     * @dev Returns the total number of versions for a specific file.
     * @param _userAddress The address of the file owner.
     * @param _fileId The ID of the file.
     * @return The total number of versions.
     */
    function getFileVersionCount(address _userAddress, uint256 _fileId)
        public
        view
        returns (uint256)
    {
        bytes32 fileIdentifier = getFileIdentifier(_userAddress, _fileId);
        require(
            msg.sender == _userAddress || accessList[fileIdentifier][msg.sender],
            "Access denied"
        );
        return files[_userAddress][_fileId].currentVersion;
    }

    /**
     * @dev Grants access to a file to another user.
     * @param _fileId The ID of the file.
     * @param _userToGrant The address to grant access to.
     */
    function grantAccess(uint256 _fileId, address _userToGrant) public {
        require(_userToGrant != msg.sender, "Cannot share with yourself");
        bytes32 fileIdentifier = getFileIdentifier(msg.sender, _fileId);
        accessList[fileIdentifier][_userToGrant] = true;
        emit AccessGranted(fileIdentifier, msg.sender, _userToGrant);
    }

    /**
     * @dev Revokes access to a file from another user.
     * @param _fileId The ID of the file.
     * @param _userToRevoke The address to revoke access from.
     */
    function revokeAccess(uint256 _fileId, address _userToRevoke) public {
        bytes32 fileIdentifier = getFileIdentifier(msg.sender, _fileId);
        accessList[fileIdentifier][_userToRevoke] = false;
        emit AccessRevoked(fileIdentifier, msg.sender, _userToRevoke);
    }

    /**
     * @dev Returns all file CIDs for the calling user.
     * @return Array of CIDs for all files owned by the caller.
     */
    function getMyFiles() public view returns (string[] memory) {
        uint256 count = fileCount[msg.sender];
        string[] memory cids = new string[](count);
        
        for (uint256 i = 0; i < count; i++) {
            File storage userFile = files[msg.sender][i];
            if (userFile.currentVersion > 0) {
                uint256 latestVersion = userFile.currentVersion - 1;
                cids[i] = userFile.versions[latestVersion].cid;
            }
        }
        
        return cids;
    }

    /**
     * @dev Finds a file by name for a specific user.
     * @param _user The user address.
     * @param _fileName The name of the file to search for.
     * @return The file ID if found, or type(uint256).max if not found.
     */
    function findFileByName(address _user, string memory _fileName)
        internal
        view
        returns (uint256)
    {
        uint256 count = fileCount[_user];
        for (uint256 i = 0; i < count; i++) {
            if (keccak256(abi.encodePacked(files[_user][i].fileName)) == keccak256(abi.encodePacked(_fileName))) {
                return i;
            }
        }
        return type(uint256).max; // Not found
    }

    /**
     * @dev Generates a unique identifier for a file to manage permissions.
     */
    function getFileIdentifier(address _user, uint256 _fileId)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(_user, _fileId));
    }
}
