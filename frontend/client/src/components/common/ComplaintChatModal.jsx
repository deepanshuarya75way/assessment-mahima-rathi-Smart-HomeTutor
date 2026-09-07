import React, { useState, useEffect, useRef } from 'react';

export const ComplaintChatModal = ({ complaint, isOpen, onClose, currentUserRole, onComplaintUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState(null); // { fileUrl, fileType, fileName, fileSize }
  const [status, setStatus] = useState(complaint?.status || 'Pending');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const complaintId = complaint?._id;
  const isAdmin = currentUserRole?.toLowerCase() === 'admin';

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load complaint conversation messages
  const fetchMessages = async () => {
    if (!complaintId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        if (data.complaint) {
          setStatus(data.complaint.status);
          if (onComplaintUpdated) onComplaintUpdated(data.complaint);
        }
      }
    } catch (err) {
      console.error('Fetch Complaint Messages Error:', err);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    if (isOpen && complaintId) {
      setStatus(complaint.status || 'Pending');
      fetchMessages();

      // Initialize Socket.IO connection for real-time chat
      try {
        const socket = window.io ? window.io() : null;
        if (socket) {
          socketRef.current = socket;
          socket.emit('join', { role: currentUserRole });

          socket.on('receiveComplaintMessage', (msg) => {
            if (msg.complaint === complaintId || (msg.complaint && msg.complaint._id === complaintId)) {
              setMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
              });
              setTimeout(scrollToBottom, 100);
            }
          });

          socket.on('complaintStatusUpdated', (updatedComplaint) => {
            if (updatedComplaint._id === complaintId) {
              setStatus(updatedComplaint.status);
              if (onComplaintUpdated) onComplaintUpdated(updatedComplaint);
            }
          });
        }
      } catch (err) {
        console.warn('Socket connection optional fallback:', err);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('receiveComplaintMessage');
        socketRef.current.off('complaintStatusUpdated');
      }
    };
  }, [isOpen, complaintId]);

  // Handle File Upload Attachment
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAttachment({
          fileUrl: data.fileUrl,
          fileType: data.fileType || 'other',
          fileName: data.fileName || file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
        });
      } else {
        alert(data.message || 'File upload failed.');
      }
    } catch (err) {
      console.error('File Upload Error:', err);
      alert('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!content.trim() && !attachment) return;

    setSending(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          fileUrl: attachment?.fileUrl || '',
          fileType: attachment?.fileType || 'none',
          fileName: attachment?.fileName || '',
          fileSize: attachment?.fileSize || '',
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [...prev, data.data]);
        setContent('');
        setAttachment(null);
        if (data.complaintStatus) {
          setStatus(data.complaintStatus);
        }
        if (onComplaintUpdated) {
          onComplaintUpdated({ ...complaint, status: data.complaintStatus || status });
        }
        setTimeout(scrollToBottom, 100);
      } else {
        alert(data.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Send Complaint Message Error:', err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // Admin Update Status
  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    setStatusMsg('');
    try {
      const res = await fetch(`/api/admin/complaint/${complaintId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(newStatus);
        setStatusMsg(`Status updated to ${newStatus}`);
        if (onComplaintUpdated) onComplaintUpdated(data.complaint || { ...complaint, status: newStatus });
        setTimeout(() => setStatusMsg(''), 3000);
      } else {
        alert(data.message || 'Failed to update status.');
      }
    } catch (err) {
      console.error('Update Status Error:', err);
      alert('Error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isOpen || !complaint) return null;

  const tktCode = complaint._id?.substring(18).toUpperCase() || 'TKT';
  const submitterName = complaint.user?.name || complaint.user?.email || 'User';
  const submitterRole = (complaint.user?.role || 'User').toUpperCase();

  const isResolvedOrClosed = status === 'Resolved' || status === 'Closed';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          height: '90vh',
          maxHeight: '750px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* HEADER BAR */}
        <div
          style={{
            padding: '16px 20px',
            background: '#0f2a4a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                #TKT-{tktCode}
              </span>
              <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                {complaint.category || 'General'}
              </span>
              <span style={{ fontSize: '11px', background: '#38bdf8', color: '#0f172a', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                {submitterName} ({submitterRole})
              </span>
            </div>
            <h4 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
              {complaint.subject}
            </h4>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ADMIN STATUS CONTROL BAR (If Admin) */}
        {isAdmin && (
          <div
            style={{
              background: '#f8fafc',
              padding: '10px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569', fontWeight: '700' }}>
              <i className="fa-solid fa-user-shield" style={{ color: '#0284c7' }}></i> Admin Control:
              <select
                value={status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Rejected">Rejected</option>
              </select>
              {statusMsg && <span style={{ color: '#166534', fontSize: '12px', fontWeight: '700' }}>{statusMsg}</span>}
            </div>

            {status !== 'Resolved' && (
              <button
                onClick={() => handleStatusChange('Resolved')}
                disabled={updatingStatus}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-check-double"></i> Mark as Resolved
              </button>
            )}
          </div>
        )}

        {/* TICKET INITIAL DESCRIPTION BOX */}
        <div style={{ padding: '14px 20px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '13px' }}>
          <div style={{ fontWeight: '800', color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#0284c7' }}></i> Original Ticket Description:
          </div>
          <p style={{ margin: 0, color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
            {complaint.description}
          </p>
        </div>

        {/* CONVERSATION MESSAGES FEED */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#0284c7', marginBottom: '8px' }}></i>
              <div>Loading conversation thread...</div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <i className="fa-solid fa-comments" style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '10px' }}></i>
              <h5 style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '14px' }}>No messages yet</h5>
              <p style={{ margin: 0, fontSize: '12.5px' }}>
                Type a message below to start the support conversation with administration.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSenderMe = msg.sender?._id === (complaint.user?._id || '') ? !isAdmin : isAdmin;
              const msgSenderRole = (msg.sender?.role || '').toLowerCase();
              const isAdminMsg = msgSenderRole === 'admin';

              return (
                <div
                  key={msg._id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isSenderMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: '600' }}>
                    {isAdminMsg ? 'Support Admin' : `${msg.sender?.name || 'User'}`} •{' '}
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div
                    style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: isSenderMe
                        ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                        : isAdminMsg
                        ? '#0f2a4a'
                        : '#ffffff',
                      color: isSenderMe || isAdminMsg ? '#ffffff' : '#0f172a',
                      border: isSenderMe || isAdminMsg ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      wordBreak: 'break-word',
                      fontSize: '13.5px',
                      lineHeight: '1.55',
                    }}
                  >
                    {msg.content && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>}

                    {/* ATTACHMENT PREVIEW */}
                    {msg.fileUrl && (
                      <div style={{ marginTop: msg.content ? '8px' : 0, paddingTop: msg.content ? '8px' : 0, borderTop: msg.content ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                        {msg.fileType === 'image' ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={msg.fileUrl}
                              alt="Attachment"
                              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: isSenderMe || isAdminMsg ? '#38bdf8' : '#0284c7',
                              fontWeight: '700',
                              fontSize: '12.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'underline',
                            }}
                          >
                            <i className="fa-solid fa-paperclip"></i> {msg.fileName || 'Download Attachment'}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* STATUS BANNER IF RESOLVED */}
        {isResolvedOrClosed && (
          <div
            style={{
              background: '#dcfce7',
              borderTop: '1px solid #86efac',
              padding: '10px 20px',
              fontSize: '12.5px',
              color: '#15803d',
              fontWeight: '700',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-circle-check"></i> This complaint has been marked as {status}. Sending a new message will automatically reopen it.
          </div>
        )}

        {/* ATTACHMENT PREVIEW BAR */}
        {attachment && (
          <div
            style={{
              padding: '8px 20px',
              background: '#e0f2fe',
              borderTop: '1px solid #bae6fd',
              fontSize: '12px',
              color: '#0369a1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              <i className="fa-solid fa-paperclip" style={{ marginRight: '6px' }}></i> Attached: <strong>{attachment.fileName}</strong> ({attachment.fileSize})
            </span>
            <button
              onClick={() => setAttachment(null)}
              style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: '800' }}
            >
              Remove
            </button>
          </div>
        )}

        {/* MESSAGE INPUT FORM */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '14px 20px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#475569',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
            }}
            title="Attach Image or Document"
          >
            {uploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paperclip"></i>}
          </button>

          <input
            type="text"
            placeholder={isAdmin ? 'Type official admin reply...' : 'Type your message to support...'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={sending}
            style={{
              flex: 1,
              height: '42px',
              padding: '0 16px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            disabled={sending || (!content.trim() && !attachment)}
            style={{
              background: sending || (!content.trim() && !attachment) ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              height: '42px',
              padding: '0 20px',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: '700',
              cursor: sending || (!content.trim() && !attachment) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {sending ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>} Send
          </button>
        </form>
      </div>
    </div>
  );
};
