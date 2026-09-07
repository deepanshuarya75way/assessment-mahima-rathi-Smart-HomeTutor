import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';
import { ComplaintChatModal } from '../../common/ComplaintChatModal';

export const AdminDisputesTab = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [activeChatTicket, setActiveChatTicket] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Draft responses map: { [complaintId]: { status: string, adminReply: string } }
  const [drafts, setDrafts] = useState({});

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllComplaints();
      if (res.success && Array.isArray(res.complaints)) {
        setComplaints(res.complaints);

        // Initialize drafts state for each complaint
        const initialDrafts = {};
        res.complaints.forEach((c) => {
          initialDrafts[c._id] = {
            status: c.status || 'Pending',
            adminReply: c.adminReply || '',
          };
        });
        setDrafts(initialDrafts);
      }
    } catch (err) {
      console.error('Fetch Admin Complaints Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveComplaint = async (id) => {
    const draft = drafts[id];
    if (!draft) return;

    setUpdatingId(id);
    setSuccessMsg('');
    try {
      const res = await adminApi.resolveComplaint(id, {
        status: draft.status,
        adminReply: draft.adminReply,
      });

      if (res.success) {
        setSuccessMsg(`Ticket #${id.substring(18).toUpperCase()} updated successfully! Notification delivered to user.`);
        fetchComplaints();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Save Complaint Error:', err);
    } finally {
      setUpdatingId(null);
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

  const filteredComplaints = complaints.filter((c) => {
    const userName = c.user?.name || '';
    const userEmail = c.user?.email || '';
    const subject = c.subject || '';
    const desc = c.description || '';
    const query = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !query ||
      userName.toLowerCase().includes(query) ||
      userEmail.toLowerCase().includes(query) ||
      subject.toLowerCase().includes(query) ||
      desc.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' || (c.status || 'Pending').toLowerCase() === statusFilter.toLowerCase();

    const matchesRole =
      roleFilter === 'all' || (c.user?.role || '').toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* HEADER & CONTROLS */}
      <div className="dash-card" style={{ marginBottom: '20px' }}>
        <div className="dash-card-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-headset" style={{ color: '#dc2626' }}></i> Parent, Student & Educator Complaint Center
          </h3>
          <button
            className="dash-btn dash-btn-outline"
            onClick={fetchComplaints}
            style={{ fontSize: '12.5px', padding: '6px 14px' }}
          >
            <i className="fa-solid fa-arrows-rotate"></i> Refresh Complaints
          </button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="tr-input"
              placeholder="Search by User Name, Email, Subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          <div style={{ width: '190px' }}>
            <select
              className="tr-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13px',
                fontWeight: '600',
                padding: '0 28px 0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                lineHeight: '40px',
                display: 'block',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={{ width: '190px' }}>
            <select
              className="tr-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13px',
                fontWeight: '600',
                padding: '0 28px 0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                lineHeight: '40px',
                display: 'block',
              }}
            >
              <option value="all">All User Roles</option>
              <option value="student">Students</option>
              <option value="tutor">Tutors</option>
              <option value="parent">Parents</option>
            </select>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="dash-card" style={{ background: '#dcfce7', borderColor: '#86efac', color: '#166534', padding: '12px 16px', marginBottom: '20px', fontSize: '13.5px', fontWeight: '600' }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i> {successMsg}
        </div>
      )}

      {/* COMPLAINTS FEED */}
      <div className="dash-card">
        <div className="dash-card-header" style={{ marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
            Showing {filteredComplaints.length} of {complaints.length} Complaint Tickets
          </h4>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '20px', color: '#dc2626', marginRight: '8px' }}></i>
            Loading live complaint tickets from database...
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '32px', color: '#16a34a', marginBottom: '12px', display: 'block' }}></i>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#334155' }}>No Active Complaints Found</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              No complaints match your filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredComplaints.map((item) => {
              const draft = drafts[item._id] || { status: item.status || 'Pending', adminReply: item.adminReply || '' };
              const submitterRole = (item.user?.role || 'user').toLowerCase();
              const badgeClass =
                submitterRole === 'tutor'
                  ? 'badge-tutor'
                  : submitterRole === 'parent'
                  ? 'badge-parent'
                  : 'badge-student';

              return (
                <div
                  key={item._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  {/* TICKET TOP BAR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', fontFamily: 'monospace', color: '#0f2a4a' }}>
                          #TKT-{item._id.substring(18).toUpperCase()}
                        </span>
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                          {item.category || 'General'}
                        </span>
                        <span className={`role-badge ${badgeClass}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                          {item.user ? item.user.name : 'Unknown User'} ({submitterRole.toUpperCase()})
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '16.5px', fontWeight: '800', color: '#0f172a' }}>
                        {item.subject}
                      </h4>
                      <small style={{ color: '#64748b', fontSize: '12px' }}>
                        Submitted by: <strong>{item.user?.email || 'N/A'}</strong> on {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </small>
                    </div>

                    <div>{getStatusBadge(item.status)}</div>
                  </div>

                  {/* RELATED USER IF ANY */}
                  {item.relatedUser && (
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '12.5px', color: '#475569', marginBottom: '12px', border: '1px dashed #cbd5e1' }}>
                      <i className="fa-solid fa-user-tag" style={{ marginRight: '6px', color: '#0284c7' }}></i>
                      Related Party: <strong>{item.relatedUser.name}</strong> ({item.relatedUser.email} - {item.relatedUser.role})
                    </div>
                  )}

                  {/* DESCRIPTION */}
                  <div style={{ background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '14px', margin: '0 0 16px 0' }}>
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </p>
                  </div>

                  {/* ADMIN ACTION PANEL */}
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: '800', color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-user-shield" style={{ color: '#0284c7' }}></i> Admin Resolution & Response Panel
                    </h5>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                          Update Complaint Status
                        </label>
                        <select
                          className="tr-select"
                          value={draft.status}
                          onChange={(e) => handleDraftChange(item._id, 'status', e.target.value)}
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
                          <option value="Pending">Pending</option>
                          <option value="Under Review">Under Review</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        Official Admin Reply / Resolution Remarks
                      </label>
                      <textarea
                        className="tr-input"
                        placeholder="Type official response to user..."
                        rows="3"
                        value={draft.adminReply}
                        onChange={(e) => handleDraftChange(item._id, 'adminReply', e.target.value)}
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        className="dash-btn dash-btn-primary"
                        onClick={() => setActiveChatTicket(item)}
                        style={{
                          fontSize: '12.5px',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          background: '#0284c7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <i className="fa-solid fa-comments"></i> Open Conversation
                        {item.unreadCountAdmin > 0 && (
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
                            {item.unreadCountAdmin} unread
                          </span>
                        )}
                      </button>

                      <button
                        className="dash-btn dash-btn-primary"
                        onClick={() => handleSaveComplaint(item._id)}
                        disabled={updatingId === item._id}
                        style={{ fontSize: '12.5px', padding: '6px 16px' }}
                      >
                        {updatingId === item._id ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Saving...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Save Resolution & Notify User
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLAINT CHAT MODAL FOR ADMIN */}
      <ComplaintChatModal
        complaint={activeChatTicket}
        isOpen={!!activeChatTicket}
        onClose={() => {
          setActiveChatTicket(null);
          fetchComplaints();
        }}
        currentUserRole="admin"
        onComplaintUpdated={(updated) => {
          setComplaints((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)));
        }}
      />
    </div>
  );
};
