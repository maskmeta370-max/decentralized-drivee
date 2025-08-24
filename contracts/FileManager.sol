// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract FileManager {
    // Mapping from user address to their files (CIDs)
    mapping(address => string[]) private userFiles;

    /**
     * @dev Add a file to the user's collection
     * @param _fileName The name of the file (not stored on-chain)
     * @param _fileCid The IPFS Content Identifier of the file
     */
    function addFile(string memory _fileName, string memory _fileCid) public {
        // We don't actually store the file name on-chain, just the CID
        // The file name is used in the frontend
        userFiles[msg.sender].push(_fileCid);
    }

    /**
     * @dev Get all files owned by the caller
     * @return An array of file CIDs
     */
    function getMyFiles() public view returns (string[] memory) {
        return userFiles[msg.sender];
    }
}