import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Camera, Upload, Sparkles, RefreshCw, Download, Share2, Volume2, VolumeX, 
  ArrowRight, Play, CheckCircle2, ChevronRight, Star, Heart, Smile, Scan,
  Grid, Compass, MessageSquare, Instagram, Twitter, Github, Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import FaceAnalyzer from './components/FaceAnalyzer'

// ==========================================
// Web Audio Synth Helper
// ==========================================
class AmbientSynth {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.lfo = null;
    this.gain = null;
    this.isPlaying = false;
  }
  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Lowpass filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(150, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(5, this.ctx.currentTime);
    
    // Main Gain
    this.gain = this.ctx.createGain();
    this.gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    // Oscillators for warm ambient hum
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
    
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(110.3, this.ctx.currentTime); // Detuned A2
    
    // Connections
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    
    // LFO to modulate filter frequency (creates breathing pad)
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); 
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(45, this.ctx.currentTime); 
    
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.filter.frequency);
    
    this.osc1.start(0);
    this.osc2.start(0);
    this.lfo.start(0);
  }
  
  toggle() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    if (this.isPlaying) {
      this.gain.gain.setValueAtTime(this.gain.gain.value, this.ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
      this.isPlaying = false;
    } else {
      this.gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.8);
      this.isPlaying = true;
    }
    return this.isPlaying;
  }
  
  playChime(type = 'click') {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const now = this.ctx.currentTime;
      if (type === 'click') {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
        gainNode.gain.setValueAtTime(0.06, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'scan') {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.linearRampToValueAtTime(700, now + 0.4);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.09);
          gainNode.gain.setValueAtTime(0.06, now + i * 0.09);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35);
          osc.connect(gainNode);
          gainNode.connect(this.ctx.destination);
          osc.start(now + i * 0.09);
          osc.stop(now + i * 0.09 + 0.4);
        });
      }
    } catch(e) {
      console.warn("Synth chime error:", e);
    }
  }
}

const synthInstance = new AmbientSynth();

// ==========================================
// Interactive Particle Background Canvas
// ==========================================
function ParticlesCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const colors = ['#8B5CF6', '#00E5FF', '#FDE68A']; // Purple, Cyan, Gold

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle noise/grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const step = 60;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0 opacity-40" 
      aria-hidden="true"
    />
  );
}

// ==========================================
// Unsplash Presets
// ==========================================
const DEMO_PRESETS = [
  {
    id: 'p1',
    name: 'Chill Energy',
    gesture: '✌ Peace Sign',
    vibe: 'Chill Vibe ✨',
    smileConfidence: 96,
    stars: 5,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'p2',
    name: 'Pure Joy',
    gesture: '👍 Thumbs Up',
    vibe: 'Sunny Vibe ☀️',
    smileConfidence: 98,
    stars: 5,
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'p3',
    name: 'Hyper Focus',
    gesture: '👌 OK Sign',
    vibe: 'Zen Matrix 🌀',
    smileConfidence: 89,
    stars: 4,
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'p4',
    name: 'Electro Vibe',
    gesture: '🫶 Heart Sign',
    vibe: 'Synth Vibe 🔮',
    smileConfidence: 94,
    stars: 5,
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=600'
  }
];
// ==========================================
// ONBOARDING SCREEN COMPONENT
// ==========================================
function OnboardingScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      return;
    }
    onComplete(trimmed);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black overflow-hidden"
    >
      {/* Ambient blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-brand-purple/20 blur-[130px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full bg-brand-cyan/15 blur-[150px] pointer-events-none animate-pulse-slow" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Card */}
        <div
          className="glass-panel rounded-3xl p-8 md:p-12 space-y-8 border border-white/10"
          style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 40px rgba(139,92,246,0.15)' }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20">
              <svg className="w-8 h-8 text-brand-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="currentColor" fillOpacity="0.15" />
                <path d="M12 2L17 12H7L12 2Z" stroke="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white tracking-tight">Welcome to VibeSnap</h1>
              <p className="text-white/50 font-light text-sm mt-1.5 leading-relaxed">
                Your Smile. Your Vibe. Your Puzzle.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Name Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <p className="text-white/60 text-sm font-light text-center mb-6 leading-relaxed">
                Before we transform your portrait into a cinematic puzzle, we need to personalise your Polaroid.
              </p>

              {/* Floating Label Input */}
              <div className="relative">
                <input
                  id="userName"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  maxLength={32}
                  autoComplete="given-name"
                  className="w-full px-5 pt-6 pb-3 rounded-2xl text-white text-base font-medium bg-transparent outline-none transition-all duration-300 peer"
                  style={{
                    background: focused
                      ? 'rgba(139,92,246,0.06)'
                      : 'rgba(255,255,255,0.03)',
                    border: focused
                      ? '1px solid rgba(139,92,246,0.5)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: focused
                      ? '0 0 0 3px rgba(139,92,246,0.12), 0 0 20px rgba(139,92,246,0.1)'
                      : 'none',
                  }}
                  placeholder=" "
                  aria-label="Your name"
                />
                {/* Floating Label */}
                <label
                  htmlFor="userName"
                  className="absolute left-5 transition-all duration-200 cursor-text font-sans"
                  style={{
                    top: (focused || name) ? '8px' : '50%',
                    transform: (focused || name) ? 'translateY(0) scale(0.75)' : 'translateY(-50%) scale(1)',
                    transformOrigin: 'left center',
                    color: focused ? 'rgba(139,92,246,0.9)' : 'rgba(255,255,255,0.4)',
                    fontSize: '14px',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  👤 Enter Your Name
                </label>

                {/* Character count */}
                {(focused || name) && (
                  <span className="absolute right-4 bottom-3 text-[10px] font-mono text-white/30">
                    {name.length}/32
                  </span>
                )}
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-red-400 text-xs mt-2 ml-1"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Name preview */}
              <AnimatePresence>
                {name.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center gap-3"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span className="text-white/50 text-xs font-light">Will appear on Polaroid as: </span>
                    <span className="font-serif text-white italic font-medium text-sm">{name.trim()}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-purple to-[#7c3aed] text-white text-xs font-bold tracking-[0.15em] uppercase transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Enter the Photobooth
            </button>

            <p className="text-center text-white/25 text-[10px] font-light">
              Your name is stored locally only — we never send it to any server.
            </p>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(DEMO_PRESETS[0]);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  // Onboarding
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userName, setUserName] = useState('');
  const handleOnboardingComplete = (name) => {
    setUserName(name);
    setOnboardingComplete(true);
  };

  // Custom camera/upload states
  const [uploadedImage, setUploadedImage] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Simulation Steps
  const [generationState, setGenerationState] = useState('idle'); // idle, scanning, result
  const [scanningProgress, setScanningProgress] = useState(0);
  const [scanStepMessage, setScanStepMessage] = useState('');
  
  // Custom Polaroid Tilt Effect
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ==========================================
  // PUZZLE GAME STATES
  // ==========================================
  const [gameActive, setGameActive] = useState(false);
  const [gameGridSize, setGameGridSize] = useState(3); // 3x3 or 4x4
  const [gameTiles, setGameTiles] = useState([]);
  const [gameSelected, setGameSelected] = useState(null); // index of first selected tile
  const [gameMoves, setGameMoves] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [gameSolved, setGameSolved] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const gameTimerRef = useRef(null);
  const [cinemaFilter, setCinemaFilter] = useState('none');

  function previewFilterString(key) {
    const m = {
      none: '',
      portra: 'contrast(1.06) saturate(1.12) brightness(1.02) sepia(0.06)',
      golden: 'brightness(1.06) contrast(1.08) saturate(1.1) hue-rotate(-6deg)',
      tealOrange: 'contrast(1.08) saturate(1.04) sepia(0.06) hue-rotate(-6deg)',
      mono: 'grayscale(1) contrast(1.08) brightness(0.98)'
    }
    return m[key] || ''
  }

  // Sound toggle helper
  const handleSoundToggle = () => {
    const isPlayingNow = synthInstance.toggle();
    setSoundEnabled(isPlayingNow);
    synthInstance.playChime('click');
  };

  // Play interaction chime
  const playInteractionChime = (type) => {
    if (soundEnabled) {
      synthInstance.playChime(type);
    }
  };

  // 3D Polaroid Hover
  const handlePolaroidMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Map to tilt angles
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handlePolaroidMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Webcam Start/Stop
  const toggleWebcam = async () => {
    playInteractionChime('click');
    if (webcamActive) {
      stopWebcam();
    } else {
      setUploadedImage(null);
      setCapturedImage(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setWebcamActive(true);
        }
      } catch (err) {
        console.error("Camera access failed:", err);
        alert("Webcam access not allowed or unavailable. Feel free to use the Upload feature or choose one of our curated Presets!");
      }
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      stopWebcam();
      playInteractionChime('success');
    }
  };

  // File Upload Handlers
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result);
        setCapturedImage(null);
        stopWebcam();
        playInteractionChime('success');
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Photobooth Simulation State Machine
  const triggerSimulation = () => {
    if (generationState !== 'idle') return;
    playInteractionChime('scan');
    setGenerationState('scanning');
    setScanningProgress(0);
    setScanStepMessage('Detecting face geometry...');

    const interval = setInterval(() => {
      setScanningProgress((prev) => {
        const next = prev + 2.5;
        // Update statuses at milestones
        if (next === 25) {
          setScanStepMessage('Analyzing smile expression confidence...');
          playInteractionChime('click');
        } else if (next === 50) {
          setScanStepMessage('Resolving peace/gesture vector...');
          playInteractionChime('click');
        } else if (next === 75) {
          setScanStepMessage('Generating cinematic puzzle shards...');
          playInteractionChime('click');
        } else if (next === 90) {
          setScanStepMessage('Assembling vintage Polaroid film strip...');
          playInteractionChime('scan');
        }

        if (next >= 100) {
          clearInterval(interval);
          setGenerationState('result');
          playInteractionChime('success');
          // Launch Confetti
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#8B5CF6', '#00E5FF', '#FDE68A', '#ffffff']
          });
          return 100;
        }
        return next;
      });
    }, 100);
  };

  const resetGeneration = () => {
    playInteractionChime('click');
    setGenerationState('idle');
    setUploadedImage(null);
    setCapturedImage(null);
    setScanningProgress(0);
    setGameActive(false);
    setGameSolved(false);
  };

  // Generate a high-resolution 3:4 Polaroid-style image and prompt download
  const generatePolaroidImage = async () => {
    try {
      const DPR = 2;
      const margin = 12; // white border around card
      const footerH = 45; // thin footer strip (12-15% replacement)
      
      // Load image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = currentPhoto;
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      
      // Get original image aspect ratio
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const aspectRatio = srcW / srcH;
      
      // Determine card dimensions based on image orientation
      let cardW, cardH;
      const baseW = 300; // base card width
      
      if (aspectRatio > 1.2) {
        // Landscape
        cardW = baseW;
        cardH = Math.round(baseW / aspectRatio) + footerH + margin * 2;
      } else if (aspectRatio < 0.8) {
        // Portrait
        cardH = baseW;
        cardW = Math.round(baseW * aspectRatio) + margin * 2;
      } else {
        // Square/near-square
        cardW = baseW;
        cardH = baseW + footerH + margin * 2;
      }
      
      // Canvas dimensions
      const canvasW = cardW * DPR;
      const canvasH = cardH * DPR;
      
      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      canvas.style.width = `${cardW}px`;
      canvas.style.height = `${cardH}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(DPR, DPR);
      
      // Helper: rounded rect path
      const roundedRect = (c, x, y, w, h, r) => {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
      };
      
      // Apply cinematic filter using ImageData manipulation
      const applyFilter = () => {
        const filterMap = {
          none: { contrast: 1, saturation: 1, brightness: 1, sepia: 0 },
          portra: { contrast: 1.06, saturation: 1.12, brightness: 1.02, sepia: 0.06 },
          golden: { contrast: 1.08, saturation: 1.1, brightness: 1.06, sepia: 0 },
          tealOrange: { contrast: 1.08, saturation: 1.04, brightness: 1, sepia: 0.06 },
          mono: { contrast: 1.08, saturation: 0, brightness: 0.98, sepia: 0 }
        };
        const filter = filterMap[cinemaFilter] || filterMap.none;
        
        // Get image data for the photo area
        const imgData = ctx.getImageData(photoX, photoY, photoW, photoH);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          
          // Brightness
          r = Math.min(255, r * filter.brightness);
          g = Math.min(255, g * filter.brightness);
          b = Math.min(255, b * filter.brightness);
          
          // Contrast
          r = Math.min(255, ((r - 128) * filter.contrast) + 128);
          g = Math.min(255, ((g - 128) * filter.contrast) + 128);
          b = Math.min(255, ((b - 128) * filter.contrast) + 128);
          
          // Saturation
          const gray = r * 0.299 + g * 0.587 + b * 0.114;
          r = Math.round(gray + (r - gray) * filter.saturation);
          g = Math.round(gray + (g - gray) * filter.saturation);
          b = Math.round(gray + (b - gray) * filter.saturation);
          
          // Sepia
          if (filter.sepia > 0) {
            const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
            const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
            const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
            r = Math.round(r * (1 - filter.sepia) + sepiaR * filter.sepia);
            g = Math.round(g * (1 - filter.sepia) + sepiaG * filter.sepia);
            b = Math.round(b * (1 - filter.sepia) + sepiaB * filter.sepia);
          }
          
          data[i] = Math.max(0, Math.min(255, r));
          data[i+1] = Math.max(0, Math.min(255, g));
          data[i+2] = Math.max(0, Math.min(255, b));
        }
        
        ctx.putImageData(imgData, photoX, photoY);
      };
      
      // Paper background
      ctx.fillStyle = '#f9f8f4';
      roundedRect(ctx, 0.5, 0.5, cardW - 1, cardH - 1, 16);
      ctx.fill();
      
      // Photo area with padding
      const photoX = margin;
      const photoY = margin;
      const photoW = cardW - margin * 2;
      const photoH = cardH - margin * 2 - footerH;
      
      // Draw photo background (subtle gray)
      roundedRect(ctx, photoX, photoY, photoW, photoH, 10);
      ctx.fillStyle = '#000';
      ctx.fill();
      
      // Calculate image placement (preserve aspect ratio - no cropping)
      const imgScale = Math.min(photoW / srcW, photoH / srcH);
      const drawW = Math.round(srcW * imgScale);
      const drawH = Math.round(srcH * imgScale);
      const imgX = photoX + (photoW - drawW) / 2;
      const imgY = photoY + (photoH - drawH) / 2;
      
      // Draw the image (will be clipped to rounded rect)
      ctx.save();
      roundedRect(ctx, photoX, photoY, photoW, photoH, 10);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, drawW, drawH);
      
      // Apply filter
      applyFilter();
      ctx.restore();
      
      // Subtle vignette
      const vg = ctx.createRadialGradient(photoX + photoW/2, photoY + photoH/2, Math.min(photoW, photoH)*0.25, photoX + photoW/2, photoY + photoH/2, Math.max(photoW, photoH)*0.7);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = vg;
      ctx.fillRect(photoX, photoY, photoW, photoH);
      
      // Footer area - compact metadata
      const footerY = photoY + photoH;
      
      // Divider line
      ctx.strokeStyle = '#d9d4cd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin + 4, footerY);
      ctx.lineTo(cardW - margin - 4, footerY);
      ctx.stroke();
      
      // Compact metadata in one line
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#6f6f6f';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const metaY = footerY + 12;
      const metaText = `${userName || 'You'} • ✌ • ⭐${selectedPreset.stars || 5}`;
      ctx.fillText(metaText, margin + 8, metaY);
      
      // Generated by text (right aligned)
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'right';
      ctx.fillText('Generated by VibeSnap AI', cardW - margin - 8, metaY);
      
      // Finalize download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(userName||'vibesnap').replace(/\s+/g,'_')}_polaroid_${Math.round(cardW)}x${Math.round(cardH)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, 'image/png', 0.95);
      
    } catch (err) {
      console.error('Polaroid generation failed', err);
      alert('Failed to generate Polaroid. See console for details.');
    }
  };

  // ==========================================

  // Fisher-Yates shuffle
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const startPuzzleGame = () => {
    playInteractionChime('scan');
    const total = gameGridSize * gameGridSize;
    const indices = Array.from({ length: total }, (_, i) => i);
    const shuffled = shuffleArray(indices);
    setGameTiles(shuffled);
    setGameSelected(null);
    setGameMoves(0);
    setGameTime(0);
    setGameSolved(false);
    setShowSolution(false);
    setGameActive(true);
    // Start timer
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    gameTimerRef.current = setInterval(() => {
      setGameTime(t => t + 1);
    }, 1000);
  };

  const resetPuzzleGame = () => {
    playInteractionChime('click');
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    setGameActive(false);
    setGameSolved(false);
    setGameSelected(null);
    setGameMoves(0);
    setGameTime(0);
    setShowSolution(false);
  };

  const handleTileClick = (clickedIndex) => {
    if (gameSolved) return;
    playInteractionChime('click');

    if (gameSelected === null) {
      // First selection
      setGameSelected(clickedIndex);
    } else if (gameSelected === clickedIndex) {
      // Deselect same tile
      setGameSelected(null);
    } else {
      // Swap the two tiles
      const newTiles = [...gameTiles];
      [newTiles[gameSelected], newTiles[clickedIndex]] = [newTiles[clickedIndex], newTiles[gameSelected]];
      setGameTiles(newTiles);
      setGameMoves(m => m + 1);
      setGameSelected(null);

      // Check if solved
      const isSolved = newTiles.every((tile, idx) => tile === idx);
      if (isSolved) {
        clearInterval(gameTimerRef.current);
        setGameSolved(true);
        playInteractionChime('success');
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#8B5CF6', '#00E5FF', '#FDE68A', '#ffffff', '#ff6b6b']
        });
        setTimeout(() => confetti({
          particleCount: 100,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#8B5CF6', '#00E5FF', '#FDE68A']
        }), 300);
        setTimeout(() => confetti({
          particleCount: 100,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#8B5CF6', '#00E5FF', '#FDE68A']
        }), 600);
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current); };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Determine current active preview photo
  const currentPhoto = capturedImage || uploadedImage || selectedPreset.url;

  // Auto-scrolling Testimonials track
  const testimonials = [
    { name: "@sarah.m", text: "People thought I used Photoshop. The puzzle shards look surreal!", stars: 5 },
    { name: "@digital_nomad", text: "My Instagram exploded. Pure retro-future aesthetic in seconds.", stars: 5 },
    { name: "@lucas_art", text: "This AI is pure magic. The hand gesture trigger feels super polished.", stars: 5 },
    { name: "@jenny_design", text: "I love the polaroid crop! Assembling animation had me staring for minutes.", stars: 5 },
    { name: "@kyle_creative", text: "Linear meets Midjourney. Absolutely outstanding interface UI.", stars: 5 }
  ];

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-x-hidden select-none">

      {/* ==========================================
          ONBOARDING GATE
          ========================================== */}
      <AnimatePresence>
        {!onboardingComplete && (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        )}
      </AnimatePresence>

      {/* Background Layer */}
      <ParticlesCanvas />
      
      {/* Absolute Ambient Neon Blob Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[350px] h-[350px] rounded-full bg-brand-purple/15 blur-[120px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute bottom-[30%] right-[-10%] w-[450px] h-[450px] rounded-full bg-brand-cyan/15 blur-[140px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-brand-purple/5 blur-[180px] pointer-events-none z-0" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none z-0" />

      {/* ==========================================
          HEADER / NAVIGATION
          ========================================== */}
      <header className="relative z-50 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-brand-purple filter drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="currentColor" fillOpacity="0.1" />
            <path d="M12 2L17 12H7L12 2Z" stroke="currentColor" />
          </svg>
          <span className="font-sans text-xl font-bold tracking-wider bg-gradient-to-r from-white via-white to-brand-purple bg-clip-text text-transparent">
            VIBESNAP
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {['Features', 'How It Works', 'Puzzle Game', 'Gallery', 'Testimonials'].map((link) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-[11px] font-semibold tracking-[0.2em] text-white/70 hover:text-white uppercase transition-colors duration-300"
              onClick={() => playInteractionChime('click')}
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {/* Sound Toggle */}
          <button 
            onClick={handleSoundToggle}
            className="p-3 rounded-full glass-panel hover:glass-panel-hover text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center relative"
            aria-label={soundEnabled ? "Disable ambient sound" : "Enable ambient sound"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-brand-cyan" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-cyan"></span>
                </span>
              </>
            ) : (
              <VolumeX className="w-4 h-4 text-white/50" />
            )}
          </button>

          <a 
            href="#photobooth"
            onClick={() => playInteractionChime('click')}
            className="hidden sm:inline-flex px-5 py-2.5 rounded-full bg-brand-purple text-white text-[11px] font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all hover:scale-105"
          >
            Try Photobooth
          </a>
          <button
            onClick={() => { playInteractionChime('scan'); setShowAnalyzer(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 text-black text-xs font-semibold hover:scale-105 transition-transform"
          >
            <Scan className="w-4 h-4" /> Face Analyzer
          </button>
        </div>
      </header>

      {showAnalyzer && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAnalyzer(false)} />
          <div className="relative w-full max-w-4xl h-[80vh]">
            <button onClick={() => setShowAnalyzer(false)} className="absolute top-3 right-3 z-40 p-2 rounded-full bg-white/6 text-white">Close</button>
            <div className="h-full overflow-hidden rounded-2xl shadow-2xl border border-white/6">
              <FaceAnalyzer />
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          HERO SECTION
          ========================================== */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left column content */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20">
            <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
            <span className="text-[10px] font-bold tracking-wider text-brand-purple uppercase">
              AI HAND GESTURE PHOTOBOOTH
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif leading-[1.05] tracking-tight text-white font-medium">
            Turn Your Face <br />
            Into <span className="bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-gold bg-clip-text text-transparent">Art.</span>
          </h1>

          <div className="text-lg md:text-xl font-sans tracking-wide text-brand-gold font-light">
            Smile. Puzzle. Share.
          </div>

          <p className="text-white/70 font-light leading-relaxed max-w-xl text-base md:text-lg">
            VibeSnap AI is a cinematic photobooth that reads your hand gestures, rates your smile confidence, and splits your portrait into stunning puzzle artwork housed inside a vintage Polaroid film strip.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <a 
              href="#photobooth"
              onClick={() => playInteractionChime('click')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-brand-purple to-[#7c3aed] text-white text-xs font-bold tracking-[0.15em] uppercase shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] transition-all hover:scale-105 flex items-center gap-2 group cursor-pointer"
            >
              Try Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            
            <a 
              href="#how-it-works"
              onClick={() => playInteractionChime('click')}
              className="px-8 py-4 rounded-full glass-panel hover:glass-panel-hover text-white text-xs font-bold tracking-[0.15em] uppercase transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Watch Demo
            </a>
          </div>
        </div>

        {/* Right column: floating Polaroid mockup */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div 
            className="relative w-full max-w-[340px] aspect-[3/4] transition-all duration-200"
            onMouseMove={handlePolaroidMouseMove}
            onMouseLeave={handlePolaroidMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Polaroid Frame */}
            <div className="absolute inset-0 bg-[#f9f8f4] p-4 pb-14 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_40px_rgba(139,92,246,0.15)] flex flex-col border border-white/90 overflow-hidden group">
              
              {/* Paper grain texture filter overlay */}
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-10 bg-noise-pattern" />

              {/* Photo Area */}
              <div className="relative flex-1 bg-black rounded-lg overflow-hidden border border-black/10">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600" 
                  alt="Aesthetic face portrait" 
                  className="w-full h-full object-cover opacity-80 filter grayscale-[15%]"
                />
                
                {/* CSS Grid Puzzle Overlay simulation */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-[2px] pointer-events-none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="border border-white/20 bg-brand-purple/5 backdrop-blur-[1px]"
                      style={{ 
                        opacity: 0.7,
                        transform: `rotate(${(i % 3 - 1) * 2}deg)`
                      }}
                    />
                  ))}
                </div>

                {/* Cyber Scanner HUD */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 border border-brand-cyan/30 text-[8px] font-mono tracking-wider text-brand-cyan uppercase">
                  ✌ Peace Detected
                </div>

                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 border border-brand-gold/30 text-[8px] font-mono tracking-wider text-brand-gold uppercase">
                  Smile 96%
                </div>
              </div>

              {/* Polaroid Footer description */}
              <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-between px-5">
                <div className="flex flex-col">
                  <span className="font-serif text-[13px] text-zinc-800 italic font-semibold">
                    vibe.chill_energy
                  </span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                    VS-AI // MODEL_19
                  </span>
                </div>

                <div className="flex items-center gap-0.5 text-brand-gold filter brightness-75">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
            </div>

            {/* Glowing accent border underneath */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-brand-purple to-brand-cyan opacity-20 blur-lg -z-10 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>

      </section>

      {/* ==========================================
          INTERACTIVE DEMO / PHOTOBOOTH
          ========================================== */}
      <section id="photobooth" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-cyan uppercase">
            EXPERIENCE THE PHOTOBOOTH
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Unlock Your Digital Vibe
          </h2>
          <p className="text-white/60 font-light max-w-xl mx-auto text-sm md:text-base">
            Upload a selfie, trigger your camera, or experiment with presets. Select a hand gesture and see the AI analyze your smile.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left panel: Camera & Upload interface */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-6 md:p-8 rounded-2xl flex flex-col space-y-6 relative overflow-hidden">
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-medium tracking-wide flex items-center gap-2">
                  <Camera className="w-5 h-5 text-brand-purple" />
                  Input Capture Frame
                </h3>
                
                {/* Source choice triggers */}
                <div className="flex gap-2">
                  <button 
                    onClick={toggleWebcam}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      webcamActive 
                        ? 'bg-brand-purple text-white' 
                        : 'glass-panel text-white/70 hover:text-white'
                    }`}
                  >
                    {webcamActive ? 'Disable Camera' : 'Use Camera'}
                  </button>
                  <label className="px-4 py-2 rounded-full glass-panel hover:glass-panel-hover text-white/70 hover:text-white text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all">
                    Upload File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="relative aspect-square w-full max-w-[480px] mx-auto bg-black rounded-xl border border-white/5 overflow-hidden flex items-center justify-center group">
                
                {/* Default grid decor */}
                <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

                {/* 1. Video Web Camera stream */}
                <video 
                  ref={videoRef} 
                  playsInline 
                  muted 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    webcamActive && !capturedImage ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* 2. Photo Preview placeholder */}
                {currentPhoto && !webcamActive && (
                  <img 
                    src={currentPhoto} 
                    alt="Captured portrait preview" 
                    className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity" 
                  />
                )}

                {/* 3. Empty state instructions */}
                {!currentPhoto && !webcamActive && (
                  <div className="text-center space-y-3 z-10 px-6">
                    <Upload className="w-8 h-8 text-white/30 mx-auto" />
                    <p className="text-xs text-white/50">Drag and drop your image, upload, or trigger your camera.</p>
                  </div>
                )}

                {/* Laser scan lines (when active) */}
                {generationState === 'scanning' && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-cyan to-transparent animate-scanner shadow-[0_0_12px_#00E5FF] z-20" />
                )}

                {/* Camera Capture triggers */}
                {webcamActive && !capturedImage && (
                  <button 
                    onClick={capturePhoto}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 p-4 rounded-full bg-brand-cyan text-black hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,229,255,0.4)] cursor-pointer"
                    aria-label="Capture photo"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Presets Selection */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold tracking-wider text-white/50 uppercase">
                  Or select a Demo Preset:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        playInteractionChime('click');
                        setSelectedPreset(preset);
                        setUploadedImage(null);
                        setCapturedImage(null);
                      }}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedPreset.id === preset.id && !uploadedImage && !capturedImage
                          ? 'border-brand-purple/60 bg-brand-purple/5'
                          : 'border-white/5 bg-white/2 hover:border-white/10'
                      }`}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-900 border border-white/5">
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover opacity-80" />
                      </div>
                      <div className="text-[10px] font-semibold truncate">{preset.name}</div>
                      <div className="text-[8px] text-white/40 truncate">{preset.gesture}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cinematic Filter Options */}
              <div className="mt-4">
                <div className="text-[10px] font-bold tracking-wider text-white/50 uppercase mb-2">Cinematic Filters</div>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'portra', label: 'Kodak Portra' },
                    { id: 'golden', label: 'Golden Hour' },
                    { id: 'tealOrange', label: 'Teal & Orange' },
                    { id: 'mono', label: 'Mono Film' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setCinemaFilter(opt.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${cinemaFilter===opt.id? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow-[0_6px_20px_rgba(139,92,246,0.18)]' : 'bg-white/3 text-white/80 hover:bg-white/6'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Run Button */}
              {generationState === 'idle' && (
                <button
                  onClick={triggerSimulation}
                  disabled={!currentPhoto}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-purple via-[#7c3aed] to-brand-cyan text-white text-xs font-bold tracking-[0.15em] uppercase hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all hover:scale-[1.01]"
                >
                  Generate Polaroid Puzzle
                </button>
              )}

              {/* Generating Animation Panel */}
              {generationState === 'scanning' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono tracking-wider text-brand-cyan flex items-center gap-2">
                      <Scan className="w-4 h-4 animate-spin text-brand-cyan" />
                      {scanStepMessage}
                    </span>
                    <span className="text-xs font-mono text-white/80">{Math.round(scanningProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-100 ease-out"
                      style={{ width: `${scanningProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Complete state options */}
              {generationState === 'result' && (
                <button
                  onClick={resetGeneration}
                  className="w-full py-4 rounded-xl glass-panel hover:glass-panel-hover text-white text-xs font-bold tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Reset Photobooth
                </button>
              )}
            </div>
          </div>

          {/* Right panel: Active scanning feedback & parameters config */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6">
              <h3 className="text-lg font-medium tracking-wide flex items-center gap-2 border-b border-white/5 pb-4">
                <Sparkles className="w-5 h-5 text-brand-cyan" />
                AI Analysis Matrix
              </h3>

              <div className="space-y-5">
                {/* 1. Expression Detector */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold tracking-widest text-white/40 uppercase">Facial Expression</div>
                    <div className="text-sm font-semibold mt-1">
                      {generationState === 'result' ? 'Joy / Ecstatic ✨' : generationState === 'scanning' && scanningProgress > 25 ? 'Scanning...' : 'Awaiting input'}
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg ${generationState === 'result' ? 'bg-brand-purple/10 text-brand-purple' : 'bg-white/2 text-white/20'}`}>
                    <Smile className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Smile Rating Confidence */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold tracking-widest text-white/40 uppercase">
                    <span>Smile Rating Confidence</span>
                    <span className="font-mono text-brand-gold">
                      {generationState === 'result' ? `${uploadedImage || capturedImage ? 97 : selectedPreset.smileConfidence}%` : generationState === 'scanning' && scanningProgress > 40 ? 'Calculating...' : '0%'}
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-gold transition-all duration-300"
                      style={{ 
                        width: generationState === 'result' ? `${uploadedImage || capturedImage ? 97 : selectedPreset.smileConfidence}%` : '0%' 
                      }}
                    />
                  </div>
                </div>

                {/* 3. Hand Gesture Recognition */}
                <div className="flex items-center justify-between border-t border-b border-white/5 py-4">
                  <div>
                    <div className="text-[11px] font-bold tracking-widest text-white/40 uppercase">Hand Gesture Detected</div>
                    <div className="text-sm font-semibold mt-1">
                      {generationState === 'result' ? (uploadedImage || capturedImage ? '✌ Peace Sign' : selectedPreset.gesture) : generationState === 'scanning' && scanningProgress > 60 ? 'Analyzing...' : 'Not detected'}
                    </div>
                  </div>
                  <div className="text-xl">
                    {generationState === 'result' ? '✌' : '❓'}
                  </div>
                </div>

                {/* 4. Vibe Metric */}
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-white/40 uppercase">Vibe Rating</div>
                  <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-semibold">
                    {generationState === 'result' ? (uploadedImage || capturedImage ? 'Chill Energy ✨' : selectedPreset.vibe) : 'Calculating...'}
                  </div>
                </div>
              </div>

              {/* Scanner log stream console */}
              <div className="p-4 rounded-lg bg-black/60 border border-white/5 font-mono text-[10px] space-y-2 text-zinc-500 overflow-hidden h-[120px] relative">
                <div className="absolute top-2 right-2 text-[8px] text-brand-purple uppercase">Terminal.log</div>
                <p className="text-zinc-600">&gt;_ Init VibeSnap AI Core SDK v2026.7...</p>
                {generationState === 'scanning' && (
                  <>
                    <p className="text-zinc-400">&gt;_ Loading computer vision pipelines...</p>
                    {scanningProgress > 25 && <p className="text-brand-cyan">&gt;_ Face coordinates aligned: bounding_box_t0</p>}
                    {scanningProgress > 50 && <p className="text-brand-purple">&gt;_ Gesture vectors resolved: peace_sign_v1</p>}
                    {scanningProgress > 75 && <p className="text-brand-gold">&gt;_ Mapping geometric shard mesh to face...</p>}
                  </>
                )}
                {generationState === 'result' && (
                  <>
                    <p className="text-zinc-400">&gt;_ Analysis fully resolved.</p>
                    <p className="text-brand-cyan">&gt;_ Polaroid film compilation complete.</p>
                    <p className="text-brand-gold">&gt;_ Artifact output ready. Confetti launched.</p>
                  </>
                )}
                {generationState === 'idle' && (
                  <p className="italic text-zinc-600">&gt;_ Click Generate to start camera analysis pipeline...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================
            AI RESULT SHOWCASE (Conditional layout overlay)
            ========================================== */}
        <AnimatePresence>
          {generationState === 'result' && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-20 glass-panel p-6 md:p-10 rounded-3xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <span className="px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-[9px] font-bold tracking-wider uppercase">
                  COMPLETED ARTIFACT
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                {/* Left side: Original Face vs Scattered Puzzle Shards */}
                <div className="lg:col-span-6 space-y-6">
                  <h3 className="text-xl font-serif font-medium text-brand-gold">
                    Artistic Assembly Frame
                  </h3>
                  <p className="text-white/60 font-light text-sm">
                    Hover over the Polaroid on the right to witness the custom AI puzzle pieces lock together perfectly.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase mb-2">Original Input</div>
                      <div className="aspect-[4/5] rounded-xl overflow-hidden border border-white/5 relative bg-zinc-950">
                        <img src={currentPhoto} alt="Original input" className="w-full h-full object-cover filter brightness-75" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase mb-2">Artistic Shard Preview</div>
                      <div className="aspect-[4/5] rounded-xl overflow-hidden border border-white/5 relative bg-zinc-950 flex items-center justify-center p-3">
                        {/* Static puzzle mesh sample representation */}
                        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                        <div className="relative w-full h-full grid grid-cols-3 grid-rows-3 gap-1">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="rounded bg-brand-purple/20 border border-brand-purple/35 flex items-center justify-center text-[10px] font-mono text-brand-cyan"
                              style={{ 
                                transform: `rotate(${(i - 4) * 5}deg) translate(${(i % 2 - 0.5) * 5}px, ${(Math.floor(i/3) - 1) * 5}px)` 
                              }}
                            >
                              0{i}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Real Assembling Polaroid Puzzle */}
                <div className="lg:col-span-6 flex flex-col items-center">
                  <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase mb-4 self-start lg:self-center">
                    Your premium Polaroid frame is ready
                  </div>

                  <div className="relative w-full max-w-[300px] group" style={{ aspectRatio: '1' }}>
                    <motion.div 
                      className="absolute inset-0 bg-[#fbfaf6] p-3 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.9),_0_0_30px_rgba(0,229,255,0.1)] border border-white/90 overflow-hidden flex flex-col"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-10 bg-noise-pattern" />

                      {/* Image area - preserves aspect ratio */}
                      <div className="relative flex-1 rounded-lg overflow-hidden border border-black/10 bg-black mb-2 flex items-center justify-center">
                        <img 
                          src={currentPhoto} 
                          alt="Generated Polaroid" 
                          className="w-full h-full transition-all duration-300"
                          style={{ 
                            objectFit: 'contain', 
                            objectPosition: 'center', 
                            filter: previewFilterString(cinemaFilter),
                            backgroundColor: '#000'
                          }} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Compact footer - 45px height */}
                      <div className="bg-[#faf9f5] flex flex-col justify-between" style={{ height: '45px', padding: '4px 8px' }}>
                        {/* Divider */}
                        <div className="w-full h-px bg-zinc-300/60" />
                        
                        {/* Single line metadata */}
                        <div className="flex items-center justify-between text-[7px] font-mono tracking-wider text-zinc-600 px-1">
                          <span className="font-bold">{userName || 'You'}</span>
                          <span>✌</span>
                          <span>⭐{selectedPreset.stars || 5}</span>
                          <span className="text-zinc-400">Generated by VibeSnap AI</span>
                        </div>
                      </div>
                    </motion.div>
                    <div className="absolute -inset-1.5 rounded-xl bg-gradient-to-b from-brand-cyan to-brand-purple opacity-20 blur-md -z-10 pointer-events-none" />
                  </div>

                  <div className="mt-8 flex flex-wrap justify-center gap-3 w-full max-w-sm">
                    <button 
                      onClick={() => {
                        playInteractionChime('click');
                        generatePolaroidImage();
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-brand-purple text-white text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                    >
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button 
                      onClick={() => {
                        playInteractionChime('click');
                        navigator.clipboard.writeText("https://vibesnap.ai/result/4739ad5f");
                        alert("Result link copied! Share with your friends on Instagram / Twitter.");
                      }}
                      className="py-3 px-4 rounded-xl glass-panel hover:glass-panel-hover text-white text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                      aria-label="Share Polaroid link"
                    >
                      <Share2 className="w-4 h-4" /> Share
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ==========================================
          PUZZLE GAME SECTION
          ========================================== */}
      <section id="puzzle-game" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-gold uppercase">
            INTERACTIVE CHALLENGE
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Play the Puzzle Game
          </h2>
          <p className="text-white/60 font-light max-w-xl mx-auto text-sm md:text-base">
            Can you reassemble the shattered portrait? Click two tiles to swap them. Solve the puzzle as fast as possible!
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="glass-panel rounded-3xl p-6 md:p-10 space-y-6">

            {/* Top Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-white/40 uppercase">Grid Size:</span>
                {[3, 4].map((size) => (
                  <button
                    key={size}
                    onClick={() => { setGameGridSize(size); if (gameActive) startPuzzleGame(); playInteractionChime('click'); }}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                      gameGridSize === size
                        ? 'bg-brand-purple text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                        : 'glass-panel text-white/60 hover:text-white'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>

              {/* Stats Bar */}
              {gameActive && (
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase">Moves</div>
                    <div className="text-xl font-mono font-bold text-brand-cyan">{gameMoves}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-bold tracking-widest text-white/30 uppercase">Time</div>
                    <div className="text-xl font-mono font-bold text-brand-gold">{formatTime(gameTime)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Puzzle Board */}
            <div className="relative">
              {/* Solution Preview Overlay */}
              <AnimatePresence>
                {showSolution && gameActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 rounded-2xl overflow-hidden border-2 border-brand-cyan/50 shadow-[0_0_30px_rgba(0,229,255,0.3)]"
                  >
                    <img src={currentPhoto} alt="Puzzle solution" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="px-4 py-2 rounded-full bg-black/60 border border-brand-cyan/40 text-brand-cyan text-xs font-bold tracking-wider uppercase">
                        Solution Preview
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Victory Overlay */}
              <AnimatePresence>
                {gameSolved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="absolute inset-0 z-40 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}
                  >
                    <div className="text-center space-y-5 px-8">
                      <div className="text-5xl">🎉</div>
                      <h3 className="text-2xl font-serif font-bold text-white">
                        Puzzle Solved!
                      </h3>
                      <div className="flex gap-6 justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-mono font-bold text-brand-cyan">{gameMoves}</div>
                          <div className="text-[9px] text-white/50 uppercase tracking-widest mt-1">Moves</div>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                          <div className="text-3xl font-mono font-bold text-brand-gold">{formatTime(gameTime)}</div>
                          <div className="text-[9px] text-white/50 uppercase tracking-widest mt-1">Time</div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 justify-center text-brand-gold">
                        {Array.from({ length: gameMoves < 20 ? 5 : gameMoves < 40 ? 4 : 3 }).map((_, i) => (
                          <Star key={i} className="w-5 h-5 fill-current" />
                        ))}
                      </div>
                      <p className="text-white/60 text-xs">
                        {gameMoves < 20 ? 'Legendary speed! ⚡' : gameMoves < 40 ? 'Great performance! 💜' : 'You cracked it! 🔮'}
                      </p>
                      <div className="flex gap-3 justify-center flex-wrap">
                        <button
                          onClick={startPuzzleGame}
                          className="px-6 py-2.5 rounded-full bg-brand-purple text-white text-xs font-bold tracking-wider uppercase hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Play Again
                        </button>
                        <button
                          onClick={resetPuzzleGame}
                          className="px-6 py-2.5 rounded-full glass-panel hover:glass-panel-hover text-white text-xs font-bold tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Exit Game
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Puzzle Grid */}
              {gameActive ? (
                <div
                  className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gameGridSize}, 1fr)`,
                    gap: '3px',
                    background: 'rgba(0,0,0,0.6)'
                  }}
                >
                  {gameTiles.map((tileIndex, displayIndex) => {
                    const totalTiles = gameGridSize * gameGridSize;
                    const row = Math.floor(tileIndex / gameGridSize);
                    const col = tileIndex % gameGridSize;
                    const isSelected = gameSelected === displayIndex;
                    const isCorrect = tileIndex === displayIndex;

                    return (
                      <motion.button
                        key={displayIndex}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: displayIndex * 0.01, type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => handleTileClick(displayIndex)}
                        aria-label={`Puzzle tile ${displayIndex + 1}`}
                        className={`relative overflow-hidden cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-brand-cyan shadow-[0_0_15px_rgba(0,229,255,0.6)] z-10 scale-[0.97]'
                            : gameSolved || isCorrect
                            ? 'ring-1 ring-brand-gold/30'
                            : 'hover:ring-1 hover:ring-white/20 hover:brightness-110'
                        }`}
                        style={{
                          backgroundImage: `url(${currentPhoto})`,
                          backgroundSize: `${gameGridSize * 100}% ${gameGridSize * 100}%`,
                          backgroundPosition: `${(col / (gameGridSize - 1)) * 100}% ${(row / (gameGridSize - 1)) * 100}%`,
                        }}
                      >
                        {/* Number badge */}
                        {!gameSolved && (
                          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-bold ${
                            isCorrect ? 'bg-brand-gold/80 text-black' : 'bg-black/60 text-white/60'
                          }`}>
                            {tileIndex + 1}
                          </span>
                        )}
                        {/* Selected highlight shimmer */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand-cyan/15 pointer-events-none" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                /* Idle State: Show photo preview with start prompt */
                <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/5 relative group cursor-pointer" onClick={startPuzzleGame}>
                  <img src={currentPhoto} alt="Puzzle preview" className="w-full h-full object-cover brightness-50 group-hover:brightness-60 transition-all duration-300" />
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      backdropFilter: 'blur(2px)'
                    }}
                  >
                    {/* Grid overlay preview */}
                    <div
                      className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)`,
                        backgroundSize: `${100 / gameGridSize}% ${100 / gameGridSize}%`
                      }}
                    />
                    <div className="text-5xl">🧩</div>
                    <div className="text-center space-y-1">
                      <div className="text-white font-semibold tracking-wide">Ready to Play?</div>
                      <div className="text-white/60 text-xs">Your portrait will be scrambled into {gameGridSize}×{gameGridSize} = {gameGridSize * gameGridSize} tiles</div>
                    </div>
                    <div className="px-6 py-2.5 rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all">
                      Start Puzzle Game
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Controls */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
              {gameActive && !gameSolved ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={startPuzzleGame}
                      className="px-4 py-2 rounded-full glass-panel hover:glass-panel-hover text-white text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" /> Shuffle
                    </button>
                    <button
                      onMouseDown={() => setShowSolution(true)}
                      onMouseUp={() => setShowSolution(false)}
                      onMouseLeave={() => setShowSolution(false)}
                      onTouchStart={() => setShowSolution(true)}
                      onTouchEnd={() => setShowSolution(false)}
                      className="px-4 py-2 rounded-full glass-panel hover:glass-panel-hover text-brand-cyan text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer select-none"
                      aria-label="Hold to reveal solution"
                    >
                      Hold: Show Solution
                    </button>
                  </div>
                  <button
                    onClick={resetPuzzleGame}
                    className="px-4 py-2 rounded-full glass-panel text-white/50 hover:text-white text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Exit Game
                  </button>
                </>
              ) : !gameActive ? (
                <div className="w-full text-center">
                  <p className="text-white/40 text-xs font-light">
                    Generate your photobooth portrait above, then come back to play the puzzle!
                  </p>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          FEATURES SECTION
          ========================================== */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-purple uppercase">
            DESIGN MEETS TECHNOLOGY
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Cinematic AI Mechanics
          </h2>
          <p className="text-white/60 font-light max-w-xl mx-auto text-sm md:text-base">
            Crafted for creators. Features that transform an ordinary capture frame into high-end gallery pieces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-brand-purple/10 text-brand-purple w-fit">
              <Smile className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">AI Smile Rating</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Calculates smile expression vectors and prints a premium star rating directly onto your Polaroid film.
            </p>
            <div className="text-xs font-semibold text-brand-gold group-hover:underline flex items-center gap-1">
              ★★★★★ Score Rating <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-brand-purple/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan w-fit">
              <Grid className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">Puzzle Face Generator</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Splits facial features into gorgeous 3D shards using computer vision, assembling them inside a vintage Polaroid.
            </p>
            <div className="text-xs font-semibold text-brand-cyan group-hover:underline flex items-center gap-1">
              Assemble Shards <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-brand-cyan/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-brand-gold/10 text-brand-gold w-fit">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">Gesture Detection</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Detects peace signs, hearts, and thumbs-up to inject unique design tags into the generated film strips.
            </p>
            <div className="text-xs font-semibold text-brand-gold group-hover:underline flex items-center gap-1">
              Read Gestures <ChevronRight className="w-3.5 h-3.5" />
            </div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-brand-gold/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>

          {/* Card 4 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-white/5 text-white/70 w-fit">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">Instant Polaroid Strip</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Frames your portrait in classic film proportions, with customizable hand-written styling and real paper texture.
            </p>
            <div className="text-xs font-semibold text-white/80 group-hover:underline flex items-center gap-1">
              Generate Instantly <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 5 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-brand-purple/10 text-brand-purple w-fit">
              <Instagram className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">Share on Instagram</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Tailored resolution formats ready for direct story publication, complete with custom aesthetic neon crops.
            </p>
            <div className="text-xs font-semibold text-brand-purple group-hover:underline flex items-center gap-1">
              One-Click Share <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 6 */}
          <div 
            onClick={() => playInteractionChime('click')}
            className="glass-panel p-8 rounded-2xl space-y-4 hover:glass-panel-hover group transition-all duration-300 hover:-translate-y-2 cursor-pointer relative"
          >
            <div className="p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan w-fit">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium tracking-wide">One Click Download</h3>
            <p className="text-white/60 font-light text-sm leading-relaxed">
              Download lossless web archives of your puzzle art instantly to print or archive in your personal creative feed.
            </p>
            <div className="text-xs font-semibold text-brand-cyan group-hover:underline flex items-center gap-1">
              Download Lossless <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>
      </section>

      {/* ==========================================
          HOW IT WORKS (TIMELINE)
          ========================================== */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-cyan uppercase">
            CREATIVE WORKFLOW
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Cinematic Timeline
          </h2>
          <p className="text-white/60 font-light max-w-xl mx-auto text-sm md:text-base">
            Understand how our AI constructs your digital puzzle in six simple visual milestones.
          </p>
        </div>

        {/* Horizontal Scroll/Grid Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 relative">
          
          {/* Connecting line for tablet & desktop */}
          <div className="hidden lg:block absolute top-[44px] left-[8%] right-[8%] h-[1px] bg-gradient-to-r from-brand-purple/20 via-brand-cyan/20 to-brand-gold/20 -z-10" />

          {[
            { step: '01', title: 'Show Gesture', desc: 'Trigger the photobooth by raising a hand gesture (peace, thumbs up).' },
            { step: '02', title: 'Upload Selfie', desc: 'Allow webcam access or drop any image portrait from your feed.' },
            { step: '03', title: 'AI Detection', desc: 'VibeSnap analyzes facial muscles and rates smile confidence metrics.' },
            { step: '04', title: 'Puzzle Shards', desc: 'Face geometry is sliced into 16 abstract 3D cinematic shards.' },
            { step: '05', title: 'Film Print', desc: 'Shards compile into an off-white Polaroid film frame with vintage crop.' },
            { step: '06', title: 'Download & Share', desc: 'Claim your high-res artifact and showcase your vibe with the world.' }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-start space-y-4 relative group">
              <div 
                className="w-10 h-10 rounded-full bg-brand-secondary border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-brand-purple group-hover:border-brand-purple/40 group-hover:bg-brand-purple/5 transition-all shadow-[0_0_10px_rgba(0,0,0,0.8)] cursor-pointer"
                onClick={() => playInteractionChime('click')}
              >
                {item.step}
              </div>
              <h3 className="text-sm font-semibold tracking-wide mt-2">{item.title}</h3>
              <p className="text-white/50 font-light text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ==========================================
          GALLERY SECTION
          ========================================== */}
      <section id="gallery" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-purple uppercase">
            CREATOR SHOWCASE
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Featured Artifacts
          </h2>
          <p className="text-white/60 font-light max-w-xl mx-auto text-sm md:text-base">
            Behold some of the finest generated puzzle Polaroid strips created by the VibeSnap community.
          </p>
        </div>

        {/* Pinterest Masonry layout */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {[
            { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400', vibe: 'Chill Energy ✨', smile: '96%', gesture: '✌ Peace' },
            { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', vibe: 'Zen Matrix 🌀', smile: '98%', gesture: '👍 Thumbs Up' },
            { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400', vibe: 'Cosmic Smile 🔮', smile: '91%', gesture: '👌 OK Vibe' },
            { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400', vibe: 'Synth Energy 🔮', smile: '94%', gesture: '🫶 Heart Vibe' },
            { url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=400', vibe: 'Techno Vibe ⚡', smile: '97%', gesture: '✌ Peace Sign' },
            { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400', vibe: 'Neon Smile ✨', smile: '99%', gesture: '👍 Thumbs Up' }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className="break-inside-avoid relative rounded-2xl bg-[#faf9f5] p-3 pb-12 shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-white/80 overflow-hidden group cursor-pointer hover:scale-[1.02] hover:-rotate-1 transition-all duration-300"
              onClick={() => {
                playInteractionChime('click');
                alert(`Inspecting ${item.vibe}. High-fidelity vector layout is active.`);
              }}
            >
              {/* Image with subtle hover zoom */}
              <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-black">
                <img 
                  src={item.url} 
                  alt="Aesthetic puzzle placeholder" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Visual grid puzzle overlay */}
                <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-[1px] pointer-events-none opacity-40">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="border border-white/20 bg-brand-purple/5" />
                  ))}
                </div>
              </div>

              {/* Hand-written styled details */}
              <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-between px-4">
                <div className="flex flex-col">
                  <span className="font-serif text-[11px] text-zinc-800 italic font-semibold">{item.vibe.toLowerCase().replace(/\s+/g, '')}</span>
                  <span className="text-[7px] font-mono text-zinc-400 tracking-wider mt-0.5">{item.gesture} // {item.smile}</span>
                </div>
                <div className="flex items-center gap-0.5 text-brand-gold filter brightness-75 scale-90">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS SECTION
          ========================================== */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-t border-white/5 overflow-hidden">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-cyan uppercase">
            CREATOR TESTIMONIALS
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#fdfbf6]">
            Community Whispers
          </h2>
        </div>

        {/* Marquee sliding track container */}
        <div className="relative w-full flex items-center overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-15 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-15 pointer-events-none" />

          {/* Animating rail using Framer Motion */}
          <motion.div 
            animate={{ x: [0, -1200] }}
            transition={{
              repeat: Infinity,
              ease: 'linear',
              duration: 35
            }}
            className="flex gap-6 whitespace-nowrap"
          >
            {/* Double the list to ensure infinite wrapping */}
            {[...testimonials, ...testimonials, ...testimonials].map((item, idx) => (
              <div 
                key={idx} 
                className="inline-block w-[300px] glass-panel p-6 rounded-2xl space-y-3 whitespace-normal hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-brand-purple font-semibold">{item.name}</span>
                  <div className="flex text-brand-gold scale-75">
                    {Array.from({ length: item.stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-white/70 font-light leading-relaxed">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==========================================
          FINAL CTA SECTION
          ========================================== */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        
        <div className="glass-panel p-10 md:p-16 rounded-3xl space-y-8 relative overflow-hidden">
          
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-purple/20 blur-[100px] pointer-events-none z-0" />

          <span className="text-[10px] font-bold tracking-[0.25em] text-brand-gold uppercase z-10 relative">
            EMBARK ON THE EXPERIMENT
          </span>

          <h2 className="text-4xl md:text-6xl font-serif text-[#fdfbf6] max-w-2xl mx-auto z-10 relative leading-tight">
            Ready to discover your vibe?
          </h2>

          <p className="text-white/60 font-light max-w-md mx-auto text-sm md:text-base z-10 relative">
            Step in front of the lens. Synthesize your smile into cinematic art inside our vintage digital photobooth today.
          </p>

          <div className="pt-4 z-10 relative">
            <a 
              href="#photobooth"
              onClick={() => playInteractionChime('click')}
              className="px-10 py-4 rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_40px_rgba(0,229,255,0.5)] transition-all hover:scale-105 inline-flex items-center gap-2 group cursor-pointer"
            >
              Generate Your Puzzle <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>

      </section>

      {/* ==========================================
          FOOTER SECTION
          ========================================== */}
      <footer className="relative z-10 border-t border-white/5 bg-brand-secondary/40 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Logo & description column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <svg className="w-6 h-6 text-brand-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="currentColor" fillOpacity="0.1" />
                <path d="M12 2L17 12H7L12 2Z" stroke="currentColor" />
              </svg>
              <span className="font-sans text-lg font-bold tracking-wider">VIBESNAP</span>
            </div>
            <p className="text-white/50 font-light text-xs max-w-sm leading-relaxed">
              Your Smile. Your Vibe. Your Puzzle. Premium AI hand gesture photobooth transforming selfies into digital Polaroid art.
            </p>
          </div>

          {/* Links column */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Navigation</h4>
            <ul className="space-y-2 text-xs text-white/60 font-light">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#gallery" className="hover:text-white transition-colors">Gallery Feed</a></li>
              <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
            </ul>
          </div>

          {/* Legal and Socials column */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Legal & Socials</h4>
            <div className="flex gap-3 text-white/60">
              <a href="https://github.com" target="_blank" className="p-2 rounded-full glass-panel hover:text-white transition-colors" aria-label="GitHub"><Github className="w-4 h-4" /></a>
              <a href="https://twitter.com" target="_blank" className="p-2 rounded-full glass-panel hover:text-white transition-colors" aria-label="Twitter"><Twitter className="w-4 h-4" /></a>
              <a href="https://instagram.com" target="_blank" className="p-2 rounded-full glass-panel hover:text-white transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
              <a href="https://google.com" target="_blank" className="p-2 rounded-full glass-panel hover:text-white transition-colors" aria-label="Google"><Globe className="w-4 h-4" /></a>
            </div>
            <div className="text-[10px] text-white/40 font-light">
              &copy; {new Date().getFullYear()} VibeSnap AI. All rights reserved. <br />
              <a href="#" className="hover:underline">Privacy Policy</a> &bull; <a href="#" className="hover:underline">Terms of Service</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Hidden helper Canvas for photo grabbing */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

    </div>
  );
}
