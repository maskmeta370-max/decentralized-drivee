// my-app/components/FileCrystal.js
'use client';
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export const FileCrystal = ({ file }) => {
  const meshRef = useRef();
  const [isHovered, setIsHovered] = useState(false);

  // Rotate the crystal on every frame
  useFrame((state, delta) => {
    if (meshRef.current && !isHovered) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <group position={file.position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
        onClick={() => window.open(file.ipfsUrl, '_blank')}
        scale={isHovered ? 1.2 : 1}
      >
        {/* This creates the crystal shape */}
        <icosahedronGeometry args={[1, 0]} />
        {/* This creates the glowing, semi-transparent material */}
        <meshStandardMaterial
          color={isHovered ? '#00FFFF' : '#FFFFFF'}
          emissive={isHovered ? '#00FFFF' : '#FFFFFF'}
          emissiveIntensity={isHovered ? 0.7 : 0.2}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Display file name below the crystal */}
      <Text
        position={[0, -1.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
        textAlign="center"
      >
        {file.fileName}
      </Text>
    </group>
  );
};