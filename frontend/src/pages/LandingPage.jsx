import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, Text3D, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Zap, Brain, Target, TrendingUp, Users, BookOpen, Award, ChevronRight, ArrowRight, Sparkles, Mic, Map } from 'lucide-react';

// ─── 3D COMPONENTS ─────────────────────────────
function NeuralNetwork() {
  const groupRef = useRef();
  const linesRef = useRef([]);

  const nodes = [
    { pos: [0, 0, 0], color: '#6c63ff', label: 'Python' },
    { pos: [-2, 1.5, 0.5], color: '#00d4ff', label: 'ML' },
    { pos: [2, 1.5, -0.5], color: '#00e5a0', label: 'Stats' },
    { pos: [-1.5, -1.5, 1], color: '#ffb800', label: 'Data' },
    { pos: [1.5, -1.5, -1], color: '#ff4d6d', label: 'DL' },
    { pos: [0, 2.8, 0], color: '#6c63ff', label: 'AI' },
    { pos: [-2.5, 0, -1], color: '#00d4ff', label: 'Math' },
    { pos: [2.5, 0, 1], color: '#00e5a0', label: 'CV' },
  ];

  const connections = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 5], [1, 6], [2, 7],
    [3, 6], [4, 7], [5, 7], [6, 1],
  ];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Connections */}
      {connections.map(([a, b], i) => {
        const start = new THREE.Vector3(...nodes[a].pos);
        const end = new THREE.Vector3(...nodes[b].pos);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const length = start.distanceTo(end);
        const direction = end.clone().sub(start).normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        return (
          <mesh key={i} position={mid} quaternion={quaternion}>
            <cylinderGeometry args={[0.015, 0.015, length, 4]} />
            <meshBasicMaterial color="#6c63ff" transparent opacity={0.25} />
          </mesh>
        );
      })}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={0.3} floatIntensity={0.3}>
          <mesh position={node.pos}>
            <sphereGeometry args={[i === 0 ? 0.22 : 0.14, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={0.4}
              metalness={0.5}
              roughness={0.1}
            />
          </mesh>
          {/* Glow ring */}
          <mesh position={node.pos}>
            <ringGeometry args={[i === 0 ? 0.25 : 0.16, i === 0 ? 0.32 : 0.22, 16]} />
            <meshBasicMaterial color={node.color} transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
        </Float>
      ))}

      {/* Central glow */}
      <pointLight position={[0, 0, 0]} color="#6c63ff" intensity={2} distance={5} />
      <pointLight position={[2, 2, 1]} color="#00d4ff" intensity={1.5} distance={4} />
    </group>
  );
}

function ParticleField() {
  const particles = useRef();
  const count = 120;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

    const color = new THREE.Color();
    color.setHSL(0.7 + Math.random() * 0.15, 0.8, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  useFrame((state) => {
    if (particles.current) {
      particles.current.rotation.y = state.clock.elapsedTime * 0.02;
      particles.current.rotation.x = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 55 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <ParticleField />
      <NeuralNetwork />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.35}
      />
    </Canvas>
  );
}

// ─── LANDING PAGE ──────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const FEATURES = [
    {
      icon: Brain, color: '#4f46e5',
      title: 'AI Skill Assessment',
      desc: 'Adaptive assessment dynamically analyzes your knowledge depth across technical topics in minutes.',
    },
    {
      icon: Map, color: '#0284c7',
      title: 'Personalized Learning Path',
      desc: 'Dynamic roadmaps that adapt based on your performance, learning style, and career goals.',
    },
    {
      icon: Target, color: '#10b981',
      title: 'Skill Gap Analysis',
      desc: 'Visualize exactly what skills you need and how far you are from your target career goal.',
    },
    {
      icon: Mic, color: '#f59e0b',
      title: 'AI Voice Assistant',
      desc: 'Real-time interactive voice conversations with full access to your personalized learning data.',
    },
    {
      icon: TrendingUp, color: '#ef4444',
      title: 'Adaptive Learning',
      desc: 'Your path dynamically updates based on quiz performance and learning pace.',
    },
    {
      icon: Award, color: '#8b5cf6',
      title: 'Project-Based Learning',
      desc: 'Unlock real-world projects at each milestone to build a job-ready portfolio.',
    },
  ];

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Ambient subtle background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div className="glow-orb glow-orb-primary" style={{ width: 500, height: 500, top: -100, left: -100, opacity: 0.12 }} />
        <div className="glow-orb glow-orb-accent" style={{ width: 400, height: 400, bottom: 100, right: -100, opacity: 0.1, animationDelay: '-4s' }} />
      </div>

      {/* ─── NAVBAR ─── */}
      <nav className="landing-nav" style={{
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid #e2e8f0' : 'none',
        boxShadow: scrolled ? '0 1px 10px rgba(0,0,0,0.05)' : 'none',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
          }}>
            <Zap size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
            Smart<span style={{ background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Learn</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auth')}>
            Sign In
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth?mode=register')}>
            Get Started Free
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="hero-section" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hero-content">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="ai-badge" style={{ marginBottom: 24, background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
              <Sparkles size={12} />
              AI-Powered Personalized Learning
            </div>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 20,
              color: '#0f172a',
            }}>
              Your Learning Path.{' '}
              <span className="gradient-text">Powered by AI.</span>
            </h1>

            <p style={{
              fontSize: '1.1rem',
              color: '#475569',
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 460,
            }}>
              Discover what to learn, what to improve, and what to do next with an AI-powered personalized learning path tailored to your career goals.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/auth?mode=register')}
              >
                <Brain size={18} />
                Start Your Assessment
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={() => navigate('/auth')}
                style={{ background: '#ffffff', color: '#0f172a', borderColor: '#cbd5e1' }}
              >
                Explore Demo
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
              {['Free to Start', 'No Credit Card', '100% Dynamic'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.82rem' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: 3D Canvas */}
          <motion.div
            className="hero-canvas"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <HeroScene />
          </motion.div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{
        padding: '80px 48px',
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-label" style={{ justifyContent: 'center' }}>
            <Sparkles size={12} />
            FEATURES
          </div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Everything You Need to{' '}
            <span className="gradient-text">Master Your Goals</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
            From skill assessment to personalized learning paths, driven by cutting-edge AI.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
        }}>
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  padding: '24px 0',
                  background: 'transparent',
                  borderBottom: '1px solid var(--bdr, #E2E8F0)',
                  cursor: 'default',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${feat.color}15`,
                  border: `1px solid ${feat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Icon size={20} color={feat.color} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink, #0B1220)', marginBottom: 8 }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted, #56657F)', lineHeight: 1.65 }}>
                  {feat.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── USER JOURNEY ─── */}
      <section style={{
        padding: '80px 48px',
        maxWidth: 1200,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Your <span className="gradient-text">Learning Journey</span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Register', 'Create Profile', 'Take Assessment',
            'AI Analyzes Skills', 'Get Learning Path',
            'Learn & Quiz', 'Reach Goal'
          ].map((step, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                style={{
                  padding: '10px 18px',
                  background: i === arr.length - 1
                    ? '#2F5BFF'
                    : 'transparent',
                  border: `1px solid ${i === arr.length - 1 ? '#2F5BFF' : 'var(--bdr, #CBD5E1)'}`,
                  borderRadius: 12,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: i === arr.length - 1 ? '#ffffff' : 'var(--ink, #0B1220)',
                  whiteSpace: 'nowrap',
                }}
              >
                {i + 1}. {step}
              </motion.div>
              {i < arr.length - 1 && (
                <ChevronRight size={16} color="var(--muted, #56657F)" style={{ margin: '0 4px', flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{
        padding: '80px 48px 120px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '40px 20px',
            background: 'transparent',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🎓</div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--ink, #0B1220)', marginBottom: 12 }}>
            Ready to start learning?
          </h2>
          <p style={{ color: 'var(--muted, #56657F)', marginBottom: 32, lineHeight: 1.7, fontSize: '1.05rem' }}>
            Accelerate your career journey with adaptive, AI-powered personalized learning paths.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/auth?mode=register')}
          >
            <Zap size={18} />
            Start for Free Today
          </button>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        borderTop: '1px solid var(--bdr, #E2E8F0)',
        padding: '24px 48px',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'linear-gradient(135deg, #2F5BFF, #00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={12} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink, #0B1220)' }}>
            Smart Learning Path — AI EdTech Platform
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted, #56657F)' }}>
          Smart Learning Path • Personalized Career Guidance
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .landing-nav { padding: 12px 24px !important; }
        }
        @media (max-width: 768px) {
          section { padding-left: 24px !important; padding-right: 24px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
