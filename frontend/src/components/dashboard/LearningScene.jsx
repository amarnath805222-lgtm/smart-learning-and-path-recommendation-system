import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useThemeStore from '../../store/themeStore';

// Check WebGL support safely
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// ─── 3D LEARNING TRAIL MODEL CORE (PURE GEOMETRY, NO TEXT) ───
export function TrailModel({
  progress = 4.62,
  topics = [],
  hoveredIndex = null,
  setHoveredIndex = () => {},
  onSelectNode = null,
  isInteractive = false,
  isWideScreen = true,
  prefersReducedMotion = false,
}) {
  const { camera } = useThree();
  const mouseRef = useRef({ x: 0, y: 0 });
  const pulseRef = useRef(0);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const numTopics = topics.length || 8;
  const currentFloor = Math.floor(progress);
  const fraction = progress - currentFloor;

  // Dynamic colors based on active theme
  const colors = useMemo(() => {
    if (isDark) {
      return {
        line: '#334155',
        lineEmissive: '#1E293B',
        blue: '#38BDF8',
        blueEmissive: '#0284C7',
        amber: '#F59E0B',
        futureGrey: '#475569',
        futureEmissive: '#334155',
        floorRing: '#334155',
      };
    }
    return {
      line: '#64748B',
      lineEmissive: '#334155',
      blue: '#2F5BFF',
      blueEmissive: '#2563EB',
      amber: '#F59E0B',
      futureGrey: '#94A3B8',
      futureEmissive: '#64748B',
      floorRing: '#94A3B8',
    };
  }, [isDark]);

  // 1. Calculate 8 nodes along a CatmullRomCurve3 spiral
  const { nodePositions, fullCurve } = useMemo(() => {
    const pts = [];
    const positions = [];
    const radius = 1.95;
    const startAngle = -Math.PI * 0.45;
    const totalTurns = 1.15;

    for (let i = 0; i < numTopics; i++) {
      const t = i / (numTopics - 1);
      const angle = startAngle + t * (Math.PI * 2 * totalTurns);
      const x = Math.cos(angle) * radius;
      const y = -1.5 + t * 3.0; // rising vertically
      const z = Math.sin(angle) * (radius * 0.78);
      const vec = new THREE.Vector3(x, y, z);
      pts.push(vec);
      positions.push([x, y, z]);
    }

    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    return { nodePositions: positions, fullCurve: curve };
  }, [numTopics]);

  // 2. Build completed sub-tube geometry based on progress
  const completedGeometry = useMemo(() => {
    const maxT = numTopics - 1;
    const progressClamped = Math.max(0, Math.min(progress, maxT));
    if (progressClamped <= 0.01) return null;

    const tNormalized = progressClamped / maxT;
    const sampleCount = Math.max(20, Math.floor(130 * tNormalized));
    const subPoints = [];

    for (let i = 0; i <= sampleCount; i++) {
      const u = (i / sampleCount) * tNormalized;
      subPoints.push(fullCurve.getPointAt(u));
    }

    if (subPoints.length < 2) return null;
    const subCurve = new THREE.CatmullRomCurve3(subPoints);
    return new THREE.TubeGeometry(subCurve, sampleCount * 2, 0.092, 16, false);
  }, [progress, numTopics, fullCurve]);

  // 3. Position of traveler orb at the end of the completed path
  const travelerPos = useMemo(() => {
    const maxT = numTopics - 1;
    const progressClamped = Math.max(0, Math.min(progress, maxT));
    const tNormalized = Math.min(progressClamped / maxT, 0.999);
    const p = fullCurve.getPointAt(tNormalized);
    return [p.x, p.y, p.z];
  }, [progress, numTopics, fullCurve]);

  // 4. Floor level for pin lines
  const floorY = -2.15;

  // 5. Floating ambient dust particles
  const { particlePositions, particleColors } = useMemo(() => {
    const count = 85;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const color = new THREE.Color(colors.blue);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5.5;

      col[i * 3] = color.r;
      col[i * 3 + 1] = color.g;
      col[i * 3 + 2] = color.b;
    }
    return { particlePositions: pos, particleColors: col };
  }, [colors.blue]);

  // Mouse parallax listener for background mode
  useEffect(() => {
    if (isInteractive) return;
    const onMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [isInteractive]);

  // Frame animation: camera slow sway + mouse parallax + pulsing glow
  useFrame((state) => {
    if (!prefersReducedMotion) {
      pulseRef.current = Math.sin(state.clock.elapsedTime * 3.5) * 0.5 + 0.5;

      if (!isInteractive) {
        const swayY = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
        const targetCamX = (isWideScreen ? 0.25 : 0) + mouseRef.current.x * 0.22;
        const targetCamY = 0.4 + swayY + mouseRef.current.y * 0.18;

        camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 0.04);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, 0.04);
      }
    }
  });

  const groupX = isInteractive ? 0 : (isWideScreen ? 0.75 : 0);

  return (
    <group position={[groupX, 0, 0]}>
      {/* ── Floor concentric rings ── */}
      <group position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[1.3, 2.1, 2.9].map((r, i) => (
          <mesh key={i}>
            <ringGeometry args={[r - 0.02, r, 64]} />
            <meshBasicMaterial
              color={colors.floorRing}
              transparent
              opacity={isDark ? (0.35 - i * 0.08) : (0.45 - i * 0.1)}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* ── Full route metallic tube ── */}
      <mesh>
        <tubeGeometry args={[fullCurve, 140, 0.048, 12, false]} />
        <meshStandardMaterial
          color={colors.line}
          emissive={colors.lineEmissive}
          emissiveIntensity={isDark ? 0.4 : 0.25}
          roughness={0.25}
          metalness={0.45}
        />
      </mesh>

      {/* ── Completed glowing tube ── */}
      {completedGeometry && (
        <mesh geometry={completedGeometry}>
          <meshStandardMaterial
            color={colors.blue}
            emissive={colors.blueEmissive}
            emissiveIntensity={isDark ? 0.9 : 0.7}
            roughness={0.12}
            metalness={0.35}
          />
        </mesh>
      )}

      {/* ── Amber traveler orb beacon ── */}
      <group position={travelerPos}>
        <mesh>
          <sphereGeometry args={[0.14, 24, 24]} />
          <meshStandardMaterial
            color={colors.amber}
            emissive={colors.amber}
            emissiveIntensity={1.0}
            roughness={0.08}
          />
        </mesh>
        {/* Pulsing halo */}
        <mesh>
          <sphereGeometry args={[0.24, 18, 18]} />
          <meshBasicMaterial
            color={colors.amber}
            transparent
            opacity={0.25 + pulseRef.current * 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      {/* ── Vertical pin lines & nodes ── */}
      {nodePositions.map((pos, idx) => {
        const isDone = idx < currentFloor;
        const isCurrent = idx === currentFloor;
        const isHovered = hoveredIndex === idx;

        let nodeColor = colors.futureGrey;
        let emissiveColor = colors.futureEmissive;
        let emissiveIntensity = 0.2;
        let radius = 0.16;

        if (isDone) {
          nodeColor = colors.blue;
          emissiveColor = colors.blueEmissive;
          emissiveIntensity = isDark ? 0.75 : 0.55;
          radius = 0.19;
        } else if (isCurrent) {
          nodeColor = colors.amber;
          emissiveColor = colors.amber;
          emissiveIntensity = 0.95;
          radius = 0.30;
        }

        if (isHovered) {
          radius *= 1.25;
          emissiveIntensity = Math.min(1.3, emissiveIntensity + 0.35);
        }

        const pinHeight = pos[1] - floorY;
        const pinMidY = floorY + pinHeight / 2;
        const overflowsRight = pos[0] > 0.8;
        const topic = topics[idx] || { name: `Topic ${idx + 1}` };

        return (
          <group key={idx}>
            {/* Vertical pin line */}
            <mesh position={[pos[0], pinMidY, pos[2]]}>
              <cylinderGeometry args={[0.012, 0.012, pinHeight, 8]} />
              <meshBasicMaterial
                color={colors.floorRing}
                transparent
                opacity={isDark ? 0.3 : 0.4}
              />
            </mesh>

            {/* Floor landing ring */}
            <mesh position={[pos[0], floorY + 0.01, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.04, 0.1, 16]} />
              <meshBasicMaterial
                color={isDone ? colors.blue : isCurrent ? colors.amber : colors.floorRing}
                transparent
                opacity={0.65}
              />
            </mesh>

            {/* Node sphere */}
            <mesh
              position={pos}
              onPointerOver={() => setHoveredIndex(idx)}
              onPointerOut={() => setHoveredIndex(null)}
              onClick={() => onSelectNode?.(idx)}
            >
              <sphereGeometry args={[radius, 24, 24]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                roughness={0.18}
                metalness={0.25}
              />
            </mesh>

            {/* Pulsing aura on Current node */}
            {isCurrent && !prefersReducedMotion && (
              <mesh position={pos}>
                <sphereGeometry args={[radius * 1.55, 20, 20]} />
                <meshBasicMaterial
                  color={colors.amber}
                  transparent
                  opacity={0.22 + pulseRef.current * 0.28}
                  side={THREE.BackSide}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* ── Ambient particles ── */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particlePositions}
            count={85}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={particleColors}
            count={85}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.055} vertexColors transparent opacity={isDark ? 0.45 : 0.35} />
      </points>
    </group>
  );
}



// ─── AMBIENT BACKGROUND 3D SCENE EXPORT ────────────────────────
export default function LearningScene({
  progress = 4.62,
  topics = [],
  hoveredIndex = null,
  setHoveredIndex = () => {},
  onSelectNode = null,
}) {
  const [isWide, setIsWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1180 : true
  );
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    setWebGLSupported(hasWebGL());

    const handleResize = () => setIsWide(window.innerWidth >= 1180);
    const handleVisibility = () => setIsTabVisible(!document.hidden);

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  if (!webGLSupported) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 1.0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <Canvas
        camera={{ position: [0, 0.4, 6.8], fov: 40 }}
        dpr={[1, 1.5]}
        frameloop={isTabVisible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={isDark ? 1.5 : 1.3} />
        <directionalLight position={[5, 8, 6]} intensity={isDark ? 1.8 : 1.6} />
        <directionalLight position={[-4, 3, 3]} intensity={1.0} color={isDark ? '#38BDF8' : '#3B82F6'} />
        <pointLight position={[2, 2, 4]} intensity={isDark ? 1.0 : 0.8} color="#F59E0B" />

        <TrailModel
          progress={progress}
          topics={topics}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
          onSelectNode={onSelectNode}
          isWideScreen={isWide}
          prefersReducedMotion={prefersReducedMotion}
          isInteractive={false}
        />
      </Canvas>
    </div>
  );
}
