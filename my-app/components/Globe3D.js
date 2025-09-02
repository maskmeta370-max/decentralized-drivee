"use client";
import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Network Node Component positioned on Earth locations
const NetworkNode = ({ position, delay = 0, label }) => {
  const meshRef = useRef();
  const ringRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3 + delay) * 0.4;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime + delay;
      ringRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.2;
    }
  });
  
  return (
    <group position={position}>
      {/* Glowing node */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial
          color="#00FFFF"
          emissive="#00FFFF"
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* Pulsing ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.05, 0.08, 16]} />
        <meshBasicMaterial
          color="#00FFFF"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Data beam */}
      <mesh position={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.002, 0.002, 0.3]} />
        <meshBasicMaterial
          color="#00FFFF"
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
};

// Connection Line Component
const ConnectionLine = ({ start, end, delay = 0 }) => {
  const lineRef = useRef();
  
  useFrame((state) => {
    if (lineRef.current) {
      const opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.15;
      lineRef.current.material.opacity = Math.max(0.05, opacity);
    }
  });
  
  const points = useMemo(() => {
    // Create curved line between points
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2 + 0.5,
        (start[1] + end[1]) / 2 + 0.5,
        (start[2] + end[2]) / 2 + 0.5
      ),
      new THREE.Vector3(...end)
    );
    return curve.getPoints(20);
  }, [start, end]);
  
  return (
    <line ref={lineRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        attach="material"
        color="#00FFFF"
        transparent
        opacity={0.2}
        linewidth={2}
      />
    </line>
  );
};

// Realistic Earth Globe Component
const EarthGlobe = () => {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const atmosphereRef = useRef();
  
  // Create Earth-like material with procedural continents
  const earthMaterial = useMemo(() => {
    // Create a canvas for the Earth texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Ocean base
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1e3a8a'); // Deep blue
    gradient.addColorStop(0.5, '#1e40af'); // Ocean blue
    gradient.addColorStop(1, '#1e3a8a'); // Deep blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    
    // Add continent-like shapes
    ctx.fillStyle = '#22c55e'; // Green for land
    
    // North America
    ctx.beginPath();
    ctx.ellipse(200, 180, 80, 60, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Europe/Africa
    ctx.beginPath();
    ctx.ellipse(500, 200, 40, 80, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(700, 160, 100, 50, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(800, 320, 30, 20, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(300, 350, 25, 60, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add some noise for realism
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#16a34a' : '#15803d';
      ctx.beginPath();
      ctx.arc(
        Math.random() * 1024,
        Math.random() * 512,
        Math.random() * 5 + 1,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return new THREE.MeshPhongMaterial({
      map: texture,
      shininess: 30,
      transparent: false,
    });
  }, []);
  
  // Cloud material
  const cloudMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Transparent base
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 512, 256);
    
    // Add cloud patterns
    for (let i = 0; i < 50; i++) {
      const alpha = Math.random() * 0.3 + 0.1;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 512,
        Math.random() * 256,
        Math.random() * 20 + 5,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
  }, []);
  
  // Real-world network node positions (converted to 3D coordinates)
  const networkNodes = useMemo(() => {
    const locations = [
      { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
      { name: 'New York', lat: 40.7128, lon: -74.0060 },
      { name: 'London', lat: 51.5074, lon: -0.1278 },
      { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
      { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
      { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
      { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
      { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
      { name: 'Berlin', lat: 52.5200, lon: 13.4050 },
      { name: 'Toronto', lat: 43.6532, lon: -79.3832 },
    ];
    
    return locations.map((loc, index) => {
      // Convert lat/lon to 3D coordinates on sphere
      const phi = (90 - loc.lat) * (Math.PI / 180);
      const theta = (loc.lon + 180) * (Math.PI / 180);
      const radius = 1.02;
      
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      return {
        position: [x, y, z],
        delay: index * 0.2,
        label: loc.name
      };
    });
  }, []);
  
  // Generate connections between nearby nodes
  const connections = useMemo(() => {
    const lines = [];
    const maxDistance = 1.8;
    
    for (let i = 0; i < networkNodes.length; i++) {
      for (let j = i + 1; j < networkNodes.length; j++) {
        const pos1 = networkNodes[i].position;
        const pos2 = networkNodes[j].position;
        
        const distance = Math.sqrt(
          Math.pow(pos1[0] - pos2[0], 2) +
          Math.pow(pos1[1] - pos2[1], 2) +
          Math.pow(pos1[2] - pos2[2], 2)
        );
        
        if (distance < maxDistance) {
          lines.push({
            start: pos1,
            end: pos2,
            delay: (i + j) * 0.1
          });
        }
      }
    }
    
    return lines;
  }, [networkNodes]);
  
  // Animate Earth rotation
  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05; // Slow rotation
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.07; // Clouds rotate slightly faster
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.02;
    }
  });
  
  return (
    <group>
      {/* Main Earth sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[1.005, 32, 32]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshBasicMaterial
          color="#4A90E2"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
        />
      </mesh>
      
      {/* Network Nodes */}
      {networkNodes.map((node, index) => (
        <NetworkNode
          key={index}
          position={node.position}
          delay={node.delay}
          label={node.label}
        />
      ))}
      
      {/* Connection Lines */}
      {connections.map((connection, index) => (
        <ConnectionLine
          key={index}
          start={connection.start}
          end={connection.end}
          delay={connection.delay}
        />
      ))}
    </group>
  );
};

// Floating Particles
const FloatingParticles = () => {
  const particlesRef = useRef();
  
  const particlePositions = useMemo(() => {
    const positions = [];
    const particleCount = 200;
    
    for (let i = 0; i < particleCount; i++) {
      positions.push(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
    }
    
    return new Float32Array(positions);
  }, []);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlePositions.length / 3}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00FFFF"
        size={0.015}
        transparent
        opacity={0.4}
      />
    </points>
  );
};

// Main Globe3D Component
const Globe3D = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    return (
      <div className="w-96 h-96 mx-auto flex items-center justify-center">
        <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-900 via-green-800 to-blue-900 border border-electric-cyan/30 animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className="w-96 h-96 mx-auto">
      <Canvas
        camera={{
          position: [0, 0, 2.5],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        style={{ background: 'transparent' }}
      >
        {/* Enhanced lighting for Earth */}
        <ambientLight intensity={0.3} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.2} 
          color="#FFFFFF"
          castShadow
        />
        <pointLight 
          position={[-5, -3, -5]} 
          intensity={0.4} 
          color="#00FFFF" 
        />
        <pointLight 
          position={[0, 5, 0]} 
          intensity={0.3} 
          color="#FFFFFF" 
        />
        
        {/* Earth Globe */}
        <EarthGlobe />
        
        {/* Background Effects */}
        <FloatingParticles />
        <Stars 
          radius={50} 
          depth={50} 
          count={1000} 
          factor={2} 
          saturation={0} 
          fade 
        />
      </Canvas>
    </div>
  );
};

export default Globe3D;