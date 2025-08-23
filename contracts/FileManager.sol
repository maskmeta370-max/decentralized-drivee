// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract FileManager {
    struct File {
        uint id;
        string fileName;
        string fileCid;
        address owner;
    }

    mapping(address => File[]) private userFiles;
    uint nextFileId = 1;

    function addFile(string memory _fileName, string memory _fileCid) external {
        userFiles[msg.sender].push(
            File(nextFileId, _fileName, _fileCid, msg.sender)
        );
        nextFileId++;
    }

    function getMyFiles() external view returns (string[] memory) {
        File[] memory files = userFiles[msg.sender];
        string[] memory cids = new string[](files.length);

        for (uint i = 0; i < files.length; i++) {
            cids[i] = files[i].fileCid;
        }

        return cids;
    }
}