// File: app/page.js

'use client'
import { useState } from 'react'
import { ethers } from 'ethers'
import axios from 'axios' // Axios ko import karo

export default function Home() {
  const [account, setAccount] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false); // Loading state ke liye

  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (error) {
        console.error("User ne request reject kar di", error);
      }
    } else {
      alert("Bhai, pehle MetaMask install kar lo!");
    }
  }

  async function handleUpload() {
    if (!file) {
      alert("Pehle ek file select karo!");
      return;
    }

    setUploading(true); // Uploading shuru

    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();
    data.append('file', file);

    try {
      const res = await axios.post(url, data, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
          'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
          'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY
        }
      });

      console.log("File uploaded successfully:", res.data);
      alert(`File Uploaded to IPFS! CID: ${res.data.IpfsHash}`);
      // **AGLA STEP:** Yahan hum is CID ko smart contract mein save karenge.

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("File upload mein error aaya.");
    } finally {
      setUploading(false); // Uploading khatam
    }
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>My Decentralized Drive</h1>

      {!account ? (
        <button onClick={connectWallet} style={{ padding: '12px 24px', fontSize: '18px', cursor: 'pointer' }}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <h3>Wallet Connected!</h3>
          <p style={{ color: '#555', wordWrap: 'break-word' }}>{account}</p>
          <hr style={{ margin: '30px 0' }} />

          <h2>Upload a New File</h2>

          <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'block', margin: '20px auto' }} />

          <button
            onClick={handleUpload}
            disabled={uploading} // Disable button jab uploading ho rahi ho
            style={{ padding: '12px 24px', fontSize: '18px', cursor: 'pointer', background: uploading ? '#ccc' : '#007bff', color: 'white', border: 'none' }}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      )}
    </div>
  )
}