import React, { useState } from 'react';
import { adminApi } from '../../../services/adminApi';

export const AnnouncementModal = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      setFeedback({ text: 'Please fill in both title and message.', type: 'error' });
      return;
    }

    setSending(true);
    setFeedback({ text: '', type: '' });

    try {
      const res = await adminApi.sendBulkNotification({ title, message, targetRole });
      if (res.success) {
        setFeedback({ text: 'Broadcast announcement sent successfully!', type: 'success' });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
          setTitle('');
          setMessage('');
          setFeedback({ text: '', type: '' });
        }, 1500);
      } else {
        setFeedback({ text: res.message || 'Failed to send announcement.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ text: 'Server connection error.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '520px',
        width: '100%',
        padding: '28px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}
        >
          &times;
        </button>

        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2a4a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-bullhorn" style={{ color: '#b45309' }}></i> Send Broadcast Announcement
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
          Publish an in-app system notification to students, tutors, parents, or all registered accounts.
        </p>

        {feedback.text && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: '600',
            background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`
          }}>
            {feedback.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Target Audience</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            >
              <option value="all">All Platform Users</option>
              <option value="student">Students Only</option>
              <option value="tutor">Educators / Tutors Only</option>
              <option value="parent">Parents Only</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Announcement Title *</label>
            <input
              type="text"
              placeholder="e.g. Platform Maintenance Notice / New Feature Released"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Message Body *</label>
            <textarea
              rows="4"
              placeholder="Write announcement message content..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              required
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="dash-btn dash-btn-outline" onClick={onClose} disabled={sending}>Cancel</button>
            <button type="submit" className="dash-btn dash-btn-primary" style={{ background: '#b45309' }} disabled={sending}>
              {sending ? <><i className="fa-solid fa-spinner fa-spin"></i> Broadcasting...</> : 'Send Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
