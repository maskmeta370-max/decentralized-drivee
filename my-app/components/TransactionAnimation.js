// my-app/components/TransactionAnimation.js
'use client';
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// A single glowing node in our network
const Node = ({ position }) => (
  <mesh position={position}>
    <sphereGeometry args={[0.1, 16, 16]} />
    <meshStandardMaterial color="#00FFFF" emissive="#00FFFF" emissiveIntensity={2} />
  </mesh>
);

// The animated pulse of light
const Pulse = ({ start, end }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() % 2) / 2; // Loop animation every 2 seconds
    if (ref.current) {
      ref.current.position.lerpVectors(start, end, t);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#FF00FF" emissive="#FF00FF" emissiveIntensity={3} />
    </mesh>
  );
};

export const TransactionAnimation = ({ status }) => {
  // Create a random constellation of nodes
  const nodes = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 15;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 5;
      temp.push(new THREE.Vector3(x, y, z));
    }
    return temp;
  }, []);

  let statusMessage = "Securing on Polygon Network...";
  if (status === 'confirmed') statusMessage = "✅ Ownership Secured!";
  if (status === 'failed') statusMessage = "❌ Transaction Failed.";

  return (
    <div className="fixed inset-0 bg-space-indigo/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="w-full h-2/3">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[0, 0, 5]} intensity={1} color="#00FFFF" />

          {nodes.map((pos, i) => <Node key={i} position={pos} />)}

          {status === 'pending' && <Pulse start={nodes[0]} end={nodes[nodes.length - 1]} />}
        </Canvas>
      </div>
      <p className="text-xl text-white font-semibold animate-pulse">{statusMessage}</p>
    </div>
  );
};
