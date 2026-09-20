import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  Brain,
  Loader,
  PhoneOff,
  Sparkles,
  Zap,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── EXPLICIT STATE MACHINE ────────────────────────────────────────────────
export const STATES = {
  IDLE: 'IDLE',
  CONNECTING: 'CONNECTING',
  LISTENING: 'LISTENING',
  USER_SPEAKING: 'USER_SPEAKING',
  THINKING: 'THINKING',
  AI_SPEAKING: 'AI_SPEAKING',
  MUTED: 'MUTED',
  ERROR: 'ERROR',
  ENDED: 'ENDED',
};

const STATE_CONFIG = {
  IDLE: {
    color: '#4f46e5',
    bgBadge: '#eef2ff',
    label: 'Start Talk',
    icon: Mic,
    description: 'Tap to start live voice session',
  },
  CONNECTING: {
    color: '#d97706',
    bgBadge: '#fef3c7',
    label: '🎙️ Connecting...',
    icon: Loader,
    description: 'Establishing live audio session...',
  },
  LISTENING: {
    color: '#059669',
    bgBadge: '#d1fae5',
    label: '🎧 Listening...',
    icon: Mic,
    description: 'Listening for your voice. Speak naturally anytime.',
  },
  USER_SPEAKING: {
    color: '#0284c7',
    bgBadge: '#e0f2fe',
    label: '🗣️ You\'re Speaking...',
    icon: Mic,
    description: 'Capturing your speech and streaming audio...',
  },
  THINKING: {
    color: '#7c3aed',
    bgBadge: '#ede9fe',
    label: '🧠 Thinking...',
    icon: Brain,
    description: 'AI is thinking and processing...',
  },
  AI_SPEAKING: {
    color: '#4f46e5',
    bgBadge: '#eef2ff',
    label: '🔊 AI Speaking...',
    icon: Volume2,
    description: 'AI is speaking. You can speak or tap to interrupt.',
  },
  MUTED: {
    color: '#64748b',
    bgBadge: '#f1f5f9',
    label: '🔇 Microphone Muted',
    icon: MicOff,
    description: 'Microphone is OFF. Live session remains connected.',
  },
  ERROR: {
    color: '#dc2626',
    bgBadge: '#fee2e2',
    label: '⚠️ Connection Error',
    icon: MicOff,
    description: 'Voice session encountered an issue. Tap to retry.',
  },
  ENDED: {
    color: '#475569',
    bgBadge: '#f1f5f9',
    label: '⭕ Talk Ended',
    icon: PhoneOff,
    description: 'Session ended cleanly.',
  },
};

// ─── AUDIO CONSTANTS ────────────────────────────────────────────────────────
const BARGE_IN_THRESHOLD = 0.075; // RMS to interrupt AI while speaking
const SPEECH_START_THRESHOLD = 0.022; // RMS to transition from LISTENING to USER_SPEAKING
const SPEECH_SILENCE_DURATION_MS = 750; // Silence time before transitioning USER_SPEAKING -> THINKING

// ─── WAVEFORM COMPONENT ────────────────────────────────────────────────────
function WaveformBars({ active, color, volume = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 24 }}>
      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => {
        const dynamicH = active ? Math.max(4, Math.min(22, (h * 3.5) * (0.6 + volume * 1.5))) : 4;
        return (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              height: dynamicH,
              background: active ? (color || '#4f46e5') : '#cbd5e1',
              transition: 'height 0.1s ease',
            }}
          />
        );
      })}
    </div>
  );
}

export default function VoiceAssistant({ studentContext }) {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [voiceState, setVoiceState] = useState(STATES.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const [history, setHistory] = useState([]);
  const [inputText, setInputText] = useState('');

  // Refs for audio pipeline & state coordination
  const voiceStateRef = useRef(STATES.IDLE);
  const isMutedRef = useRef(false);
  const wsRef = useRef(null);
  const micStreamRef = useRef(null);
  const inputAudioCtxRef = useRef(null);
  const outputAudioCtxRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const activeSourcesRef = useRef([]);
  const nextPlayTimeRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const isTurnCompleteRef = useRef(false);
  const lastSpeechTimeRef = useRef(0);
  const isConnectingOrConnectedRef = useRef(false);
  const messagesEndRef = useRef(null);

  // Sync state ref
  const updateVoiceState = useCallback((newState) => {
    console.log(`[Talk State] ${voiceStateRef.current} -> ${newState}`);
    voiceStateRef.current = newState;
    setVoiceState(newState);
  }, []);

  // Auto scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudioSession(false);
    };
  }, []);

  // Convert Float32 buffer to 16kHz 16-bit PCM Int16Array
  const convertFloat32ToInt16 = (float32Array) => {
    const l = float32Array.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  };

  // Stop active AI speech playback immediately (interruption/barge-in ONLY)
  // NOTE: This is NEVER called during normal Mute!
  const interruptPlayback = useCallback(() => {
    console.log('[Talk] Stopping active audio playback immediately');
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {
        // Source may have already ended
      }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    isSpeakingRef.current = false;
    isTurnCompleteRef.current = false;
  }, []);

  // Play 24kHz PCM chunk received from Gemini Live
  const playAudioChunk = useCallback((pcmBase64) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
        });
      }
      const ctx = outputAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Base64 to binary
      const binaryString = window.atob(pcmBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Create AudioBuffer
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      // Create BufferSource
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      activeSourcesRef.current.push(source);

      // Seamless scheduling
      const now = ctx.currentTime;
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now + 0.04; // 40ms jitter buffer
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
      isSpeakingRef.current = true;

      // Ensure state is AI_SPEAKING
      if (voiceStateRef.current !== STATES.AI_SPEAKING) {
        updateVoiceState(STATES.AI_SPEAKING);
      }

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        // If all scheduled audio chunks have finished AND server turn is complete:
        if (activeSourcesRef.current.length === 0 && isTurnCompleteRef.current) {
          console.log('[Talk] AI finished speaking. Returning to turn state.');
          isSpeakingRef.current = false;
          isTurnCompleteRef.current = false;
          // Return to Listening if mic is ON, or Muted if mic is OFF
          // LIVE SESSION REMAINS FULLY CONNECTED!
          if (!isMutedRef.current) {
            updateVoiceState(STATES.LISTENING);
          } else {
            updateVoiceState(STATES.MUTED);
          }
        }
      };
    } catch (err) {
      console.error('[Talk] Audio playback error:', err);
    }
  }, [updateVoiceState]);

  // Complete cleanup function - ONLY called when End Talk is triggered!
  const cleanupAudioSession = useCallback((showEnded = true) => {
    console.log('[Talk] Cleaning up session...');
    interruptPlayback();

    // Stop microphone tracks
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      micStreamRef.current = null;
    }

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {}
      scriptProcessorRef.current = null;
    }

    // Close AudioContexts
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'end' }));
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    isConnectingOrConnectedRef.current = false;
    isSpeakingRef.current = false;
    isTurnCompleteRef.current = false;
    setIsMuted(false);
    isMutedRef.current = false;
    setLiveVolume(0);

    if (showEnded) {
      updateVoiceState(STATES.ENDED);
      setTimeout(() => {
        updateVoiceState(STATES.IDLE);
      }, 1500);
    } else {
      updateVoiceState(STATES.IDLE);
    }
  }, [interruptPlayback, updateVoiceState]);

  // Start real Gemini Live Talk session
  const startTalkSession = async () => {
    // Prevent duplicate sessions
    if (isConnectingOrConnectedRef.current) {
      console.warn('[Talk] Previous session already active. Cleaning up before new connection.');
      cleanupAudioSession(false);
    }

    console.log('[Talk] 1. Requesting browser microphone permission with echo cancellation...');
    updateVoiceState(STATES.CONNECTING);
    isConnectingOrConnectedRef.current = true;
    setIsMuted(false);
    isMutedRef.current = false;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;
      console.log('[Talk] 2. Microphone stream acquired successfully!');
    } catch (micErr) {
      console.error('[Talk] Microphone permission error:', micErr);
      isConnectingOrConnectedRef.current = false;
      updateVoiceState(STATES.ERROR);
      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        toast.error('Microphone access was denied. Please allow microphone permission in your browser.');
      } else if (micErr.name === 'NotFoundError') {
        toast.error('No microphone found on your system.');
      } else {
        toast.error(`Microphone error: ${micErr.message || 'Unable to open mic'}`);
      }
      return;
    }

    // Resume or init output AudioContext for response playback
    try {
      outputAudioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000,
      });
      await outputAudioCtxRef.current.resume();
    } catch (e) {
      console.warn('[Talk] Output AudioContext resume warning:', e);
    }

    // Connect WebSocket to Gemini Live backend
    console.log('[Talk] 3. Connecting to Gemini Live WebSocket...');
    const token = localStorage.getItem('access_token');
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${WS_URL}/voice/session?token=${token}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Talk] 4. Live Voice WebSocket connected! Initializing input pipeline...');
      updateVoiceState(STATES.LISTENING);
      toast.success('Connected to Live Voice! Speak naturally.', { id: 'talk-conn-toast' });

      // Audio capture & streaming pipeline
      try {
        const inputCtx = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000,
        });
        inputAudioCtxRef.current = inputCtx;
        const sourceNode = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState !== WebSocket.OPEN) return;

          // 1. If microphone is muted by user, drop frame completely
          // (Microphone OFF only; speaker output continues uninterrupted)
          if (isMutedRef.current) {
            setLiveVolume(0);
            return;
          }

          const inputData = e.inputBuffer.getChannelData(0);

          // 2. Compute RMS volume
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setLiveVolume(Math.min(1, rms * 5));

          // 3. CRITICAL ECHO PREVENTION:
          // When AI is speaking through speakers, DO NOT send mic input to Gemini
          // UNLESS the user is actively speaking with intentional volume (barge-in)!
          if (isSpeakingRef.current) {
            if (rms > BARGE_IN_THRESHOLD) {
              console.log('[Talk] Barge-in speech detected (RMS:', rms.toFixed(3), ') -> Interrupting AI!');
              interruptPlayback();
              wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
              updateVoiceState(STATES.USER_SPEAKING);
              lastSpeechTimeRef.current = Date.now();
              const pcm16 = convertFloat32ToInt16(inputData);
              wsRef.current.send(pcm16.buffer);
            }
            // Speaker sound below threshold is suppressed to prevent echo loops!
            return;
          }

          // 4. NORMAL LISTENING / USER SPEAKING
          if (rms >= SPEECH_START_THRESHOLD) {
            if (voiceStateRef.current !== STATES.USER_SPEAKING) {
              updateVoiceState(STATES.USER_SPEAKING);
            }
            lastSpeechTimeRef.current = Date.now();
            const pcm16 = convertFloat32ToInt16(inputData);
            wsRef.current.send(pcm16.buffer);
          } else {
            // Silence frame: check if user recently stopped speaking
            if (voiceStateRef.current === STATES.USER_SPEAKING) {
              const timeSinceSpeech = Date.now() - lastSpeechTimeRef.current;
              if (timeSinceSpeech > SPEECH_SILENCE_DURATION_MS) {
                console.log('[Talk] User finished speaking -> Transitioning to THINKING');
                updateVoiceState(STATES.THINKING);
              }
            }
            // Send background frames so Gemini's VAD can detect end-of-turn
            const pcm16 = convertFloat32ToInt16(inputData);
            wsRef.current.send(pcm16.buffer);
          }
        };

        sourceNode.connect(processor);
        processor.connect(inputCtx.destination);
        console.log('[Talk] 5. Audio recording pipeline active and streaming.');
      } catch (err) {
        console.error('[Talk] Audio processor setup error:', err);
        updateVoiceState(STATES.ERROR);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('[Talk] Gemini Live Ready:', data.message);
          if (!isMutedRef.current) {
            updateVoiceState(STATES.LISTENING);
          }
        } else if (data.type === 'audio_chunk') {
          // Play real audio from Gemini Live through speakers
          if (data.data) {
            playAudioChunk(data.data);
          }
        } else if (data.type === 'transcript') {
          if (data.text) {
            setHistory((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'ai' && last.live) {
                return [...prev.slice(0, -1), { role: 'ai', text: last.text + data.text, live: true }];
              }
              return [...prev, { role: 'ai', text: data.text, live: true }];
            });
          }
        } else if (data.type === 'interrupted') {
          console.log('[Talk] Gemini Live reported interruption');
          interruptPlayback();
          if (!isMutedRef.current) {
            updateVoiceState(STATES.LISTENING);
          } else {
            updateVoiceState(STATES.MUTED);
          }
        } else if (data.type === 'turn_complete') {
          console.log('[Talk] Gemini Live model turn complete');
          isTurnCompleteRef.current = true;
          setHistory((prev) =>
            prev.map((msg) => (msg.live ? { ...msg, live: false } : msg))
          );
          // If all audio finished playing, return to LISTENING (or MUTED if mic is off)
          // LIVE SESSION REMAINS FULLY CONNECTED!
          if (activeSourcesRef.current.length === 0) {
            isSpeakingRef.current = false;
            isTurnCompleteRef.current = false;
            if (!isMutedRef.current) {
              updateVoiceState(STATES.LISTENING);
            } else {
              updateVoiceState(STATES.MUTED);
            }
          }
        } else if (data.type === 'error') {
          console.error('[Talk] Server error:', data.message);
          toast.error(data.message || 'Voice error');
          updateVoiceState(STATES.ERROR);
        }
      } catch (e) {
        console.error('[Talk] Error parsing WebSocket message:', e);
      }
    };

    ws.onerror = (err) => {
      console.error('[Talk] WebSocket connection error:', err);
      toast.error('Failed to connect to voice server.');
      updateVoiceState(STATES.ERROR);
    };

    ws.onclose = () => {
      console.log('[Talk] WebSocket closed');
      if (voiceStateRef.current !== STATES.ENDED && voiceStateRef.current !== STATES.IDLE) {
        cleanupAudioSession(true);
      }
    };
  };

  // Microphone toggle (MIC ON / MIC OFF)
  // MUTE = MICROPHONE OFF ONLY, NOT SPEAKER/AUDIO OFF!
  // If user mutes while AI is speaking, AI MUST CONTINUE AND FINISH THE ANSWER!
  const toggleMic = () => {
    if (isMuted) {
      // UNMUTE: Enable microphone
      setIsMuted(false);
      isMutedRef.current = false;
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
      }
      // If AI is not currently speaking, transition state back to LISTENING
      if (!isSpeakingRef.current) {
        updateVoiceState(STATES.LISTENING);
      }
      toast.success('Microphone ON (Listening)', { id: 'mic-toast', icon: '🎙️' });
    } else {
      // MUTE: Disable microphone input ONLY
      setIsMuted(true);
      isMutedRef.current = true;
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setLiveVolume(0);
      // If AI is currently speaking, DO NOT stop audio playback!
      // AI continues and finishes its answer through the speakers!
      if (!isSpeakingRef.current) {
        updateVoiceState(STATES.MUTED);
      }
      toast('Microphone Muted (Speaker active)', { id: 'mic-toast', icon: '🔇' });
    }
  };

  // End Talk - ONLY normal action that disconnects the Live session!
  const handleEndTalk = () => {
    console.log('[Talk] User explicitly clicked End Talk. Disconnecting session...');
    cleanupAudioSession(true);
  };

  // Manual interrupt button
  const handleManualInterrupt = () => {
    console.log('[Talk] User clicked manual Interrupt button');
    interruptPlayback();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    if (!isMutedRef.current) {
      updateVoiceState(STATES.LISTENING);
    } else {
      updateVoiceState(STATES.MUTED);
    }
  };

  // Text input fallback
  const sendTextPrompt = (text) => {
    if (!text.trim()) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast('Starting Talk session...', { icon: '🎙️' });
      startTalkSession();
      return;
    }
    setHistory((prev) => [...prev, { role: 'user', text }]);
    updateVoiceState(STATES.THINKING);
    wsRef.current.send(JSON.stringify({ type: 'text', text }));
  };

  const config = STATE_CONFIG[voiceState] || STATE_CONFIG.IDLE;
  const Icon = config.icon;
  const isSessionActive =
    voiceState === STATES.CONNECTING ||
    voiceState === STATES.LISTENING ||
    voiceState === STATES.USER_SPEAKING ||
    voiceState === STATES.THINKING ||
    voiceState === STATES.AI_SPEAKING ||
    voiceState === STATES.MUTED;

  return (
    <>
      {/* Floating Talk Button */}
      <motion.button
        className={`voice-btn ${voiceState === STATES.LISTENING || voiceState === STATES.USER_SPEAKING ? 'listening' : ''}`}
        onClick={() => {
          if (!open) {
            setOpen(true);
            if (!isSessionActive) {
              startTalkSession();
            }
          } else {
            // Toggling button while open simply minimizes/hides modal view
            // NOTE: DOES NOT DISCONNECT! Only "End Talk" disconnects!
            setOpen(false);
          }
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        style={{
          background: isSessionActive
            ? `radial-gradient(circle, ${config.color}, #3730a3)`
            : 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35)',
        }}
        title={isSessionActive ? "Live Voice Session Active (Click to show/hide)" : "Start Live Voice Talk"}
      >
        {open ? <X size={22} color="white" /> : <Mic size={22} color="white" />}
      </motion.button>

      {/* Voice Assistant Talk Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              bottom: 104,
              right: 28,
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              background: 'var(--clr-bg-800, #ffffff)',
              border: '1px solid var(--border-soft, #e2e8f0)',
              borderRadius: 24,
              overflow: 'hidden',
              zIndex: 399,
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Header with State, Waveform & Minimize */}
            <div style={{
              padding: '16px 20px',
              background: 'var(--clr-bg-800, #ffffff)',
              borderBottom: '1px solid var(--border-soft, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: config.bgBadge,
                  border: `1px solid ${config.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    size={19}
                    color={config.color}
                    style={voiceState === STATES.CONNECTING ? { animation: 'spin 1s linear infinite' } : {}}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--ink, #0f172a)', fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Live Voice Talk
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(79, 70, 229, 0.12)',
                      color: 'var(--blue, #4f46e5)',
                    }}>
                      Aoede
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: config.color, fontWeight: 700 }}>
                    {voiceState === STATES.AI_SPEAKING && isMuted
                      ? '🔊 AI Speaking... (Mic Muted)'
                      : config.label}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <WaveformBars
                  active={voiceState === STATES.LISTENING || voiceState === STATES.USER_SPEAKING || voiceState === STATES.AI_SPEAKING}
                  color={config.color}
                  volume={liveVolume}
                />
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--clr-bg-700, #f8fafc)',
                    border: '1px solid var(--border-soft, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--muted, #64748b)',
                  }}
                  title="Minimize (Session stays connected)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Description / State banner */}
            <div style={{
              padding: '8px 20px',
              background: config.bgBadge,
              borderBottom: '1px solid var(--border-soft, #f1f5f9)',
              fontSize: '0.72rem',
              color: config.color,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>
                {voiceState === STATES.AI_SPEAKING && isMuted
                  ? 'AI is speaking. (Microphone is muted)'
                  : config.description}
              </span>
              {voiceState === STATES.AI_SPEAKING && (
                <button
                  onClick={handleManualInterrupt}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'var(--clr-bg-800, #ffffff)',
                    border: '1px solid var(--border-soft, #c7d2fe)',
                    color: 'var(--blue, #4f46e5)',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Interrupt
                </button>
              )}
            </div>

            {/* Live Conversation Stream View */}
            <div style={{
              padding: '16px 20px',
              maxHeight: 220,
              minHeight: 140,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'var(--clr-bg-700, #f8fafc)',
            }}>
              {history.length === 0 && voiceState !== STATES.CONNECTING && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted, #64748b)', fontSize: '0.85rem' }}>
                  <Sparkles size={20} color="#4f46e5" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                  Speak naturally into your microphone.
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted, #94a3b8)', marginTop: 4 }}>
                    Multi-turn continuous real-time voice conversation.
                  </div>
                </div>
              )}

              {history.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    padding: '9px 14px',
                    borderRadius: 14,
                    fontSize: '0.82rem',
                    lineHeight: 1.55,
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #4338ca, #2557e0)' : 'var(--clr-bg-800, #ffffff)',
                    border: `1px solid ${msg.role === 'user' ? '#3730a3' : 'var(--border-soft, #e2e8f0)'}`,
                    color: msg.role === 'user' ? '#ffffff' : 'var(--ink, #1e293b)',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(37, 87, 224, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-soft, #f1f5f9)',
              background: 'var(--clr-bg-800, #ffffff)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Main Action Buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isSessionActive ? (
                  <>
                    {/* MIC ON / MIC OFF Toggle Button */}
                    <button
                      onClick={toggleMic}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: isMuted ? 'var(--clr-bg-700, #f8fafc)' : 'rgba(16, 185, 129, 0.12)',
                        border: isMuted ? '1px solid var(--border-soft, #cbd5e1)' : '1px solid #10b981',
                        color: isMuted ? 'var(--muted, #64748b)' : '#059669',
                      }}
                      title={isMuted ? 'Click to unmute microphone' : 'Click to mute microphone (speaker remains ON)'}
                    >
                      {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                      {isMuted ? '🔇 MIC OFF' : '🎙️ MIC ON'}
                    </button>

                    {/* End Talk Button - ONLY NORMAL DISCONNECT ACTION */}
                    <button
                      onClick={handleEndTalk}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid #ef4444',
                        color: '#dc2626',
                      }}
                      title="Disconnect and terminate Live session"
                    >
                      <PhoneOff size={15} /> 🔴 End Talk
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={startTalkSession}
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      borderRadius: 12,
                      padding: '11px 16px',
                      fontWeight: 700,
                    }}
                  >
                    <Mic size={16} /> Start Live Voice Talk
                  </button>
                )}
              </div>

              {/* Text fallback input */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Type a message to speak back..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendTextPrompt(inputText);
                      setInputText('');
                    }
                  }}
                  style={{
                    flex: 1,
                    fontSize: '0.82rem',
                    borderRadius: 10,
                    padding: '8px 12px',
                    border: '1px solid var(--border-soft, #cbd5e1)',
                    background: 'var(--clr-bg-700, #f8fafc)',
                    color: 'var(--ink, #0f172a)',
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    sendTextPrompt(inputText);
                    setInputText('');
                  }}
                  disabled={!inputText.trim()}
                  style={{ width: 36, height: 36, padding: 0, borderRadius: 10, flexShrink: 0 }}
                >
                  <Zap size={14} />
                </button>
              </div>

              {/* Footer status text */}
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center' }}>
                Real-Time Live Voice · 16kHz PCM Input · 24kHz Audio Output · Multi-turn
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
