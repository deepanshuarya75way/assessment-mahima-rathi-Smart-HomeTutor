import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VideoHeader } from '../../components/video/VideoHeader';
import { VideoControls } from '../../components/video/VideoControls';
import { VideoErrorOverlay } from '../../components/video/VideoErrorOverlay';

export const VideoCall = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // WebRTC & Socket Refs
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const isCleaningUpRef = useRef(false);

  // Component State
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [statusState, setStatusState] = useState('connecting');
  const [statusText, setStatusText] = useState('Initializing Classroom...');
  const [callSeconds, setCallSeconds] = useState(0);

  // Interactive Controls State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPeerVideoOff, setIsPeerVideoOff] = useState(false);
  const [isPeerAudioMuted, setIsPeerAudioMuted] = useState(false);

  // Error Overlay State
  const [errorOverlay, setErrorOverlay] = useState({ isOpen: false, title: '', message: '' });

  // WebRTC STUN Configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      ...(window.TURN_CONFIG ? [window.TURN_CONFIG] : []),
    ],
  };

  // Timer Effect
  useEffect(() => {
    let timerInterval = null;
    if (statusState === 'connected') {
      timerInterval = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [statusState]);

  // Format Call Timer MM:SS
  const formatTimer = (totalSecs) => {
    const mins = String(Math.floor(totalSecs / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Fetch authorized video call session metadata
  useEffect(() => {
    if (bookingId) {
      fetchSessionDetails();
    } else {
      showError('Invalid Session', 'No video call booking ID was provided.');
    }
  }, [bookingId]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/video-call/details/${bookingId}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setSessionData(data);
        setLoading(false);
      } else {
        showError('Session Unavailable', data.message || 'Unable to access video call session.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch Session Details Error:', err);
      showError('Connection Error', 'Failed to verify video call session details.');
      setLoading(false);
    }
  };

  // Initialize Media & Socket signaling when sessionData is loaded
  useEffect(() => {
    if (!sessionData) return;

    let isSubscribed = true;

    const startCallEngine = async () => {
      const mediaSuccess = await initLocalMedia();
      if (mediaSuccess && isSubscribed) {
        initSocketSignaling();
      }
    };

    startCallEngine();

    return () => {
      isSubscribed = false;
      teardownCall('Classroom session exited.');
    };
  }, [sessionData]);

  // Acquire Local Camera & Microphone
  const initLocalMedia = async () => {
    try {
      console.log('[WebRTC] Requesting local media devices (Camera + Microphone)...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      console.log('[WebRTC] Local media stream initialized successfully.');
      return true;
    } catch (err) {
      console.error('[WebRTC] Media Device Error:', err);
      let msg = 'Could not access your camera or microphone. Please check browser permissions and allow device access.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone and Camera permission was denied. Please allow device permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No compatible camera or microphone hardware found on your device.';
      }
      showError('Media Access Denied', msg);
      return false;
    }
  };

  // Initialize Socket.IO Signaling
  const initSocketSignaling = () => {
    if (!sessionData) return;

    console.log('[Signaling] Connecting to Socket.IO signaling server...');
    const ioFunc = window.io || (typeof io !== 'undefined' ? io : null);
    if (!ioFunc) {
      showError('Socket Error', 'Socket.IO client script not available.');
      return;
    }
    const socket = ioFunc();
    socketRef.current = socket;

    const { bookingId: bId, user, peerUser } = sessionData;

    socket.on('connect', () => {
      console.log(`[Signaling] Socket connected with ID: ${socket.id}`);
      updateStatus('connecting', 'Joining call room...');

      socket.emit('join-video-room', {
        bookingId: bId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
      });
    });

    socket.on('room-joined', ({ peerCount }) => {
      console.log(`[Signaling] Room joined. Total peers in room: ${peerCount}`);
      createPeerConnection();

      if (peerCount === 1) {
        updateStatus('connecting', `Waiting for ${peerUser.name || 'participant'} to join...`);
      } else {
        updateStatus('connecting', 'Peer detected. Establishing WebRTC connection...');
      }
    });

    socket.on('peer-joined', async ({ userName: newPeerName }) => {
      console.log(`[Signaling] Peer joined room: ${newPeerName}`);
      updateStatus('connecting', 'Peer connected. Initializing handshake...');

      createPeerConnection();
      await initiateOffer();
    });

    socket.on('webrtc-offer', async ({ offer }) => {
      console.log('[Signaling] Received WebRTC SDP OFFER from peer.');
      await handleOffer(offer);
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      console.log('[Signaling] Received WebRTC SDP ANSWER from peer.');
      await handleAnswer(answer);
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      console.log('[Signaling] Received ICE Candidate from peer.');
      await handleIceCandidate(candidate);
    });

    socket.on('peer-media-state-changed', ({ type, enabled }) => {
      console.log(`[Signaling] Peer changed ${type} state to: ${enabled}`);
      if (type === 'video') {
        setIsPeerVideoOff(!enabled);
      } else if (type === 'audio') {
        setIsPeerAudioMuted(!enabled);
      }
    });

    socket.on('call-ended', ({ reason }) => {
      console.log('[Signaling] Received call-ended event:', reason);
      teardownCall(reason || 'Call session ended.');
    });

    socket.on('peer-disconnected', ({ reason }) => {
      console.warn('[Signaling] Peer disconnected:', reason);
      updateStatus('disconnected', `${peerUser.name || 'Participant'} disconnected.`);
      setTimeout(() => {
        teardownCall(`${peerUser.name || 'Participant'} disconnected.`);
      }, 3000);
    });

    socket.on('video-error', ({ message }) => {
      showError('Video Session Notice', message);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket Connection Error:', err);
      updateStatus('disconnected', 'Signaling Server Offline');
    });
  };

  // Create RTCPeerConnection
  const createPeerConnection = () => {
    if (peerConnectionRef.current) return;

    console.log('[WebRTC] Creating RTCPeerConnection instance...');
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    remoteStreamRef.current = new MediaStream();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && sessionData) {
        socketRef.current.emit('webrtc-ice-candidate', {
          bookingId: sessionData.bookingId,
          candidate: event.candidate,
          senderId: sessionData.user.id,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.track) {
        remoteStreamRef.current.addTrack(event.track);
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch((err) => console.warn('Remote video play catch:', err));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed to:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          updateStatus('connected', 'Connected - HD Video Class');
          break;
        case 'connecting':
          updateStatus('connecting', 'Connecting WebRTC media...');
          break;
        case 'disconnected':
          updateStatus('disconnected', 'Reconnecting call...');
          break;
        case 'failed':
          updateStatus('disconnected', 'Connection Failed');
          break;
        case 'closed':
          updateStatus('disconnected', 'Call Ended');
          break;
        default:
          break;
      }
    };
  };

  // SDP Offer Initiation
  const initiateOffer = async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      console.log('[WebRTC] Creating SDP Offer...');
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      if (socketRef.current && sessionData) {
        socketRef.current.emit('webrtc-offer', {
          bookingId: sessionData.bookingId,
          offer: pc.localDescription,
          senderId: sessionData.user.id,
        });
      }
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  // SDP Offer Handling
  const handleOffer = async (offer) => {
    try {
      if (!peerConnectionRef.current) {
        createPeerConnection();
      }
      const pc = peerConnectionRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTC] Remote description (OFFER) set successfully.');

      await processIceCandidateQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current && sessionData) {
        socketRef.current.emit('webrtc-answer', {
          bookingId: sessionData.bookingId,
          answer: pc.localDescription,
          senderId: sessionData.user.id,
        });
      }
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  // SDP Answer Handling
  const handleAnswer = async (answer) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[WebRTC] Remote description (ANSWER) set successfully.');
        await processIceCandidateQueue();
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  // ICE Candidate Handling
  const handleIceCandidate = async (candidate) => {
    try {
      const rtcCandidate = new RTCIceCandidate(candidate);
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(rtcCandidate);
      } else {
        iceCandidateQueueRef.current.push(rtcCandidate);
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  };

  const processIceCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    while (iceCandidateQueueRef.current.length > 0 && pc) {
      const candidate = iceCandidateQueueRef.current.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  };

  // Interactive Media Toggles
  const handleToggleAudio = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newMuted = !isAudioMuted;
      audioTrack.enabled = !newMuted;
      setIsAudioMuted(newMuted);

      if (socketRef.current && sessionData) {
        socketRef.current.emit('media-state-toggle', {
          bookingId: sessionData.bookingId,
          type: 'audio',
          enabled: !newMuted,
          senderId: sessionData.user.id,
        });
      }
    }
  };

  const handleToggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const newOff = !isVideoOff;
      videoTrack.enabled = !newOff;
      setIsVideoOff(newOff);

      if (socketRef.current && sessionData) {
        socketRef.current.emit('media-state-toggle', {
          bookingId: sessionData.bookingId,
          type: 'video',
          enabled: !newOff,
          senderId: sessionData.user.id,
        });
      }
    }
  };

  const handleToggleScreen = async () => {
    try {
      if (!isScreenSharing) {
        console.log('[WebRTC] Requesting Screen Share stream...');
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        const pc = peerConnectionRef.current;
        if (pc) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenSharing();
        };
      } else {
        stopScreenSharing();
      }
    } catch (err) {
      console.warn('Screen Sharing Error / Cancelled:', err);
    }
  };

  const stopScreenSharing = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    const cameraTrack = localStreamRef.current ? localStreamRef.current.getVideoTracks()[0] : null;
    const pc = peerConnectionRef.current;
    if (pc && cameraTrack) {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(cameraTrack);
      }
    }
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const handleEndCall = () => {
    if (socketRef.current && sessionData) {
      socketRef.current.emit('leave-video-room', {
        bookingId: sessionData.bookingId,
        userId: sessionData.user.id,
      });
    }
    teardownCall('Call ended');
  };

  const teardownCall = (reason = 'Call ended') => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log('[WebRTC] Executing full call teardown...', reason);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const userRole = sessionData && sessionData.user ? sessionData.user.role : 'student';
    navigate(`/dashboard/${userRole.toLowerCase()}?message=${encodeURIComponent(reason)}`);
  };

  const updateStatus = (stateClass, labelText) => {
    setStatusState(stateClass);
    setStatusText(labelText);
  };

  const showError = (title, message) => {
    setErrorOverlay({ isOpen: true, title, message });
  };

  const peerUser = sessionData ? sessionData.peerUser : { name: 'Peer', role: 'Participant' };
  const user = sessionData ? sessionData.user : { name: authUser?.name || 'You', role: authUser?.role || 'User' };
  const tutorProfile = sessionData ? sessionData.tutorProfile : {};
  const subjectStr = tutorProfile.subjects && tutorProfile.subjects.length ? tutorProfile.subjects.join(', ') : 'Online Tutoring Session';
  const peerAvatar = (peerUser.name || peerUser.role).substring(0, 2).toUpperCase();
  const userAvatar = (user.name || user.role).substring(0, 2).toUpperCase();

  return (
    <div className="video-call-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f172a', color: '#f8fafc' }}>
      
      {/* INJECT EJS EQUIVALENT CSS STYLES FOR WEBRTC VIDEO CLASSROOM */}
      <style>{`
        :root {
          --bg-dark: #0f172a;
          --card-bg: rgba(30, 41, 59, 0.85);
          --accent-blue: #0284c7;
          --accent-green: #10b981;
          --accent-red: #ef4444;
          --accent-warning: #f59e0b;
          --text-light: #f8fafc;
          --text-muted: #94a3b8;
          --border-glow: rgba(255, 255, 255, 0.1);
        }

        .call-header {
          height: 64px;
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-glow);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 10;
        }

        .call-title-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .call-logo {
          font-weight: 800;
          font-size: 18px;
          color: var(--accent-blue);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .class-badge {
          background: rgba(2, 132, 199, 0.2);
          color: #38bdf8;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .peer-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .status-badge.connecting {
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .status-badge.connected {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(52, 211, 153, 0.3);
        }

        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
        }

        .call-timer {
          font-family: monospace;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-light);
          background: rgba(0, 0, 0, 0.4);
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-glow);
        }

        .video-viewport {
          flex: 1;
          position: relative;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        #remoteVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #090d16;
        }

        .peer-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at center, #1e293b 0%, #020617 100%);
          z-index: 2;
          transition: opacity 0.5s ease;
        }

        .avatar-circle {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 42px;
          font-weight: 700;
          color: #ffffff;
          box-shadow: 0 0 30px rgba(2, 132, 199, 0.4);
          margin-bottom: 20px;
        }

        .peer-muted-badge {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(239, 68, 68, 0.85);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          z-index: 6;
        }

        .local-video-wrapper {
          position: absolute;
          bottom: 96px;
          right: 24px;
          width: 260px;
          height: 165px;
          border-radius: 16px;
          overflow: hidden;
          background: #0f172a;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
          z-index: 5;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .local-video-wrapper:hover {
          transform: scale(1.03);
          border-color: var(--accent-blue);
        }

        #localVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .local-placeholder {
          position: absolute;
          inset: 0;
          background: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          z-index: 2;
        }

        .local-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0284c7, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 18px;
          color: #ffffff;
        }

        .cam-off-badge {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }

        .local-user-label {
          position: absolute;
          bottom: 8px;
          left: 8px;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 3;
        }

        .call-controls {
          height: 80px;
          background: var(--card-bg);
          backdrop-filter: blur(12px);
          border-top: 1px solid var(--border-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 0 24px;
          z-index: 10;
        }

        .control-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-light);
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .control-btn.off {
          background: #ef4444 !important;
          color: #ffffff !important;
        }

        .control-btn.end-call {
          width: auto;
          padding: 0 28px;
          border-radius: 28px;
          background: #dc2626;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          gap: 10px;
          flex-shrink: 0;
        }

        .error-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 6, 23, 0.9);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .error-card {
          background: #1e293b;
          border: 1px solid #dc2626;
          border-radius: 16px;
          max-width: 440px;
          width: 100%;
          padding: 28px;
          text-align: center;
        }

        .error-card i {
          font-size: 48px;
          color: #ef4444;
          margin-bottom: 16px;
        }

        .error-card h3 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        .error-card p {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .btn-return {
          display: inline-block;
          background: var(--accent-blue);
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>

      {/* HEADER BAR */}
      <VideoHeader
        subject={subjectStr}
        statusState={statusState}
        statusText={statusText}
        callTimerText={formatTimer(callSeconds)}
      />

      {/* MAIN VIDEO VIEWPORT */}
      <main className="video-viewport">
        {/* PEER WAITING & CAMERA OFF OVERLAY PLACEHOLDER */}
        {(statusState !== 'connected' || isPeerVideoOff) && (
          <div className="peer-placeholder" style={{ opacity: 1, display: 'flex' }}>
            <div className="avatar-circle">{peerAvatar}</div>
            <h3>
              {isPeerVideoOff
                ? `${peerUser.name}'s camera is off`
                : `Waiting for ${peerUser.name} (${peerUser.role})`}
            </h3>
            <p>
              {isPeerVideoOff ? (
                <><i className="fa-solid fa-video-slash"></i> Video stream paused by participant</>
              ) : (
                <><i className="fa-solid fa-signal"></i> Establishing secure peer-to-peer WebRTC connection...</>
              )}
            </p>
          </div>
        )}

        {/* PEER MUTED MIC BADGE */}
        {isPeerAudioMuted && (
          <div className="peer-muted-badge">
            <i className="fa-solid fa-microphone-slash"></i> {peerUser.name} is muted
          </div>
        )}

        {/* REMOTE VIDEO STREAM */}
        <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline />

        {/* LOCAL VIDEO STREAM OVERLAY */}
        <div className="local-video-wrapper">
          <video
            ref={localVideoRef}
            id="localVideo"
            autoPlay
            playsInline
            muted
            style={{ display: isVideoOff ? 'none' : 'block' }}
          />

          {isVideoOff && (
            <div className="local-placeholder" style={{ display: 'flex' }}>
              <div className="local-avatar">{userAvatar}</div>
              <span className="cam-off-badge">
                <i className="fa-solid fa-video-slash"></i> Camera Off
              </span>
            </div>
          )}

          <div className="local-user-label">
            <span>
              <i className={`fa-solid ${isAudioMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} style={isAudioMuted ? { color: '#ef4444' } : undefined}></i>
            </span>
            <span>You ({user.name})</span>
          </div>
        </div>
      </main>

      {/* FLOATING CONTROLS BAR */}
      <VideoControls
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreen={handleToggleScreen}
        onEndCall={handleEndCall}
      />

      {/* ERROR OVERLAY */}
      <VideoErrorOverlay
        isOpen={errorOverlay.isOpen}
        title={errorOverlay.title}
        message={errorOverlay.message}
        userRole={sessionData && sessionData.user ? sessionData.user.role : 'student'}
        onReturn={() => {
          const role = sessionData && sessionData.user ? sessionData.user.role : 'student';
          navigate(`/dashboard/${role.toLowerCase()}`);
        }}
      />
    </div>
  );
};
