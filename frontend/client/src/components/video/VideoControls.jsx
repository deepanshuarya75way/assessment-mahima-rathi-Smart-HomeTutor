import React from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaPhoneSlash } from 'react-icons/fa';

export const VideoControls = ({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onEndCall,
}) => {
  return (
    <footer className="call-controls">
      <button
        type="button"
        className={`control-btn ${isAudioMuted ? 'off' : ''}`}
        title="Mute / Unmute Microphone"
        onClick={onToggleAudio}
      >
        {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
      </button>

      <button
        type="button"
        className={`control-btn ${isVideoOff ? 'off' : ''}`}
        title="Camera On / Off"
        onClick={onToggleVideo}
      >
        {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
      </button>

      <button
        type="button"
        className={`control-btn ${isScreenSharing ? 'off' : ''}`}
        style={isScreenSharing ? { background: '#0284c7' } : undefined}
        title="Share Screen"
        onClick={onToggleScreen}
      >
        <FaDesktop />
      </button>

      <button
        type="button"
        className="control-btn end-call"
        onClick={onEndCall}
      >
        <FaPhoneSlash style={{ marginRight: '6px' }} /> End Call
      </button>
    </footer>
  );
};

