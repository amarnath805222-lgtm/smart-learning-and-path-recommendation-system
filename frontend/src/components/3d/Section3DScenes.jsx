import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import useThemeStore from '../../store/themeStore';

// Safe WebGL check
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// ─── 1. LEARNING PATH 3D KNOWLEDGE SPIRE ─────────────────────
function SpireModel({ isDark }) {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
    if (ring1Ref.current) ring1Ref.current.rotation.z += delta * 0.4;
    if (ring2Ref.current) ring2Ref.current.rotation.x += delta * 0.3;
  });

  const blue = isDark ? '#38BDF8' : '#2F5BFF';
  const amber = '#F59E0B';
  const slate = isDark ? '#475569' : '#94A3B8';

  return (
    <group ref={groupRef}>
      {/* Central Spire Cylinder / Crystal */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color={blue}
          emissive={blue}
          emissiveIntensity={isDark ? 0.8 : 0.45}
          roughness={0.15}
          metalness={0.4}
        />
      </mesh>

      {/* Orbiting Ring 1 */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[2.0, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={amber}
          emissive={amber}
          emissiveIntensity={isDark ? 0.9 : 0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Orbiting Ring 2 */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 3, Math.PI / 4, 0]}>
        <torusGeometry args={[2.5, 0.03, 16, 64]} />
        <meshStandardMaterial
          color={slate}
          emissive={slate}
          emissiveIntensity={0.3}
          roughness={0.3}
        />
      </mesh>

      {/* Milestone Beacons around ring */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 2.0;
        const z = Math.sin(angle) * 2.0;
        return (
          <mesh key={i} position={[x, Math.sin(i) * 0.3, z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={i < 3 ? blue : amber}
              emissive={i < 3 ? blue : amber}
              emissiveIntensity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function LearningPath3DSpire({ height = 220 }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  if (!hasWebGL()) return null;

  return (
    <div style={{
      width: '100%',
      height,
      overflow: 'hidden',
      position: 'relative',
      background: 'transparent',
    }}>
      <Canvas camera={{ position: [0, 1.2, 5.0], fov: 42 }}>
        <ambientLight intensity={isDark ? 1.4 : 1.2} />
        <directionalLight position={[4, 6, 4]} intensity={1.5} />
        <directionalLight position={[-4, -2, 2]} intensity={0.8} color={isDark ? '#38BDF8' : '#3B82F6'} />
        <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.8}>
          <SpireModel isDark={isDark} />
        </Float>
      </Canvas>
    </div>
  );
}

// ─── 2. AI ASSESSMENT 3D NEURAL CORE ─────────────────────────
function NeuralCoreModel({ isDark }) {
  const coreRef = useRef();
  const wireRef = useRef();

  useFrame((state, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.4;
      coreRef.current.rotation.x += delta * 0.2;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.25;
      wireRef.current.rotation.z += delta * 0.15;
    }
  });

  const primary = isDark ? '#38BDF8' : '#4F46E5';
  const accent = '#F59E0B';

  return (
    <group>
      {/* Inner Pulsing Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial
          color={primary}
          emissive={primary}
          emissiveIntensity={isDark ? 0.9 : 0.6}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Outer Wireframe Neural Shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshBasicMaterial
          color={accent}
          wireframe
          transparent
          opacity={isDark ? 0.45 : 0.35}
        />
      </mesh>
    </group>
  );
}

export function Assessment3DCore({ height = 180 }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  if (!hasWebGL()) return null;

  return (
    <div style={{
      width: '100%',
      height,
      overflow: 'hidden',
      position: 'relative',
      background: 'transparent',
    }}>
      <Canvas camera={{ position: [0, 0, 4.2], fov: 40 }}>
        <ambientLight intensity={isDark ? 1.4 : 1.2} />
        <directionalLight position={[4, 5, 4]} intensity={1.6} />
        <Float speed={2.2} rotationIntensity={0.6} floatIntensity={0.7}>
          <NeuralCoreModel isDark={isDark} />
        </Float>
      </Canvas>
    </div>
  );
}

// ─── 3. AI TUTOR 3D HOLOGRAPHIC ORB ─────────────────────────
function TutorHologramModel({ isDark }) {
  const orbRef = useRef();
  const ringRef = useRef();

  useFrame((state, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.8;
    }
  });

  const color = isDark ? '#38BDF8' : '#2F5BFF';

  return (
    <group>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.85, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isDark ? 0.9 : 0.5}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.3, 0.035, 16, 48]} />
        <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

export function Tutor3DHologram({ height = 140 }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  if (!hasWebGL()) return null;

  return (
    <div style={{
      width: '100%',
      height,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      background: 'transparent',
    }}>
      <Canvas camera={{ position: [0, 0, 3.6], fov: 38 }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 3]} intensity={1.5} />
        <Float speed={2.0} rotationIntensity={0.4} floatIntensity={0.6}>
          <TutorHologramModel isDark={isDark} />
        </Float>
      </Canvas>
    </div>
  );
}

// ─── 4. ANALYTICS 3D SKILL RADAR CRYSTAL ────────────────────
function RadarCrystalModel({ isDark }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  const blue = isDark ? '#38BDF8' : '#2F5BFF';
  const amber = '#F59E0B';

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial
          color={blue}
          emissive={blue}
          emissiveIntensity={isDark ? 0.75 : 0.45}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Surrounding crystal points */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.57) * 1.6, Math.sin(i * 1.57) * 0.4, Math.sin(i * 1.57) * 1.6]}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={amber} emissive={amber} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function Analytics3DRadar({ height = 200 }) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  if (!hasWebGL()) return null;

  return (
    <div style={{
      width: '100%',
      height,
      borderRadius: 16,
      overflow: 'hidden',
      position: 'relative',
      background: isDark
        ? 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)'
        : 'radial-gradient(circle at 50% 50%, rgba(238, 242, 255, 0.8) 0%, rgba(244, 247, 252, 0.5) 100%)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--glass-shadow)',
    }}>
      <Canvas camera={{ position: [0, 0.8, 4.4], fov: 40 }}>
        <ambientLight intensity={isDark ? 1.4 : 1.2} />
        <directionalLight position={[4, 5, 4]} intensity={1.5} />
        <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.7}>
          <RadarCrystalModel isDark={isDark} />
        </Float>
      </Canvas>
    </div>
  );
}
