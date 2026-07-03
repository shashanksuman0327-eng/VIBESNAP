import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// Premium AI Face Analyzer component
export default function FaceAnalyzer() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const cameraRef = useRef(null)
  const [status, setStatus] = useState('Idle')
  const [running, setRunning] = useState(false)
  const [landmarksCount, setLandmarksCount] = useState(0)
  const [analysis, setAnalysis] = useState({
    smile: 0,
    symmetry: 0,
    mood: 'Neutral',
    vibe: 0,
    confidence: 0,
    aesthetic: 0,
  })

  useEffect(() => {
    let faceMesh
    let mounted = true

    // We'll load MediaPipe from CDN (or use existing globals) to avoid Vite static import resolution.

    const onResults = (results) => {
      if (!mounted) return
      const ctx = canvasRef.current.getContext('2d')
      const video = videoRef.current
      const w = canvasRef.current.width = video.videoWidth || 640
      const h = canvasRef.current.height = video.videoHeight || 480

      // Clear
      ctx.clearRect(0, 0, w, h)

      // Dim background video frame
      ctx.save()
      ctx.drawImage(video, 0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()

      // Status updates
      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setStatus('Detecting face')
        setLandmarksCount(0)
        setAnalysis(a => ({ ...a, confidence: 0 }))
      } else {
        setStatus('Mapping landmarks')
        const landmarks = results.multiFaceLandmarks[0]
        setLandmarksCount(landmarks.length)
        // Draw scanning beam
        drawScanBeam(ctx, w, h)
        // Draw neon mesh
        drawNeonMesh(ctx, landmarks, w, h)
        // Compute simple analysis metrics
        const metrics = computeMetrics(landmarks)
        setAnalysis(metrics)
        setStatus('Analyzing')
      }
    }

    // Helper to inject CDN scripts and wait for globals
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve()
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = () => resolve()
        s.onerror = (e) => reject(e)
        document.head.appendChild(s)
      })
    }

    const initMediaPipe = async () => {
      if (!window.FaceMesh) {
        try { await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.164/face_mesh.js') } catch (e) { console.warn('Failed loading FaceMesh from CDN:', e) }
      }
      if (!window.Camera) {
        try { await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.1.162/camera_utils.js') } catch (e) { console.warn('Failed loading CameraUtils from CDN:', e) }
      }

      const FM = window.FaceMesh
      const CameraCtor = window.Camera || (window.CameraUtils && window.CameraUtils.Camera)

      if (!FM) { console.warn('FaceMesh not available after CDN load; aborting.') ; return }

      faceMesh = new FM({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` })
      faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 })
      faceMesh.onResults(onResults)

      if (videoRef.current) {
        if (CameraCtor) {
          try {
            cameraRef.current = new CameraCtor(videoRef.current, {
              onFrame: async () => { try { await faceMesh.send({ image: videoRef.current }) } catch (e) {} },
              width: 1280, height: 960,
            })
          } catch (err) {
            console.warn('Failed to initialize Camera Utils, will use fallback getUserMedia:', err)
            // Fallback is handled in startCamera()
          }
        } else {
          console.warn('Camera Utils not available, will use fallback getUserMedia')
          // Fallback is handled in startCamera()
        }
      }
    }

    initMediaPipe()

    return () => {
      mounted = false
      if (cameraRef.current) cameraRef.current.stop()
      if (faceMesh) faceMesh.close && faceMesh.close()
    }
  }, [])

  function stopCamera() {
    setRunning(false)
    try {
      if (cameraRef.current && cameraRef.current.stop) {
        cameraRef.current.stop()
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks()
        tracks.forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    } catch (e) {
      console.warn('Error stopping camera:', e)
    }
    setStatus('Idle')
  }

  function toggleCamera() {
    if (running) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  function startCamera() {
    setRunning(true)
    setStatus('Starting camera')
    try {
      if (!cameraRef.current) {
        console.warn('Camera object not initialized, attempting fallback getUserMedia...')
        setStatus('Requesting camera access')
        // Fallback: use getUserMedia directly
        navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 960 },
            facingMode: 'user'
          } 
        }).then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
            setStatus('Detecting face')
          }
        }).catch(err => {
          console.warn('Camera access error:', err)
          if (err.name === 'NotAllowedError') {
            setStatus('Camera permission denied')
          } else if (err.name === 'NotFoundError') {
            setStatus('No camera device found')
          } else {
            setStatus(`Camera error: ${err.message}`)
          }
          setRunning(false)
        })
      } else {
        cameraRef.current.start()
        setStatus('Detecting face')
      }
    } catch (e) {
      console.warn('Camera start error:', e)
      setStatus(`Error: ${e.message || 'Camera failed'}`)
      setRunning(false)
    }
  }

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setStatus('Loading image')
    const url = URL.createObjectURL(file)
    const video = videoRef.current
    video.srcObject = null
    video.src = url
    video.play()
    // trigger a single frame analysis via camera utils plugin (faceMesh will pick it up)
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 rounded-2xl bg-[rgba(10,10,15,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.04)] p-4 shadow-xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full bg-gradient-to-br from-[#0f1724]/30 via-transparent to-[#0b1220]/30" />
          </div>

          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">AI Face Analyzer</h3>
              <div className="flex items-center gap-2">
                <button onClick={toggleCamera} className="px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm">{running ? 'Stop' : 'Start Camera'}</button>
                <label className="px-3 py-1 rounded-md bg-transparent border border-[rgba(255,255,255,0.06)] text-xs text-white cursor-pointer">
                  Upload
                  <input onChange={handleUpload} accept="image/*" type="file" className="hidden" />
                </label>
              </div>
            </div>

            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[rgba(255,255,255,0.03)]">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-cyan-300">Status: <span className="text-white font-medium">{status}</span></div>
              <div className="text-sm text-white/60">Landmarks: <span className="text-white font-medium">{landmarksCount}</span></div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/3 flex flex-col gap-3">
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }} className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] backdrop-blur-sm">
            <h4 className="text-white font-semibold mb-2">Analysis</h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Smile" value={`${Math.round(analysis.smile)}`} color="from-pink-500 to-rose-500" />
              <StatCard label="Symmetry" value={`${Math.round(analysis.symmetry)}`} color="from-cyan-400 to-cyan-600" />
              <StatCard label="Mood" value={analysis.mood} color="from-amber-400 to-yellow-600" />
              <StatCard label="Vibe" value={`${Math.round(analysis.vibe)}`} color="from-violet-500 to-purple-700" />
              <StatCard label="Confidence" value={`${Math.round(analysis.confidence)}`} color="from-green-400 to-emerald-600" />
              <StatCard label="Aesthetic" value={`${Math.round(analysis.aesthetic)}`} color="from-sky-400 to-indigo-600" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="p-3 rounded-2xl bg-gradient-to-br from-[rgba(15,10,30,0.4)] to-[rgba(5,5,10,0.25)] border border-[rgba(255,255,255,0.03)]">
            <h5 className="text-white text-sm font-medium mb-2">HUD</h5>
            <div className="flex flex-col gap-2">
              <div className="text-xs text-white/60">Real-time messages</div>
              <div className="flex gap-2 items-center">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 animate-[hudbar_3s_linear_infinite]" style={{ width: `${Math.min(100, analysis.confidence)}%` }} />
                </div>
                <div className="text-xs text-white/70 w-20 text-right">{Math.round(analysis.confidence)}%</div>
              </div>
              <div className="text-xs text-cyan-200">Messages:</div>
              <div className="text-sm text-white/80">{status === 'Mapping landmarks' ? 'Mapping landmarks' : status === 'Detecting face' ? 'Detecting face' : status === 'Analyzing' ? 'Analyzing smile' : status}</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-semibold bg-clip-text text-transparent" style={{ background: `linear-gradient(90deg, var(--tw-gradient-stops))` }}>
        <motion.span initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="text-white">{value}</motion.span>
      </div>
    </div>
  )
}

// Draw a moving horizontal scan-beam
function drawScanBeam(ctx, w, h) {
  const t = Date.now() / 800
  const y = (Math.sin(t) * 0.5 + 0.5) * h
  const grad = ctx.createLinearGradient(0, y - 40, 0, y + 40)
  grad.addColorStop(0, 'rgba(80,200,255,0)')
  grad.addColorStop(0.45, 'rgba(80,200,255,0.06)')
  grad.addColorStop(0.5, 'rgba(140,85,255,0.12)')
  grad.addColorStop(0.55, 'rgba(80,200,255,0.06)')
  grad.addColorStop(1, 'rgba(80,200,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, y - 40, w, 80)
}

// Draw glowing dots and connecting lines
function drawNeonMesh(ctx, landmarks, w, h) {
  const pts = landmarks.map(p => ({ x: p.x * w, y: p.y * h }))
  // connections: connect neighbors within a radius
  ctx.lineWidth = 1
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    for (let j = i + 1; j < pts.length && j < i + 20; j++) {
      const b = pts[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d = Math.hypot(dx, dy)
      if (d < Math.min(w, h) * 0.08) {
        const alpha = 0.12 * (1 - d / (Math.min(w, h) * 0.08))
        ctx.beginPath()
        ctx.strokeStyle = `rgba(130,90,255,${alpha})`
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
  }

  // dots
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    ctx.beginPath()
    ctx.fillStyle = 'rgba(0,255,255,0.9)'
    ctx.shadowColor = 'rgba(110,255,255,0.85)'
    ctx.shadowBlur = 12
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

// Compute simple heuristics for demo metrics
function computeMetrics(landmarks) {
  if (!landmarks || landmarks.length === 0) return { smile: 0, symmetry: 0, mood: 'Neutral', vibe: 0, confidence: 0, aesthetic: 0 }
  // smile: distance between mouth corners vs height
  const leftMouth = landmarks[61]
  const rightMouth = landmarks[291]
  const topLip = landmarks[13]
  const bottomLip = landmarks[14]
  const mouthW = distance(leftMouth, rightMouth)
  const mouthH = distance(topLip, bottomLip)
  const smile = Math.max(0, Math.min(100, (mouthW / (mouthH + 1e-6)) * 40))

  // symmetry: compare left vs right eye distances to nose
  const leftEye = landmarks[33]
  const rightEye = landmarks[263]
  const nose = landmarks[1]
  const leftDist = distance(leftEye, nose)
  const rightDist = distance(rightEye, nose)
  const symmetry = Math.max(0, 100 - (Math.abs(leftDist - rightDist) / ((leftDist + rightDist) / 2 + 1e-6)) * 200)

  // mood heuristic
  const mood = smile > 55 ? 'Happy' : smile > 25 ? 'Content' : 'Neutral'

  // confidence: proportional to number of landmarks found
  const confidence = Math.min(100, (landmarks.length / 468) * 100)

  // vibe & aesthetic: blended heuristic
  const vibe = (smile * 0.5 + symmetry * 0.3 + confidence * 0.2)
  const aesthetic = (symmetry * 0.6 + confidence * 0.4)

  return { smile, symmetry, mood, vibe, confidence, aesthetic }
}

function distance(a, b) {
  if (!a || !b) return 0
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}
