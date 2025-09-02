"use client";
import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Enhanced Data Stream Component
const DataStream = ({ start, end, delay = 0, color = "#00FFFF" }) => {
  const streamRef = useRef();
  const particlesRef = useRef();
  
  const particles = useMemo(() => {
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...start),
        new THREE.Vector3(
          (start[0] + end[0]) / 2 + 0.3,
          (start[1] + end[1]) / 2 + 0.3,
          (start[2] + end[2]) / 2 + 0.3
        ),
        new THREE.Vector3(...end)
      );
      
      const point = curve.getPoint(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    }
    
    return positions;
  }, [start, end]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const time = state.clock.elapsedTime + delay;
      const positions = particlesRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const particleIndex = i / 3;
        const offset = (time * 2 + particleIndex * 0.1) % 1;
        
        // Fade particles as they move
        const opacity = Math.sin(offset * Math.PI);
        particlesRef.current.material.opacity = opacity * 0.8;
      }
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.02}
        transparent
        opacity={0.8}
      />
    </points>
  );
};

// Network Node Component positioned on Earth locations
const NetworkNode = ({ position, delay = 0, label }) => {
  const meshRef = useRef();
  const ringRef = useRef();
  const pulseRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 3 + delay) * 0.4;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime + delay;
      ringRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.2;
    }
    if (pulseRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4 + delay) * 0.3;
      pulseRef.current.scale.setScalar(scale);
      pulseRef.current.material.opacity = 0.6 - (scale - 1) * 2;
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
      
      {/* Pulse effect */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color="#00FFFF"
          transparent
          opacity={0.3}
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
      const opacity = 0.3 + Math.sin(state.clock.elapsedTime * 1.5 + delay) * 0.2;
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
    return curve.getPoints(30);
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
        opacity={0.3}
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
  const dataLayerRef = useRef();
  
  // Create Earth-like material with procedural continents
  const earthMaterial = useMemo(() => {
    // Create a canvas for the Earth texture
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Ocean base
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#1e3a8a'); // Deep blue
    gradient.addColorStop(0.5, '#1e40af'); // Ocean blue
    gradient.addColorStop(1, '#1e3a8a'); // Deep blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    
    // Add continent-like shapes
    ctx.fillStyle = '#059669'; // Darker green for land
    
    // North America
    ctx.beginPath();
    ctx.ellipse(400, 360, 160, 120, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Europe/Africa
    ctx.beginPath();
    ctx.ellipse(1000, 400, 80, 160, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(1400, 320, 200, 100, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(1600, 640, 60, 40, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(600, 700, 50, 120, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add more detailed landmasses
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#16a34a' : '#15803d';
      ctx.beginPath();
      ctx.arc(
        Math.random() * 2048,
        Math.random() * 1024,
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
      shininess: 50,
      transparent: false,
      bumpScale: 0.02,
    });
  }, []);
  
  // Cloud material
  const cloudMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Transparent base
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, 1024, 512);
    
    // Add cloud patterns
    for (let i = 0; i < 100; i++) {
      const alpha = Math.random() * 0.3 + 0.1;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 1024,
        Math.random() * 512,
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
      opacity: 0.5,
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
      { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
      { name: 'Seoul', lat: 37.5665, lon: 126.9780 },
      { name: 'Mexico City', lat: 19.4326, lon: -99.1332 },
      { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
      { name: 'Stockholm', lat: 59.3293, lon: 18.0686 },
    ];
    
    return locations.map((loc, index) => {
      // Convert lat/lon to 3D coordinates on sphere
      const phi = (90 - loc.lat) * (Math.PI / 180);
      const theta = (loc.lon + 180) * (Math.PI / 180);
      const radius = 1.03;
      
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
    const maxDistance = 2.0;
    
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
      earthRef.current.rotation.y += delta * 0.08; // Slightly faster rotation
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.1; // Clouds rotate faster
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.03;
    }
    if (dataLayerRef.current) {
      dataLayerRef.current.rotation.y += delta * 0.12;
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
      
      {/* Data layer - represents the digital layer */}
      <mesh ref={dataLayerRef}>
        <sphereGeometry args={[1.01, 32, 32]} />
        <meshBasicMaterial
          color="#00FFFF"
          transparent
          opacity={0.05}
          wireframe
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[1.04, 32, 32]} />
        <meshBasicMaterial
          color="#4A90E2"
          transparent
          opacity={0.15}
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
      
      {/* Data Streams */}
      {connections.slice(0, 5).map((connection, index) => (
        <DataStream
          key={`stream-${index}`}
          start={connection.start}
          end={connection.end}
          delay={index * 0.5}
          color={index % 2 === 0 ? "#00FFFF" : "#8B5CF6"}
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
    const particleCount = 300;
    
    for (let i = 0; i < particleCount; i++) {
      positions.push(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
    }
    
    return new Float32Array(positions);
  }, []);
  
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.008;
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
        size={0.02}
        transparent
        opacity={0.6}
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
        <div className="w-80 h-80 rounded-full bg-gradient-to-br from-blue-900 via-green-800 to-blue-900 border-2 border-electric-cyan/30 animate-pulse shadow-2xl shadow-electric-cyan/20"></div>
      </div>
    );
  }
  
  return (
    <div className="w-[500px] h-[500px] mx-auto">
      <Canvas
        camera={{
          position: [0, 0, 3],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
        style={{ background: 'transparent' }}
      >
        {/* Enhanced lighting for Earth */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[5, 3, 5]} 
          intensity={1.5} 
          color="#FFFFFF"
          castShadow
        />
        <pointLight 
          position={[-5, -3, -5]} 
          intensity={0.6} 
          color="#00FFFF" 
        />
        <pointLight 
          position={[0, 5, 0]} 
          intensity={0.4} 
          color="#FFFFFF" 
        />
        <pointLight 
          position={[0, -5, 0]} 
          intensity={0.3} 
          color="#8B5CF6" 
        />
        
        {/* Earth Globe */}
        <EarthGlobe />
        
        {/* Background Effects */}
        <FloatingParticles />
        <Stars 
          radius={50} 
          depth={50} 
          count={1500} 
          factor={2} 
          saturation={0} 
          fade 
        />
      </Canvas>
    </div>
  );
};

export default Globe3D;