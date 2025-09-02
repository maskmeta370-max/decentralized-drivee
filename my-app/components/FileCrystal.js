import React, { useState, useEffect } from 'react';

const FileCrystal = ({ fileName, fileSize, fileType, index = 0, viewMode = 'grid' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get file type icon and color
  const getFileTypeInfo = (type) => {
    const extension = type?.toLowerCase() || fileName?.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return { icon: '📄', color: 'from-red-500 to-red-700', glow: 'shadow-red-500/30' };
      case 'doc':
      case 'docx':
        return { icon: '📝', color: 'from-blue-500 to-blue-700', glow: 'shadow-blue-500/30' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { icon: '🖼️', color: 'from-green-500 to-green-700', glow: 'shadow-green-500/30' };
      case 'mp4':
      case 'avi':
      case 'mov':
        return { icon: '🎬', color: 'from-purple-500 to-purple-700', glow: 'shadow-purple-500/30' };
      case 'mp3':
      case 'wav':
      case 'flac':
        return { icon: '🎵', color: 'from-pink-500 to-pink-700', glow: 'shadow-pink-500/30' };
      case 'zip':
      case 'rar':
      case '7z':
        return { icon: '📦', color: 'from-yellow-500 to-yellow-700', glow: 'shadow-yellow-500/30' };
      case 'txt':
        return { icon: '📋', color: 'from-gray-500 to-gray-700', glow: 'shadow-gray-500/30' };
      default:
        return { icon: '💎', color: 'from-electric-cyan to-blue-500', glow: 'shadow-electric-cyan/30' };
    }
  };

  const { icon, color, glow } = getFileTypeInfo(fileType);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Animation delay based on index to create staggered effect
  const animationDelay = isClient ? `${(index % 10) * 100}ms` : '0ms';
  const floatDelay = isClient ? `${(index % 5) * 0.5}s` : '0s';

  if (viewMode === 'list') {
    return (
      <div 
        className={`group relative bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-4 hover:border-electric-cyan/40 transition-all duration-500 hover:shadow-lg ${glow} cursor-pointer transform hover:scale-105`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ animationDelay }}
      >
        <div className="flex items-center space-x-4">
          {/* File Icon */}
          <div className={`relative w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-2xl transform transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}>
            {icon}
            {isHovered && (
              <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse"></div>
            )}
          </div>
          
          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-light-silver font-medium truncate group-hover:text-electric-cyan transition-colors duration-300">
              {fileName}
            </h3>
            <p className="text-light-silver/60 text-sm">
              {formatFileSize(fileSize)}
            </p>
          </div>
          
          {/* Action Indicator */}
          <div className={`w-2 h-2 bg-electric-cyan rounded-full transition-all duration-300 ${isHovered ? 'scale-150 animate-pulse' : 'scale-100'}`}></div>
        </div>
      </div>
    );
  }

  // Grid view (3D Crystal)
  return (
    <div 
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay }}
    >
      {/* Floating Crystal Container */}
      <div 
        className={`relative w-32 h-32 mx-auto transform transition-all duration-700 hover:scale-110 ${isHovered ? 'rotate-y-12' : ''}`}
        style={{ 
          animation: isClient ? `float 6s ease-in-out infinite` : 'none',
          animationDelay: floatDelay,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Glow Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-2xl blur-xl opacity-30 scale-75 group-hover:opacity-50 group-hover:scale-90 transition-all duration-500`}></div>
        
        {/* Main Crystal */}
        <div className={`relative w-full h-full bg-gradient-to-br ${color} rounded-2xl border border-white/20 shadow-2xl ${glow} transform transition-all duration-500 group-hover:shadow-2xl overflow-hidden`}>
          {/* Crystal Facets */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-br from-white/30 to-transparent rounded-t-2xl"></div>
            <div className="absolute top-1/3 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-white/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-2/3 h-1/3 bg-gradient-to-tr from-white/10 to-transparent rounded-bl-2xl"></div>
          </div>
          
          {/* File Type Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-4xl transform transition-all duration-500 ${isHovered ? 'scale-125 rotate-12' : ''}`}>
              {icon}
            </div>
          </div>
          
          {/* Shine Effect */}
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 translate-x-full animate-shine"></div>
          )}
        </div>
        
        {/* Floating Particles */}
        {isHovered && isClient && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 bg-gradient-to-r ${color} rounded-full animate-ping`}
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 200}ms`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        )}
      </div>
      
      {/* File Info */}
      <div className="mt-4 text-center">
        <h3 className={`text-light-silver font-medium text-sm truncate transition-colors duration-300 ${isHovered ? 'text-electric-cyan' : ''}`}>
          {fileName}
        </h3>
        <p className="text-light-silver/60 text-xs mt-1">
          {formatFileSize(fileSize)}
        </p>
      </div>
    </div>
  );
};

export default FileCrystal;
