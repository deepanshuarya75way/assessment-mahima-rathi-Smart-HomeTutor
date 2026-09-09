import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import { FaVideo, FaPhoneSlash, FaPhoneVolume } from 'react-icons/fa';

export const SocketCallListener = () => {
  const { userId, userRole, userName } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [callStatusMsg, setCallStatusMsg] = useState('');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const currentUserIdStr = userId ? String(userId) : '';

    if (currentUserIdStr) {
      socket.emit('join', { userId: currentUserIdStr, role: userRole });
      socket.emit('register-user', { userId: currentUserIdStr });
      socket.emit('check-active-call', { userId: currentUserIdStr });
    }

    const onConnect = () => {
      if (currentUserIdStr) {
        socket.emit('join', { userId: currentUserIdStr, role: userRole });
        socket.emit('register-user', { userId: currentUserIdStr });
        socket.emit('check-active-call', { userId: currentUserIdStr });
      }
    };

    socket.on('connect', onConnect);

    const handleActiveStatus = ({ hasActiveCall, call }) => {
      if (hasActiveCall && call && call.status === 'calling') {
        if (call.callerId === currentUserIdStr) {
          setOutgoingCall({
            bookingId: call.bookingId,
            recipientName: call.recipientName || 'Student',
            subject: call.subject,
          });
        } else {
          setIncomingCall({
            bookingId: call.bookingId,
            callerName: call.callerName,
            subject: call.subject,
            callerRole: call.callerRole,
          });
        }
      } else {
        setIncomingCall(null);
        setOutgoingCall(null);
      }
    };

    const handleIncomingCall = (data) => {
      console.log('[SocketCallListener] Incoming video call received:', data);
      if (!data) return;
      setCallStatusMsg('');
      setIncomingCall({
        bookingId: data.bookingId,
        callerId: data.callerId,
        callerName: data.callerName || 'Tutor',
        subject: data.subject || 'Tuition Class',
        callerRole: data.callerRole || 'Tutor',
      });
    };

    const handleCallAck = ({ success, online, recipientName, bookingId }) => {
      if (success) {
        setOutgoingCall({ bookingId, recipientName, online });
        setCallStatusMsg('');
      }
    };

    const handleCallAccepted = ({ bookingId }) => {
      setCallStatusMsg('Call accepted! Connecting video...');
      setTimeout(() => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setCallStatusMsg('');
        window.location.href = `/video-call/${bookingId}`;
      }, 500);
    };

    const handleCallDeclined = () => {
      setCallStatusMsg('Call declined by user.');
      setTimeout(() => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setCallStatusMsg('');
      }, 2200);
    };

    const handleCallCancelled = () => {
      setCallStatusMsg('Call cancelled.');
      setTimeout(() => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setCallStatusMsg('');
      }, 2000);
    };

    const handleCallTimeout = () => {
      setCallStatusMsg('Call timed out (no answer).');
      setTimeout(() => {
        setIncomingCall(null);
        setOutgoingCall(null);
        setCallStatusMsg('');
      }, 2500);
    };

    const handleVideoError = ({ message }) => {
      alert(message || 'Video call error.');
      setIncomingCall(null);
      setOutgoingCall(null);
    };

    socket.on('active-call-status', handleActiveStatus);
    socket.on('incoming-video-call', handleIncomingCall);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-initiated-ack', handleCallAck);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-declined', handleCallDeclined);
    socket.on('call-cancelled', handleCallCancelled);
    socket.on('call-ended', handleCallCancelled);
    socket.on('call-timeout', handleCallTimeout);
    socket.on('video-error', handleVideoError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('active-call-status', handleActiveStatus);
      socket.off('incoming-video-call', handleIncomingCall);
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-initiated-ack', handleCallAck);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-declined', handleCallDeclined);
      socket.off('call-cancelled', handleCallCancelled);
      socket.off('call-ended', handleCallCancelled);
      socket.off('call-timeout', handleCallTimeout);
      socket.off('video-error', handleVideoError);
    };
  }, [userId, userRole]);

  const acceptCall = () => {
    const socket = getSocket();
    if (incomingCall && socket) {
      socket.emit('accept-video-call', { bookingId: incomingCall.bookingId });
    }
  };

  const declineCall = () => {
    const socket = getSocket();
    if (incomingCall && socket) {
      socket.emit('decline-video-call', { bookingId: incomingCall.bookingId });
    }
    setIncomingCall(null);
  };

  const cancelCall = () => {
    const socket = getSocket();
    if (outgoingCall && socket) {
      socket.emit('cancel-video-call', { bookingId: outgoingCall.bookingId });
    }
    setOutgoingCall(null);
  };

  // Render Incoming Call Modal (for Student)
  if (incomingCall) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1250,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            borderTop: '4px solid #10b981',
            borderRadius: '16px',
            padding: '28px',
            background: '#1e293b',
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              marginBottom: '16px',
              border: '2px solid rgba(52, 211, 153, 0.4)',
            }}
          >
            <FaVideo style={{ animation: 'pulse 1.5s infinite' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            Incoming Video Call
          </h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
            <strong style={{ color: '#38bdf8' }}>{incomingCall.callerName || 'Tutor'}</strong> ({incomingCall.callerRole || 'Tutor'}) is calling you for{' '}
            <strong style={{ color: '#f1f5f9' }}>{incomingCall.subject || 'Tuition Class'}</strong>.
          </p>

          {callStatusMsg ? (
            <div style={{ color: '#34d399', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>
              {callStatusMsg}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button
                type="button"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  flex: 1,
                  padding: '12px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onClick={declineCall}
              >
                <FaPhoneSlash /> Reject
              </button>
              <button
                type="button"
                style={{
                  background: '#10b981',
                  color: '#ffffff',
                  flex: 1,
                  padding: '12px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onClick={acceptCall}
              >
                <FaVideo /> Accept
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Outgoing Call Modal (for Tutor)
  if (outgoingCall) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1250,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            borderTop: '4px solid #0284c7',
            borderRadius: '16px',
            padding: '28px',
            background: '#1e293b',
            color: '#ffffff',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(48, 137, 181, 0.2)',
              color: '#38bdf8',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              marginBottom: '16px',
              border: '2px solid rgba(56, 189, 248, 0.4)',
            }}
          >
            <FaPhoneVolume style={{ animation: 'pulse 1.5s infinite' }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            Calling Student...
          </h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
            Waiting for <strong style={{ color: '#38bdf8' }}>{outgoingCall.recipientName || 'Student'}</strong> to accept the incoming video call request...
          </p>

          {callStatusMsg ? (
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '14px', marginBottom: '16px' }}>
              {callStatusMsg}
            </div>
          ) : (
            <button
              type="button"
              style={{
                background: '#ef4444',
                color: '#ffffff',
                width: '100%',
                padding: '12px',
                fontWeight: 700,
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onClick={cancelCall}
            >
              <FaPhoneSlash /> Cancel Call
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

