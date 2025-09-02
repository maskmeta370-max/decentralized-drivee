"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import Globe3D from '../components/Globe3D';



// Feature Card Component
const FeatureCard = ({ icon, title, description, delay = 0 }) => {
  return (
    <div 
      className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6 hover:border-electric-cyan/40 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-lg hover:shadow-electric-cyan/20"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-electric-cyan text-3xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-light-silver mb-3">{title}</h3>
      <p className="text-light-silver/80 leading-relaxed">{description}</p>
    </div>
  );
};

// Floating Particles Background
const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(50)].map((_, i) => {
        // Generate consistent values for each particle
        const seed = i * 789.123; // Use index as seed for consistency
        const left = ((seed * 9301 + 49297) % 233280) / 2332.8; // Pseudo-random but consistent
        const top = ((seed * 9301 + 49297 + 1000) % 233280) / 2332.8;
        const delay = ((seed * 9301 + 49297 + 2000) % 10000) / 1000;
        const duration = 10 + ((seed * 9301 + 49297 + 3000) % 20000) / 1000;
        
        return (
          <div
            key={i}
            className="absolute w-1 h-1 bg-electric-cyan/30 rounded-full animate-float"
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
  );
};

export default function LandingPage() {
  const router = useRouter();
  const { account, connectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client-side flag to prevent hydration mismatch
    setIsClient(true);
    
    if (account) {
      router.push('/dashboard');
    }
  }, [account, router]);

  const handleEnterVault = async () => {
    setIsLoading(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo relative overflow-hidden">
      {/* Floating Particles Background - Client-side only */}
      {isClient && <FloatingParticles />}
      
      {/* Cosmic Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-cyan/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_50%)] animate-pulse"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-electric-cyan rounded-lg flex items-center justify-center">
            <span className="text-space-indigo font-bold text-lg">D</span>
          </div>
          <span className="text-light-silver font-semibold text-xl">DecentralVault</span>
        </div>
        
        <button
          onClick={handleEnterVault}
          disabled={isLoading}
          className="px-6 py-2 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-lg hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        {/* 3D Animated Globe */}
        <div className="mb-12 animate-fade-in relative">
          {/* Outer glow effect */}
          <div className="absolute inset-0 rounded-full bg-electric-cyan opacity-20 blur-xl animate-pulse" style={{ width: '384px', height: '384px', margin: '0 auto' }}></div>
          <Globe3D />
        </div>

        {/* Hero Text */}
        <div className="max-w-4xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h1 className="text-5xl lg:text-7xl font-bold text-light-silver mb-6 leading-tight">
            Your Secure
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan to-blue-400">
              Web3 Digital Vault
            </span>
          </h1>
          <p className="text-xl lg:text-2xl text-light-silver/80 mb-8 leading-relaxed">
            Store, share, and manage your files on the decentralized web with 
            <br className="hidden lg:block" />
            military-grade encryption and blockchain security.
          </p>
        </div>

        {/* CTA Button */}
        <div className="animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <button
            onClick={handleEnterVault}
            disabled={isLoading}
            className="group relative px-12 py-4 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-bold text-lg rounded-full hover:shadow-2xl hover:shadow-electric-cyan/40 transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10">
              {isLoading ? 'Initializing Vault...' : 'Enter Your Vault'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-electric-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-bold text-center text-light-silver mb-16">
            Why Choose <span className="text-electric-cyan">DecentralVault</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon="🔒"
              title="Decentralized Storage"
              description="Your files are distributed across the IPFS network, ensuring no single point of failure."
              delay={0}
            />
            <FeatureCard
              icon="🛡️"
              title="Client-side Encryption"
              description="Files are encrypted on your device before upload, ensuring only you have access."
              delay={200}
            />
            <FeatureCard
              icon="🌍"
              title="Global Access"
              description="Access your files from anywhere in the world with just your wallet connection."
              delay={400}
            />
            <FeatureCard
              icon="👑"
              title="Data Ownership"
              description="You own your data completely. No corporate servers, no data mining, no surveillance."
              delay={600}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-electric-cyan/20">
        <div className="max-w-6xl mx-auto text-center text-light-silver/60">
          <p>&copy; 2024 DecentralVault. Powered by IPFS, Ethereum, and Web3 technology.</p>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes orbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}