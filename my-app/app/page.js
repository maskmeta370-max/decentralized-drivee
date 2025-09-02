"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../hooks/useWallet';
import Globe3D from '../components/Globe3D';
import { useErrorHandler, safeAsync, ERROR_TYPES } from '../utils/errorHandler';

// Enhanced Feature Card Component
const FeatureCard = ({ icon, title, description, delay = 0, gradient, accentColor }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`group relative bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-8 hover:border-electric-cyan/40 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-electric-cyan/20 overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>
      
      {/* Floating particles on hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 ${accentColor} rounded-full animate-ping`}
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 200}ms`,
                animationDuration: '2s'
              }}
            ></div>
          ))}
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <div className={`text-electric-cyan text-4xl mb-6 transform transition-all duration-300 ${isHovered ? 'scale-110 rotate-12' : ''}`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-light-silver mb-4 group-hover:text-electric-cyan transition-colors duration-300">
          {title}
        </h3>
        <p className="text-light-silver/80 leading-relaxed group-hover:text-light-silver transition-colors duration-300">
          {description}
        </p>
        
        {/* Hover indicator */}
        <div className={`mt-6 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform ${isHovered ? 'translate-x-0' : 'translate-x-4'}`}>
          <span className="text-electric-cyan text-sm font-medium">Learn more</span>
          <svg className="w-4 h-4 text-electric-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// Enhanced Floating Particles Background
const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(80)].map((_, i) => {
        const seed = i * 789.123;
        const left = ((seed * 9301 + 49297) % 233280) / 2332.8;
        const top = ((seed * 9301 + 49297 + 1000) % 233280) / 2332.8;
        const delay = ((seed * 9301 + 49297 + 2000) % 15000) / 1000;
        const duration = 15 + ((seed * 9301 + 49297 + 3000) % 25000) / 1000;
        const size = 1 + ((seed * 9301 + 49297 + 4000) % 3);
        
        return (
          <div
            key={i}
            className={`absolute bg-electric-cyan/20 rounded-full animate-float`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
          ></div>
        );
      })}
    </div>
  );
};

// Stats Counter Component
const StatsCounter = ({ value, label, suffix = "", duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`counter-${label.replace(/\s+/g, '-')}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [label]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    const startValue = 0;
    const endValue = parseInt(value);

    const animate = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, duration]);

  return (
    <div id={`counter-${label.replace(/\s+/g, '-')}`} className="text-center">
      <div className="text-4xl lg:text-5xl font-bold text-electric-cyan mb-2">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-light-silver/80 text-lg">{label}</div>
    </div>
  );
};

// Testimonial Component
const TestimonialCard = ({ quote, author, role, avatar, delay = 0 }) => {
  return (
    <div 
      className="bg-gradient-to-br from-space-indigo/60 to-purple-900/40 backdrop-blur-sm border border-electric-cyan/20 rounded-2xl p-8 hover:border-electric-cyan/40 transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-electric-cyan to-blue-400 rounded-full flex items-center justify-center text-space-indigo font-bold text-lg">
          {avatar}
        </div>
        <div className="ml-4">
          <h4 className="text-light-silver font-semibold">{author}</h4>
          <p className="text-light-silver/60 text-sm">{role}</p>
        </div>
      </div>
      <blockquote className="text-light-silver/90 italic leading-relaxed">
        "{quote}"
      </blockquote>
      <div className="flex text-electric-cyan mt-4">
        {[...Array(5)].map((_, i) => (
          <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
};

// Enhanced CTA Section
const CTASection = ({ onEnterVault, isLoading, errorMessage }) => {
  return (
    <section className="relative py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative">
          {/* Glowing orb background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 bg-electric-cyan/10 rounded-full blur-3xl animate-pulse"></div>
          </div>
          
          <div className="relative z-10">
            <h2 className="text-4xl lg:text-6xl font-bold text-light-silver mb-8 leading-tight">
              Ready to Secure Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan via-blue-400 to-purple-400">
                Digital Future?
              </span>
            </h2>
            
            <p className="text-xl text-light-silver/80 mb-12 max-w-2xl mx-auto leading-relaxed">
              Join thousands of users who have already secured their data with military-grade encryption 
              and blockchain technology.
            </p>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="max-w-md mx-auto bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-400 text-sm">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Enhanced CTA Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={onEnterVault}
                disabled={isLoading}
                className="group relative px-12 py-5 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-bold text-xl rounded-2xl hover:shadow-2xl hover:shadow-electric-cyan/40 transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="relative z-10 flex items-center space-x-3">
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-space-indigo border-t-transparent rounded-full animate-spin"></div>
                      <span>Initializing Vault...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Enter Your Vault</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-electric-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
              
              <button className="px-8 py-4 border-2 border-electric-cyan/50 text-electric-cyan font-semibold text-lg rounded-xl hover:bg-electric-cyan/10 hover:border-electric-cyan transition-all duration-300">
                Watch Demo
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex items-center justify-center space-x-8 text-light-silver/60">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">256-bit Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Zero Knowledge</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Decentralized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const { account, connectWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [scrollY, setScrollY] = useState(0);
  const { handleAsync, clearError } = useErrorHandler();

  useEffect(() => {
    setIsClient(true);
    
    if (account) {
      router.push('/dashboard');
    }

    // Parallax scroll effect
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [account, router]);

  const handleEnterVault = async () => {
    clearError();
    setErrorMessage('');
    
    await handleAsync(async () => {
      setIsLoading(true);
      
      await safeAsync(async () => {
        await connectWallet();
      }, {
        context: { operation: 'connect_wallet' },
        operationId: 'connect_wallet_main',
        retry: true,
        retryOptions: { maxRetries: 2, delay: 1000 }
      });
    }, {
      context: { operation: 'connect_wallet' },
      onError: (error) => {
        setErrorMessage(error.userMessage || 'Failed to connect wallet. Please try again.');
      },
      onFinally: () => {
        setIsLoading(false);
      }
    });
  };

  const features = [
    {
      icon: "🔒",
      title: "Military-Grade Encryption",
      description: "Your files are encrypted with AES-256 encryption before leaving your device. Only you hold the keys to your data.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      accentColor: "bg-blue-400"
    },
    {
      icon: "🌐",
      title: "Decentralized Network",
      description: "Files are distributed across IPFS nodes worldwide, eliminating single points of failure and ensuring 99.9% uptime.",
      gradient: "from-green-500/20 to-emerald-500/20",
      accentColor: "bg-green-400"
    },
    {
      icon: "⚡",
      title: "Lightning Fast Access",
      description: "Retrieve your files instantly from the nearest network node with intelligent caching and optimization.",
      gradient: "from-yellow-500/20 to-orange-500/20",
      accentColor: "bg-yellow-400"
    },
    {
      icon: "🛡️",
      title: "Zero-Knowledge Privacy",
      description: "We never see your data. Client-side encryption ensures complete privacy and data sovereignty.",
      gradient: "from-purple-500/20 to-pink-500/20",
      accentColor: "bg-purple-400"
    },
    {
      icon: "🔄",
      title: "Version Control",
      description: "Track changes, revert to previous versions, and collaborate with built-in version control system.",
      gradient: "from-indigo-500/20 to-blue-500/20",
      accentColor: "bg-indigo-400"
    },
    {
      icon: "🤖",
      title: "AI-Powered Insights",
      description: "Analyze your documents with local AI processing. Get summaries, extract insights, all while keeping data private.",
      gradient: "from-red-500/20 to-pink-500/20",
      accentColor: "bg-red-400"
    }
  ];

  const testimonials = [
    {
      quote: "DecentralVault has revolutionized how I store sensitive documents. The encryption is seamless and I finally own my data.",
      author: "Sarah Chen",
      role: "Cybersecurity Consultant",
      avatar: "SC"
    },
    {
      quote: "As a developer, I love the technical architecture. IPFS + blockchain + client-side encryption is the perfect combination.",
      author: "Marcus Rodriguez",
      role: "Blockchain Developer",
      avatar: "MR"
    },
    {
      quote: "The AI features are incredible. I can analyze my research papers without worrying about data leaving my device.",
      author: "Dr. Emily Watson",
      role: "Research Scientist",
      avatar: "EW"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-indigo via-purple-900/20 to-space-indigo relative overflow-hidden">
      {/* Enhanced Floating Particles Background */}
      {isClient && <FloatingParticles />}
      
      {/* Dynamic Cosmic Background */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-electric-cyan/10 via-transparent to-purple-500/10"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        ></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.15),transparent_70%)] animate-pulse"></div>
        
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.1}px)`
          }}></div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:p-8 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-electric-cyan rounded-xl flex items-center justify-center">
              <span className="text-space-indigo font-bold text-xl">D</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <span className="text-light-silver font-bold text-2xl">DecentralVault</span>
            <div className="text-electric-cyan text-xs font-medium">Web3 Storage</div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-light-silver/80 hover:text-electric-cyan transition-colors duration-300">Features</a>
          <a href="#security" className="text-light-silver/80 hover:text-electric-cyan transition-colors duration-300">Security</a>
          <a href="#testimonials" className="text-light-silver/80 hover:text-electric-cyan transition-colors duration-300">Reviews</a>
          <button
            onClick={handleEnterVault}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-electric-cyan to-blue-400 text-space-indigo font-semibold rounded-xl hover:shadow-lg hover:shadow-electric-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connecting...' : 'Launch App'}
          </button>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
        {/* 3D Animated Globe with enhanced effects */}
        <div className="mb-16 animate-fade-in relative">
          <div className="absolute inset-0 rounded-full bg-electric-cyan opacity-20 blur-3xl animate-pulse" style={{ width: '400px', height: '400px', margin: '0 auto' }}></div>
          <div className="relative">
            <Globe3D />
            {/* Orbital rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[500px] h-[500px] border border-electric-cyan/20 rounded-full animate-spin" style={{ animationDuration: '20s' }}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[600px] h-[600px] border border-purple-400/10 rounded-full animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}></div>
            </div>
          </div>
        </div>

        {/* Enhanced Hero Text */}
        <div className="max-w-5xl mx-auto mb-16 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h1 className="text-6xl lg:text-8xl font-bold text-light-silver mb-8 leading-tight">
            The Future of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-electric-cyan via-blue-400 to-purple-400 animate-gradient">
              Digital Storage
            </span>
            <span className="block text-4xl lg:text-5xl text-light-silver/80 font-normal mt-4">
              is Decentralized
            </span>
          </h1>
          <p className="text-xl lg:text-2xl text-light-silver/80 mb-12 leading-relaxed max-w-4xl mx-auto">
            Store, share, and manage your files on the decentralized web with 
            <span className="text-electric-cyan font-semibold"> military-grade encryption</span>, 
            <span className="text-purple-400 font-semibold"> blockchain security</span>, and 
            <span className="text-blue-400 font-semibold"> AI-powered insights</span>.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <StatsCounter value="10000" label="Files Secured" suffix="+" />
          <StatsCounter value="99.9" label="Uptime" suffix="%" />
          <StatsCounter value="256" label="Bit Encryption" />
          <StatsCounter value="50" label="Global Nodes" suffix="+" />
        </div>

        {/* Enhanced CTA */}
        <CTASection 
          onEnterVault={handleEnterVault}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold text-light-silver mb-8">
              Built for the <span className="text-electric-cyan">Future</span>
            </h2>
            <p className="text-xl text-light-silver/80 max-w-3xl mx-auto leading-relaxed">
              Experience next-generation storage technology that puts you in complete control of your digital assets.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
                accentColor={feature.accentColor}
                delay={index * 200}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 py-32 px-6 bg-gradient-to-r from-space-indigo/50 to-purple-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-light-silver mb-8">
                Security That <span className="text-electric-cyan">Never Sleeps</span>
              </h2>
              <p className="text-xl text-light-silver/80 mb-8 leading-relaxed">
                Your data is protected by multiple layers of security, from client-side encryption to blockchain immutability.
              </p>
              
              <div className="space-y-6">
                {[
                  { icon: "🔐", title: "End-to-End Encryption", desc: "Files encrypted before upload" },
                  { icon: "🌍", title: "Global Distribution", desc: "Redundant storage across nodes" },
                  { icon: "⛓️", title: "Blockchain Verified", desc: "Immutable ownership records" },
                  { icon: "🔍", title: "Zero Knowledge", desc: "We never see your data" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-electric-cyan/5 rounded-xl border border-electric-cyan/10 hover:border-electric-cyan/30 transition-all duration-300">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <h3 className="text-light-silver font-semibold">{item.title}</h3>
                      <p className="text-light-silver/60 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              {/* Security visualization */}
              <div className="relative w-full h-96 bg-gradient-to-br from-electric-cyan/10 to-purple-500/10 rounded-3xl border border-electric-cyan/20 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-electric-cyan/20 rounded-full animate-pulse"></div>
                </div>
                
                {/* Concentric security rings */}
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 border border-electric-cyan/20 rounded-full animate-spin"
                    style={{
                      width: `${200 + i * 50}px`,
                      height: `${200 + i * 50}px`,
                      margin: 'auto',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      animationDuration: `${10 + i * 5}s`,
                      animationDirection: i % 2 === 0 ? 'normal' : 'reverse'
                    }}
                  ></div>
                ))}
                
                {/* Security badges */}
                <div className="absolute top-4 left-4 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <span className="text-green-400 text-sm font-medium">🛡️ Secured</span>
                </div>
                <div className="absolute top-4 right-4 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <span className="text-blue-400 text-sm font-medium">🔒 Encrypted</span>
                </div>
                <div className="absolute bottom-4 left-4 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <span className="text-purple-400 text-sm font-medium">⛓️ Verified</span>
                </div>
                <div className="absolute bottom-4 right-4 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                  <span className="text-cyan-400 text-sm font-medium">🌐 Distributed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-light-silver mb-8">
              Trusted by <span className="text-electric-cyan">Innovators</span>
            </h2>
            <p className="text-xl text-light-silver/80 max-w-2xl mx-auto">
              See what our users are saying about their experience with DecentralVault.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                avatar={testimonial.avatar}
                delay={index * 300}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="relative z-10 py-16 px-6 border-t border-electric-cyan/20 bg-gradient-to-r from-space-indigo/80 to-purple-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-electric-cyan rounded-xl flex items-center justify-center">
                  <span className="text-space-indigo font-bold text-xl">D</span>
                </div>
                <span className="text-light-silver font-bold text-2xl">DecentralVault</span>
              </div>
              <p className="text-light-silver/80 leading-relaxed max-w-md">
                The most secure and private way to store your files on the decentralized web. 
                Built with cutting-edge Web3 technology.
              </p>
              <div className="flex items-center space-x-4 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-light-silver/60 text-sm">Network Online</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-light-silver/60 text-sm">50+ Nodes Active</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-light-silver font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-light-silver/60">
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-light-silver font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-light-silver/60">
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Tutorials</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-electric-cyan transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-electric-cyan/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-light-silver/60 text-sm">
              &copy; 2024 DecentralVault. Powered by IPFS, Ethereum, and Web3 technology.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-light-silver/60 hover:text-electric-cyan transition-colors">Privacy</a>
              <a href="#" className="text-light-silver/60 hover:text-electric-cyan transition-colors">Terms</a>
              <a href="#" className="text-light-silver/60 hover:text-electric-cyan transition-colors">Status</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Enhanced Custom Styles */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
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
            opacity: 0.4;
          }
          25% {
            transform: translateY(-20px) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) rotate(180deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-30px) rotate(270deg);
            opacity: 0.6;
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
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
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