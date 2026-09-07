import React, { useState, useEffect, useRef } from 'react';
import { FiPaperclip, FiX } from 'react-icons/fi';

export const ChatTab = ({ studentUser, onStartVideoCall }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [tutorTyping, setTutorTyping] = useState(false);
  const [tutorTypingName, setTutorTypingName] = useState('');
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [chatLockMessage, setChatLockMessage] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const studentUserId = studentUser ? studentUser._id || studentUser.id : '';
  const studentName = studentUser ? studentUser.name || 'Student' : 'Student';

  useEffect(() => {
    // Connect Socket.IO safely using window.io
    if (typeof window !== 'undefined' && window.io) {
      socketRef.current = window.io();
    }

    if (socketRef.current) {
      if (studentUserId) {
        socketRef.current.emit('registerUser', studentUserId);
      }

      socketRef.current.on('receiveMessage', (message) => {
        const senderObj = typeof message.sender === 'object' ? message.sender : { _id: message.sender, name: 'Educator' };
        const senderId = senderObj._id;

        if (selectedTutor && selectedTutor._id === senderId && !isChatLocked) {
          setMessages((prev) => [...prev, message]);
          fetch(`/api/chat/seen/${senderId}`, { method: 'PATCH' }).catch(() => {});
          if (socketRef.current) socketRef.current.emit('markSeen', { senderId, recipientId: studentUserId });
        } else {
          loadConversations();
        }
      });

      socketRef.current.on('userTyping', ({ senderId, senderName }) => {
        if (selectedTutor && selectedTutor._id === senderId && !isChatLocked) {
          setTutorTyping(true);
          setTutorTypingName(senderName || 'Educator');
        }
      });

      socketRef.current.on('userStopTyping', ({ senderId }) => {
        if (selectedTutor && selectedTutor._id === senderId) {
          setTutorTyping(false);
        }
      });
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [selectedTutor, studentUserId, isChatLocked]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      let convList = data.success && data.conversations ? data.conversations : [];

      try {
        const bRes = await fetch('/api/student/bookings');
        const bData = await bRes.json();
        if (bData.success && bData.bookings) {
          bData.bookings.forEach((b) => {
            const tUser = b.tutorProfile && b.tutorProfile.user;
            if (tUser && tUser._id) {
              const exists = convList.some((c) => c.user && c.user._id === tUser._id);
              if (!exists) {
                convList.push({
                  user: tUser,
                  chatLocked: true,
                  lockMessage: 'Chat will be available after the tutor completes the payment.',
                  lastMessage: 'Chat Locked - Payment Required',
                  unreadCount: 0,
                });
              }
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      setConversations(convList);

      if (convList.length > 0 && !selectedTutor) {
        selectTutor(convList[0].user, convList[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectTutor = async (tUser, convObj = null) => {
    if (!tUser) return;
    setSelectedTutor(tUser);
    setTutorTyping(false);

    if (convObj && convObj.chatLocked) {
      setIsChatLocked(true);
      setChatLockMessage(convObj.lockMessage || 'Chat will be available after the tutor completes the payment.');
      setMessages([]);
      return;
    }

    try {
      const res = await fetch(`/api/chat/messages/${tUser._id}`);
      const data = await res.json();

      if (res.status === 403 || data.chatLocked) {
        setIsChatLocked(true);
        setChatLockMessage(data.message || 'Chat will be available after the tutor completes the payment.');
        setMessages([]);
        return;
      }

      setIsChatLocked(false);
      setChatLockMessage('');

      if (data.success && data.messages) {
        setMessages(data.messages);
        await fetch(`/api/chat/seen/${tUser._id}`, { method: 'PATCH' }).catch(() => {});
        if (socketRef.current) {
          socketRef.current.emit('markSeen', { senderId: tUser._id, recipientId: studentUserId });
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      setMessages([]);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTutor || isChatLocked) return;
    if (!inputMessage.trim() && !pendingFile) return;

    const msgContent = inputMessage.trim();
    const filePayload = pendingFile || {};

    setInputMessage('');
    setPendingFile(null);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedTutor._id,
          content: msgContent,
          fileUrl: filePayload.fileUrl || '',
          fileType: filePayload.fileType || 'none',
          fileName: filePayload.fileName || '',
          fileSize: filePayload.fileSize || '',
        }),
      });

      const data = await res.json();
      if (res.status === 403 || data.chatLocked) {
        setIsChatLocked(true);
        setChatLockMessage(data.message || 'Chat will be available after the tutor completes the payment.');
        return;
      }

      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data]);
        loadConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    if (isChatLocked) return;
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size must be 25MB or less.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPendingFile({
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          fileName: data.fileName,
          fileSize: data.fileSize || '',
        });
      } else {
        alert(data.message || 'File upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`dash-tab-content ${isFullScreen ? 'chat-fullscreen-wrapper' : ''}`} style={{ display: 'block' }}>
      <div
        className={`dash-card ${isFullScreen ? 'chat-card-fullscreen' : ''}`}
        style={
          isFullScreen
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
                borderRadius: 0,
                margin: 0,
                padding: 0,
                boxShadow: 'none',
                background: '#ffffff',
              }
            : { padding: 0, overflow: 'hidden' }
        }
      >
        <div className={`chat-layout ${isFullScreen ? 'fullscreen' : ''}`} style={isFullScreen ? { height: '100vh' } : {}}>
          {/* LEFT CONVERSATIONS SIDEBAR */}
          <div className="chat-sidebar">
            <div className="chat-sidebar-header">
              <h3>Messages</h3>
            </div>

            <div id="conversationList" style={{ overflowY: 'auto', flex: 1 }}>
              {conversations.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No conversations yet. Book a tutor to start chatting!
                </div>
              ) : (
                conversations.map((c) => {
                  const u = c.user;
                  if (!u) return null;
                  const uName = u.name || u.email || 'Tutor';
                  const initials = uName.substring(0, 2).toUpperCase();
                  const isActive = selectedTutor && selectedTutor._id === u._id;
                  const unread = c.unreadCount || 0;
                  const locked = Boolean(c.chatLocked);

                  return (
                    <div
                      key={u._id}
                      className={`conversation ${isActive ? 'active' : ''}`}
                      onClick={() => selectTutor(u, c)}
                    >
                      <div className="conversation-avatar">{initials}</div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '14px', color: '#0f2a4a' }}>{uName}</strong>
                          {locked ? (
                            <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '10.5px', fontWeight: '800', padding: '2px 7px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fa-solid fa-lock"></i> Locked
                            </span>
                          ) : unread > 0 ? (
                            <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '10.5px', fontWeight: '800', padding: '2px 7px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <i className="fa-solid fa-circle" style={{ fontSize: '6px' }}></i> {unread}
                            </span>
                          ) : null}
                        </div>
                        <p style={{ fontSize: '12px', color: locked ? '#b45309' : '#64748b', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: locked ? 600 : 400 }}>
                          {locked ? ' Chat Locked' : (c.lastMessage || 'Tap to chat...')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT CHAT MAIN AREA */}
          <div className="chat-main">
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedTutor ? selectedTutor.name || 'Tutor' : 'Select Tutor'}</h3>
                <small>Active Educator</small>
                {tutorTyping && !isChatLocked && (
                  <small style={{ color: '#0284c7', fontWeight: 600, fontSize: '12px', marginLeft: '8px' }}>
                    <i className="fa-solid fa-pen-nib fa-bounce"></i> {tutorTypingName} is typing...
                  </small>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {selectedTutor && (
                  isChatLocked ? (
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-lock"></i> Chat Locked
                    </span>
                  ) : (
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-comments"></i> Chat Unlocked
                    </span>
                  )
                )}

                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isFullScreen ? '#0f2a4a' : '#ffffff',
                    color: isFullScreen ? '#ffffff' : '#0f2a4a',
                    borderColor: '#0f2a4a',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  title={isFullScreen ? 'Exit Full Screen' : 'Expand to Full Screen'}
                >
                  <i className={`fa-solid ${isFullScreen ? 'fa-compress' : 'fa-expand'}`}></i>
                  <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
                </button>
              </div>
            </div>

            <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', overflowY: 'auto' }}>
              {isChatLocked ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', margin: 'auto', maxWidth: '420px', background: '#fffbebf5', border: '1px solid #fef3c7', borderRadius: '16px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)' }}>
                  <i className="fa-solid fa-lock" style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '16px', display: 'block' }}></i>
                  <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '18px', fontWeight: 800 }}> Chat Locked</h3>
                  <p style={{ margin: 0, color: '#b45309', fontSize: '13.5px', lineHeight: 1.5, fontWeight: 500 }}>
                    {chatLockMessage || 'Chat will be available after the tutor completes the payment.'}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No message history. Type a message below to start chatting with your tutor!
                </div>
              ) : (
                messages.map((m, idx) => {
                  const senderId = typeof m.sender === 'object' && m.sender ? m.sender._id : m.sender;
                  const isMe = senderId === studentUserId;

                  return (
                    <div
                      key={m._id || idx}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? '#0f2a4a' : '#ffffff',
                        color: isMe ? '#ffffff' : '#0f2a4a',
                        border: isMe ? 'none' : '1px solid #e2e8f0',
                        maxWidth: '75%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                      }}
                    >
                      {m.content && <div>{m.content}</div>}
                      {m.fileUrl && (
                        <div style={{ marginTop: '6px' }}>
                          {m.fileType === 'image' ? (
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={m.fileUrl} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', display: 'block' }} />
                            </a>
                          ) : (
                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: isMe ? '#e0f2fe' : '#0284c7', textDecoration: 'underline', fontSize: '12px', fontWeight: 700 }}>
                              <i className="fa-solid fa-file-arrow-down"></i> {m.fileName || 'Attachment'}
                            </a>
                          )}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', opacity: 0.75, textAlign: 'right', marginTop: '4px' }}>
                        {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* PENDING FILE PREVIEW */}
            {pendingFile && !isChatLocked && (
              <div style={{ padding: '8px 16px', background: '#e0f2fe', borderTop: '1px solid #bae6fd', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#0369a1' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiPaperclip /> Ready to send: <strong>{pendingFile.fileName}</strong></span>
                <button type="button" onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiX /> Cancel</button>
              </div>
            )}

            <div className="chat-footer">
              <label className="dash-btn dash-btn-outline" style={{ padding: '10px 14px', cursor: isChatLocked ? 'not-allowed' : 'pointer', opacity: isChatLocked ? 0.5 : 1, display: 'inline-flex', alignItems: 'center' }} title={isChatLocked ? 'Chat Locked' : 'Attach File'}>
                <FiPaperclip style={{ fontSize: '16px' }} />
                <input type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} disabled={isChatLocked} onChange={handleFileUpload} />
              </label>

              <input
                type="text"
                placeholder={isChatLocked ? 'Chat will be available after the tutor completes the payment.' : (uploadingFile ? 'Uploading file...' : 'Type message...')}
                value={inputMessage}
                disabled={isChatLocked}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendMessage(e);
                }}
              />

              <button type="button" className="dash-btn dash-btn-primary" onClick={handleSendMessage} disabled={isChatLocked || uploadingFile} style={{ opacity: isChatLocked ? 0.5 : 1, cursor: isChatLocked ? 'not-allowed' : 'pointer' }}>
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
