import React, { useState, useEffect } from 'react';
import { ComplaintChatModal } from './ComplaintChatModal';

export const UserComplaintsTab = ({ roleName = 'Student' }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeChatTicket, setActiveChatTicket] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const fetchUserComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.complaints)) {
        setComplaints(data.complaints);
      }
    } catch (err) {
      console.error('Fetch User Complaints Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserComplaints();
  }, []);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Subject and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Your complaint ticket has been submitted to support successfully!');
        setSubject('');
        setDescription('');
        setCategory('General');
        setIsModalOpen(false);
        fetchUserComplaints();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.message || 'Failed to submit complaint.');
      }
    } catch (err) {
      console.error('Submit Complaint Error:', err);
      setErrorMsg('Server error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'resolved') {
      return (
        <span
          className="status-pill status-confirmed"
          style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: '800' }}
        >
          <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> RESOLVED
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span
          className="status-pill status-cancelled"
          style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', fontWeight: '800' }}
        >
          <i className="fa-solid fa-circle-xmark" style={{ marginRight: '4px' }}></i> REJECTED
        </span>
      );
    }
    if (s === 'under review' || s === 'in progress') {
      return (
        <span
          className="status-pill"
          style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: '800' }}
        >
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i> UNDER REVIEW
        </span>
      );
    }
    return (
      <span
        className="status-pill status-pending"
        style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: '800' }}
      >
        <i className="fa-solid fa-clock" style={{ marginRight: '4px' }}></i> PENDING
      </span>
    );
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* HEADER & NEW COMPLAINT ACTION */}
      <div className="dash-card" style={{ marginBottom: '20px' }}>
        <div className="dash-card-header" style={{ marginBottom: '12px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#dc2626' }}></i> Support & Help Desk Tickets
          </h3>
          <button
            className="dash-btn dash-btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ fontSize: '13px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-plus"></i> Submit New Complaint
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          Track and manage your submitted support tickets, report issues, and view official replies from the Smart HomeTutor administration team.
        </p>
      </div>

      {successMsg && (
        <div className="dash-card" style={{ background: '#dcfce7', borderColor: '#86efac', color: '#166534', padding: '12px 16px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600' }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i> {successMsg}
        </div>
      )}

      {/* COMPLAINTS LIST FEED */}
      <div className="dash-card">
        <div className="dash-card-header" style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
            Your Submitted Support Tickets ({complaints.length})
          </h4>
          <button
            className="dash-btn dash-btn-outline"
            onClick={fetchUserComplaints}
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            <i className="fa-solid fa-rotate-right"></i> Refresh List
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '20px', color: '#0284c7', marginRight: '8px' }}></i>
            Loading your support tickets...
          </div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-clipboard-check" style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '12px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#334155' }}>No Active Complaint Tickets</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              You have not submitted any help desk tickets. Click "Submit New Complaint" above if you need assistance.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {complaints.map((ticket) => (
              <div
                key={ticket._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* HEADER ROW */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#0284c7',
                        background: '#e0f2fe',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        marginRight: '8px',
                      }}
                    >
                      {ticket.category || 'General'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', fontFamily: 'monospace' }}>
                      #TKT-{ticket._id.substring(18).toUpperCase()}
                    </span>
                    <h4 style={{ margin: '6px 0 0 0', fontSize: '16px', fontWeight: '800', color: '#0f2a4a' }}>
                      {ticket.subject}
                    </h4>
                  </div>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>

                {/* DESCRIPTION */}
                <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </p>

                {/* ADMIN RESPONSE BOX IF PRESENT */}
                {ticket.adminReply ? (
                  <div
                    style={{
                      background: '#f8fafc',
                      borderLeft: '4px solid #0284c7',
                      border: '1px solid #cbd5e1',
                      borderLeftWidth: '4px',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      marginTop: '12px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0369a1', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-headset"></i> Official Admin Response
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {ticket.adminReply}
                    </p>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '8px' }}>
                    <i className="fa-solid fa-clock" style={{ marginRight: '4px' }}></i> Awaiting official response from administration.
                  </div>
                )}

                {/* DATE & CONVERSATION ACTION FOOTER */}
                <div
                  style={{
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <button
                    className="dash-btn dash-btn-primary"
                    onClick={() => setActiveChatTicket(ticket)}
                    style={{
                      fontSize: '12.5px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#0284c7',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="fa-solid fa-comments"></i> Open Conversation
                    {ticket.unreadCountUser > 0 && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          marginLeft: '4px',
                        }}
                      >
                        {ticket.unreadCountUser} new
                      </span>
                    )}
                  </button>

                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Submitted on {new Date(ticket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMPLAINT CHAT MODAL */}
      <ComplaintChatModal
        complaint={activeChatTicket}
        isOpen={!!activeChatTicket}
        onClose={() => {
          setActiveChatTicket(null);
          fetchUserComplaints();
        }}
        currentUserRole={roleName}
        onComplaintUpdated={(updated) => {
          setComplaints((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
        }}
      />

      {/* CREATE COMPLAINT MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pen-to-square" style={{ color: '#dc2626' }}></i> Submit Support Ticket / Complaint
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitComplaint}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Complaint Category
                </label>
                <select
                  className="tr-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    padding: '0 32px 0 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    lineHeight: '40px',
                    display: 'block',
                  }}
                >
                  <option value="General">General Enquiry & Support</option>
                  <option value="Tuition Fee / Payment">Tuition Fee & Payment Issue</option>
                  <option value="Tutor Quality / Behavior">Tutor Quality or Conduct</option>
                  <option value="Schedule / Class Issue">Class Schedule & Attendance</option>
                  <option value="Technical / App Bug">Technical Bug or App Issue</option>
                  <option value="Other">Other Issues</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  className="tr-input"
                  placeholder="e.g. Issue regarding refund or missed physics session"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    fontSize: '13.5px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea
                  className="tr-input"
                  placeholder="Please describe the issue in detail..."
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    fontSize: '13.5px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    lineHeight: '1.5',
                  }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="dash-btn dash-btn-primary"
                  disabled={submitting}
                  style={{ fontSize: '13px', minWidth: '130px' }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i> Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
