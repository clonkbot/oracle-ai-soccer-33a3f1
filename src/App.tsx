import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Float, MeshDistortMaterial, Sphere, Environment, Html, Text } from '@react-three/drei'
import * as THREE from 'three'

// Match data for predictions
const sampleMatches = [
  { id: 1, home: 'Manchester United', away: 'Liverpool', league: 'Premier League' },
  { id: 2, home: 'Barcelona', away: 'Real Madrid', league: 'La Liga' },
  { id: 3, home: 'Bayern Munich', away: 'Dortmund', league: 'Bundesliga' },
  { id: 4, home: 'PSG', away: 'Marseille', league: 'Ligue 1' },
  { id: 5, home: 'Juventus', away: 'AC Milan', league: 'Serie A' },
]

interface Prediction {
  match: typeof sampleMatches[0]
  homeScore: number
  awayScore: number
  confidence: number
  winner: string
}

// Floating data particles around the ball
function DataParticles({ count = 100, analyzing }: { count?: number; analyzing: boolean }) {
  const points = useRef<THREE.Points>(null!)
  const positions = useRef<Float32Array>()

  useEffect(() => {
    positions.current = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 2 + Math.random() * 1.5
      positions.current[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions.current[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions.current[i * 3 + 2] = r * Math.cos(phi)
    }
  }, [count])

  useFrame((state) => {
    if (points.current) {
      const speed = analyzing ? 0.02 : 0.005
      points.current.rotation.y += speed
      points.current.rotation.x += speed * 0.5
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current || new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={analyzing ? '#00f5ff' : '#39ff14'}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

// The AI Oracle Ball
function OracleBall({ analyzing, prediction }: { analyzing: boolean; prediction: Prediction | null }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.2
      meshRef.current.rotation.x = Math.sin(t * 0.3) * 0.1
    }
    if (glowRef.current) {
      const scale = analyzing ? 1.3 + Math.sin(t * 5) * 0.1 : 1.2
      glowRef.current.scale.setScalar(scale)
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group>
        {/* Outer glow */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial
            color={analyzing ? '#00f5ff' : '#39ff14'}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Main ball with distortion */}
        <Sphere ref={meshRef} args={[1, 64, 64]}>
          <MeshDistortMaterial
            color={analyzing ? '#001a1f' : '#0a1a0a'}
            emissive={analyzing ? '#00f5ff' : '#39ff14'}
            emissiveIntensity={analyzing ? 0.5 : 0.3}
            roughness={0.2}
            metalness={0.8}
            distort={analyzing ? 0.4 : 0.2}
            speed={analyzing ? 4 : 2}
          />
        </Sphere>

        {/* Soccer ball pattern lines */}
        <mesh>
          <icosahedronGeometry args={[1.02, 1]} />
          <meshBasicMaterial
            color={analyzing ? '#00f5ff' : '#39ff14'}
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Prediction display */}
        {prediction && !analyzing && (
          <Html center distanceFactor={3} position={[0, 2.5, 0]}>
            <div className="prediction-popup">
              <div className="prediction-header">ORACLE PREDICTION</div>
              <div className="prediction-score">
                <span className="team">{prediction.match.home}</span>
                <span className="score">{prediction.homeScore}</span>
                <span className="vs">-</span>
                <span className="score">{prediction.awayScore}</span>
                <span className="team">{prediction.match.away}</span>
              </div>
              <div className="confidence">
                Confidence: <span style={{ color: '#39ff14' }}>{prediction.confidence}%</span>
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

// Floating text rings
function TextRing({ text, radius, height, speed }: { text: string; radius: number; height: number; speed: number }) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * speed
    }
  })

  const chars = text.split('')
  const angleStep = (Math.PI * 2) / chars.length

  return (
    <group ref={groupRef} position={[0, height, 0]}>
      {chars.map((char, i) => (
        <Text
          key={i}
          position={[
            Math.cos(i * angleStep) * radius,
            0,
            Math.sin(i * angleStep) * radius
          ]}
          rotation={[0, -i * angleStep + Math.PI / 2, 0]}
          fontSize={0.15}
          color="#00f5ff"
          anchorX="center"
          anchorY="middle"
          font="https://fonts.gstatic.com/s/orbitron/v31/yMJRMIlzdpvBhQQL_Qq7dy0.woff2"
        >
          {char}
        </Text>
      ))}
    </group>
  )
}

// Main scene
function Scene({ analyzing, prediction }: { analyzing: boolean; prediction: Prediction | null }) {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 5, 20]} />

      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00f5ff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff0055" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        color={analyzing ? '#00f5ff' : '#39ff14'}
      />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <OracleBall analyzing={analyzing} prediction={prediction} />
      <DataParticles analyzing={analyzing} />

      <TextRing text="/// NEURAL_NETWORK_v4.2 /// QUANTUM_ANALYSIS /// " radius={3} height={1.5} speed={0.3} />
      <TextRing text="/// MATCH_PREDICTION /// DATA_STREAM_ACTIVE /// " radius={3.5} height={-1.5} speed={-0.2} />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.5}
      />

      <Environment preset="night" />
    </>
  )
}

// UI Components
function MatchCard({ match, onSelect, disabled }: { match: typeof sampleMatches[0]; onSelect: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`match-card ${disabled ? 'analyzing' : ''}`}
    >
      <div className="league">{match.league}</div>
      <div className="teams">
        <span className="home">{match.home}</span>
        <span className="vs">VS</span>
        <span className="away">{match.away}</span>
      </div>
      <div className="predict-btn">
        {disabled ? 'ANALYZING...' : 'PREDICT'}
      </div>
    </button>
  )
}

export default function App() {
  const [analyzing, setAnalyzing] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<typeof sampleMatches[0] | null>(null)

  const generatePrediction = (match: typeof sampleMatches[0]) => {
    setSelectedMatch(match)
    setAnalyzing(true)
    setPrediction(null)

    // Simulate AI thinking
    setTimeout(() => {
      const homeScore = Math.floor(Math.random() * 5)
      const awayScore = Math.floor(Math.random() * 5)
      const confidence = 75 + Math.floor(Math.random() * 24)

      setPrediction({
        match,
        homeScore,
        awayScore,
        confidence,
        winner: homeScore > awayScore ? match.home : homeScore < awayScore ? match.away : 'Draw'
      })
      setAnalyzing(false)
    }, 3000)
  }

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .app {
          width: 100vw;
          height: 100dvh;
          background: #0a0a0f;
          position: relative;
          overflow: hidden;
          font-family: 'JetBrains Mono', monospace;
        }

        .canvas-container {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .ui-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        .header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 20px;
          text-align: center;
          background: linear-gradient(to bottom, rgba(10, 10, 15, 0.95), transparent);
        }

        .title {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: 900;
          letter-spacing: 0.2em;
          background: linear-gradient(135deg, #00f5ff 0%, #39ff14 50%, #ff0055 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 40px rgba(0, 245, 255, 0.5);
          margin-bottom: 8px;
        }

        .subtitle {
          font-size: clamp(0.6rem, 2vw, 0.75rem);
          color: #00f5ff;
          letter-spacing: 0.3em;
          opacity: 0.7;
        }

        .sidebar {
          position: absolute;
          top: 50%;
          right: 20px;
          transform: translateY(-50%);
          width: min(320px, calc(100vw - 40px));
          max-height: 60vh;
          overflow-y: auto;
          pointer-events: auto;
          scrollbar-width: thin;
          scrollbar-color: #00f5ff #0a0a0f;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: absolute;
            top: auto;
            bottom: 80px;
            left: 10px;
            right: 10px;
            transform: none;
            width: auto;
            max-height: 35vh;
          }
        }

        .sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar::-webkit-scrollbar-track {
          background: #0a0a0f;
        }

        .sidebar::-webkit-scrollbar-thumb {
          background: #00f5ff;
          border-radius: 2px;
        }

        .sidebar-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.75rem;
          color: #00f5ff;
          letter-spacing: 0.2em;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 245, 255, 0.3);
        }

        .match-card {
          width: 100%;
          background: rgba(0, 245, 255, 0.05);
          border: 1px solid rgba(0, 245, 255, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          color: white;
          font-family: inherit;
        }

        .match-card:hover:not(:disabled) {
          background: rgba(0, 245, 255, 0.15);
          border-color: #00f5ff;
          box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
          transform: translateX(-5px);
        }

        .match-card.analyzing {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .match-card .league {
          font-size: 0.6rem;
          color: #ff0055;
          letter-spacing: 0.15em;
          margin-bottom: 6px;
        }

        .match-card .teams {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(0.65rem, 2vw, 0.8rem);
          font-weight: 500;
        }

        .match-card .home {
          color: #39ff14;
        }

        .match-card .vs {
          color: #666;
          font-size: 0.6rem;
        }

        .match-card .away {
          color: #00f5ff;
        }

        .match-card .predict-btn {
          margin-top: 10px;
          font-size: 0.6rem;
          color: #00f5ff;
          letter-spacing: 0.2em;
          text-align: right;
        }

        .prediction-popup {
          background: rgba(10, 10, 15, 0.95);
          border: 2px solid #39ff14;
          border-radius: 12px;
          padding: 20px 30px;
          min-width: 300px;
          text-align: center;
          box-shadow: 0 0 40px rgba(57, 255, 20, 0.4);
          animation: popIn 0.5s ease-out;
        }

        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .prediction-header {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.7rem;
          color: #39ff14;
          letter-spacing: 0.3em;
          margin-bottom: 15px;
        }

        .prediction-score {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-family: 'Orbitron', sans-serif;
        }

        .prediction-score .team {
          font-size: 0.7rem;
          color: white;
          max-width: 100px;
        }

        .prediction-score .score {
          font-size: 2rem;
          font-weight: 900;
          color: #00f5ff;
          text-shadow: 0 0 20px rgba(0, 245, 255, 0.8);
        }

        .prediction-score .vs {
          color: #666;
          font-size: 1.5rem;
        }

        .confidence {
          margin-top: 15px;
          font-size: 0.7rem;
          color: #888;
        }

        .status-bar {
          position: absolute;
          bottom: 60px;
          left: 20px;
          font-size: 0.65rem;
          color: #00f5ff;
          letter-spacing: 0.15em;
        }

        @media (max-width: 768px) {
          .status-bar {
            bottom: auto;
            top: 100px;
            left: 10px;
            right: 10px;
            text-align: center;
          }
        }

        .status-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          animation: pulse 1s ease-in-out infinite;
        }

        .status-indicator.active {
          background: #39ff14;
          box-shadow: 0 0 10px #39ff14;
        }

        .status-indicator.analyzing {
          background: #00f5ff;
          box-shadow: 0 0 10px #00f5ff;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 15px 20px;
          text-align: center;
          font-size: 0.6rem;
          color: #444;
          letter-spacing: 0.1em;
          background: linear-gradient(to top, rgba(10, 10, 15, 0.9), transparent);
        }

        .footer a {
          color: #555;
          text-decoration: none;
          transition: color 0.3s;
        }

        .footer a:hover {
          color: #00f5ff;
        }

        .scan-lines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 245, 255, 0.01) 2px,
            rgba(0, 245, 255, 0.01) 4px
          );
          pointer-events: none;
          z-index: 100;
        }

        .loading-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #00f5ff;
          font-family: 'Orbitron', sans-serif;
          font-size: 1rem;
          letter-spacing: 0.3em;
        }
      `}</style>

      <div className="canvas-container">
        <Canvas camera={{ position: [0, 0, 7], fov: 60 }}>
          <Suspense fallback={null}>
            <Scene analyzing={analyzing} prediction={prediction} />
          </Suspense>
        </Canvas>
      </div>

      <div className="ui-overlay">
        <header className="header">
          <h1 className="title">ORACLE AI</h1>
          <p className="subtitle">QUANTUM SOCCER PREDICTION ENGINE</p>
        </header>

        <aside className="sidebar">
          <h2 className="sidebar-title">SELECT MATCH TO ANALYZE</h2>
          {sampleMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              onSelect={() => generatePrediction(match)}
              disabled={analyzing}
            />
          ))}
        </aside>

        <div className="status-bar">
          <span className={`status-indicator ${analyzing ? 'analyzing' : 'active'}`}></span>
          {analyzing
            ? `ANALYZING: ${selectedMatch?.home} VS ${selectedMatch?.away}...`
            : prediction
              ? `PREDICTION COMPLETE // WINNER: ${prediction.winner.toUpperCase()}`
              : 'ORACLE READY // SELECT A MATCH'
          }
        </div>

        <footer className="footer">
          Requested by <a href="https://twitter.com/ArliRwa" target="_blank" rel="noopener noreferrer">@ArliRwa</a> · Built by <a href="https://twitter.com/clonkbot" target="_blank" rel="noopener noreferrer">@clonkbot</a>
        </footer>
      </div>

      <div className="scan-lines" />
    </div>
  )
}
