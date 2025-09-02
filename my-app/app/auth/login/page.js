"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../../hooks/useWallet';

// MetaMask Installation Component
const MetaMaskInstallPrompt = () => {
  return (
    <div className="text-center p-8 bg-gradient-to-br from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-xl">
      <div className="text-6xl mb-4">🦊</div>
      <h3 className="text-2xl font-bold text-light-silver mb-4">MetaMask Required</h3>
      <p className="text-light-silver/80 mb-6">
        MetaMask is required to access your decentralized vault. Please install it to continue.
      </p>
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 transform hover:scale-105"
      >
        Install MetaMask
      </a>
    </div>
  );
};

// Connection Status Component
const ConnectionStatus = ({ status, address }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-light-silver/60';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '✅';
      case 'connecting': return '🔄';
      case 'error': return '❌';
      default: return '⚪';
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2 mb-6">
      <span className="text-xl">{getStatusIcon()}</span>
      <span className={`font-medium ${getStatusColor()}`}>
        {status === 'connected' && address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` :
         status === 'connecting' ? 'Connecting to MetaMask...' :
         status === 'error' ? 'Connection failed' :
         'Not connected'}
      </span>
    </div>
  );
};

// Network Status Component
const NetworkStatus = ({ isCorrectNetwork }) => {
  return (
    <div className="flex items-center justify-center space-x-2 mb-4">
      <div className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
      <span className="text-sm text-light-silver/80">
        {isCorrectNetwork ? 'Connected to correct network' : 'Please switch to the correct network'}
      </span>
    </div>
  );
};

export default function LoginPage() {
  const router = useRouter();
  const { account, connectWallet, disconnectWallet, isInitialized } = useWallet();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [error, setError] = useState('');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client-side flag to prevent hydration mismatch
    setIsClient(true);
    
    // Check if MetaMask is installed
    setIsMetaMaskInstalled(typeof window !== 'undefined' && typeof window.ethereum !== 'undefined');
  }, []);

  useEffect(() => {
    // Only redirect after wallet initialization is complete
    if (isInitialized && account) {
      router.push('/dashboard');
    }
  }, [account, router, isInitialized]);

  // Show loading state while wallet is initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900 to-space-indigo flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-cyan/30 border-t-electric-cyan rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-silver">Initializing wallet connection...</p>
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      setError('MetaMask is not installed. Please install it first.');
      return;
    }

    setConnectionStatus('connecting');
    setError('');

    try {
      await connectWallet();
      setConnectionStatus('connected');
      // Redirect will happen automatically via useEffect when account changes
    } catch (err) {
      setConnectionStatus('error');
      setError(err.message || 'Failed to connect to MetaMask');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
      setConnectionStatus('disconnected');
    } catch (err) {
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-cyan/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)] animate-pulse"></div>
      </div>

      {/* Floating Particles - Client-side only to prevent hydration mismatch */}
      {typeof window !== 'undefined' && isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => {
            // Generate consistent values for each particle
            const seed = i * 123.456; // Use index as seed for consistency
            const left = ((seed * 9301 + 49297) % 233280) / 2332.8; // Pseudo-random but consistent
            const top = ((seed * 9301 + 49297 + 1000) % 233280) / 2332.8;
            const delay = ((seed * 9301 + 49297 + 2000) % 5000) / 1000;
            const duration = 2 + ((seed * 9301 + 49297 + 3000) % 3000) / 1000;
            
            return (
              <div
                key={i}
                className="absolute w-1 h-1 bg-electric-cyan/20 rounded-full animate-pulse"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }}
              ></div>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-electric-cyan rounded-xl flex items-center justify-center">
              <span className="text-space-indigo font-bold text-2xl">D</span>
            </div>
            <span className="text-light-silver font-bold text-2xl">DecentralVault</span>
          </div>
          <h1 className="text-3xl font-bold text-light-silver mb-2">Access Your Vault</h1>
          <p className="text-light-silver/80">Connect your wallet to enter the decentralized storage platform</p>
        </div>

        {/* Connection Status */}
        <ConnectionStatus status={connectionStatus} address={account} />
        
        {/* Network Status */}
        {account && <NetworkStatus isCorrectNetwork={isCorrectNetwork} />}

        {/* Main Card */}
        <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-8 shadow-2xl">
          {!isMetaMaskInstalled ? (
            <MetaMaskInstallPrompt />
          ) : (
            <div className="space-y-6">
              {/* Security Badge */}
              <div className="flex items-center justify-center space-x-2 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <span className="text-green-400 text-lg">🛡️</span>
                <span className="text-green-400 font-medium text-sm">Secure Web3 Connection</span>
              </div>

              {/* Connect Button */}
              {!account ? (
                <button
                  onClick={handleConnect}
                  disabled={connectionStatus === 'connecting'}
                  className="w-full py-4 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-bold text-lg rounded-xl hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                >
                  {connectionStatus === 'connecting' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-space-indigo border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🦊</span>
                      <span>Connect with MetaMask</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                    <div className="text-green-400 text-2xl mb-2">✅</div>
                    <p className="text-green-400 font-medium">Wallet Connected Successfully!</p>
                    <p className="text-light-silver/80 text-sm mt-1">Redirecting to dashboard...</p>
                  </div>
                  
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400 text-lg">⚠️</span>
                    <span className="text-red-400 font-medium">Connection Error</span>
                  </div>
                  <p className="text-red-400/80 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Help Text */}
              <div className="text-center text-light-silver/60 text-sm space-y-2">
                <p>New to Web3? <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer" className="text-electric-cyan hover:underline">Learn about MetaMask</a></p>
                <p>Your wallet address is your login - no passwords needed!</p>
              </div>
            </div>
          )}
        </div>

        {/* Back to Landing */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/')}
            className="text-light-silver/60 hover:text-electric-cyan transition-colors duration-300 text-sm"
          >
            ← Back to Landing Page
          </button>
        </div>
      </div>
    </div>
  );
}