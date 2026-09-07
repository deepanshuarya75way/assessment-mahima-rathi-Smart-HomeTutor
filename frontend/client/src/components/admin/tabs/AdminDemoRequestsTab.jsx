import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../services/adminApi';

export const AdminDemoRequestsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getAllBookings();
      if (res.success && Array.isArray(res.bookings)) {
        setBookings(res.bookings);
      } else {
        setError(res.message || 'Failed to load demo requests.');
      }
    } catch (err) {
      console.error('Fetch Demo Requests Error:', err);
      setError('Unable to load demo class requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await adminApi.approveBooking(id);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b._id === id ? { ...b, status: 'Approved' } : b))
        );
        alert('Demo class request APPROVED successfully!');
      } else {
        alert(res.message || 'Failed to approve request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error approving demo class request.');
    }
  };

  const handleReject = async (id) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Are you sure you want to reject this demo class request?', 'Reject Demo Request', 'Reject', 'Cancel')
      : window.confirm('Are you sure you want to reject this demo class request?');
    if (!confirmed) return;
    try {
      const res = await adminApi.rejectBooking(id);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b._id === id ? { ...b, status: 'Rejected' } : b))
        );
        alert('Demo class request REJECTED.');
      } else {
        alert(res.message || 'Failed to reject request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error rejecting demo class request.');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm('Are you sure you want to permanently delete this demo request record?', 'Delete Record', 'Delete', 'Cancel')
      : window.confirm('Are you sure you want to permanently delete this demo request record?');
    if (!confirmed) return;
    try {
      const res = await adminApi.deleteBooking(id);
      if (res.success) {
        setBookings((prev) => prev.filter((b) => b._id !== id));
        alert('Demo class request DELETED successfully.');
      } else {
        alert(res.message || 'Failed to delete request.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting demo class request.');
    }
  };

  const filteredBookings = filterStatus === 'all'
    ? bookings
    : bookings.filter((b) => (b.status || 'Pending').toLowerCase() === filterStatus.toLowerCase());

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        {/* CARD HEADER & FILTERS */}
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-calendar-check" style={{ color: '#b45309' }}></i>
            Demo Class & Booking Requests Management
          </h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Status Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', fontWeight: '600' }}
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending Admin Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={fetchBookings}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <i className="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
        </div>

        {/* DEMO REQUESTS TABLE */}
        <div className="dash-table-wrapper" style={{ marginTop: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table className="dash-table" style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '150px' }}>REQUEST DETAILS</th>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '180px' }}>STUDENT</th>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '180px' }}>TUTOR ASSIGNED</th>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '160px' }}>SUBJECT & MODE</th>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '170px' }}>STATUS</th>
                <th style={{ padding: '12px 14px', whiteSpace: 'nowrap', minWidth: '240px', textAlign: 'center' }}>ADMIN ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: '#b45309', marginRight: '8px' }}></i>
                    Loading demo class requests...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#dc2626', fontSize: '14px', fontWeight: '600' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                    {error}
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '14px' }}>
                    No demo class requests found in this category.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const studentName = b.student ? b.student.name || 'Student' : 'Student Account';
                  const studentEmail = b.student ? b.student.email : 'N/A';
                  const tutorName = b.tutor ? b.tutor.name || 'Assigned Tutor' : 'General Request';
                  const tutorEmail = b.tutor ? b.tutor.email : 'N/A';
                  const isPendingAdmin = b.status === 'Pending' || b.status === 'Pending Admin Approval';
                  const isPendingTutor = b.status === 'Pending Tutor Acceptance';
                  const isConfirmed = b.status === 'Confirmed' || b.status === 'Accepted';
                  const isRejectedAdmin = b.status === 'Rejected by Admin' || b.status === 'Rejected';
                  const isRejectedTutor = b.status === 'Rejected by Tutor';

                  return (
                    <tr key={b._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                          ID: #{b._id.toString().slice(-6).toUpperCase()}
                        </div>
                        <small style={{ color: '#64748b' }}>
                          {new Date(b.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </small>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f2a4a' }}>{studentName}</div>
                        <small style={{ color: '#64748b', wordBreak: 'break-all' }}>{studentEmail}</small>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '700', color: '#0f2a4a' }}>{tutorName}</div>
                        <small style={{ color: '#64748b', wordBreak: 'break-all' }}>{tutorEmail}</small>
                      </td>
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '600', color: '#334155' }}>
                          {b.subject || 'General Demo'}
                        </span>
                        <div>
                          <small style={{ color: '#64748b' }}>
                            {b.isHomeVisit ? ' Home Visit' : ' Online Live Class'}
                          </small>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <span
                          className={`status-pill ${
                            isConfirmed
                              ? 'status-confirmed'
                              : isPendingAdmin || isPendingTutor
                              ? 'status-pending'
                              : 'status-cancelled'
                          }`}
                          style={{ whiteSpace: 'nowrap', display: 'inline-block' }}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
                          {isPendingAdmin ? (
                            <>
                              <button
                                type="button"
                                className="dash-btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  border: '1px solid #86efac',
                                  fontWeight: '700',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleApprove(b._id)}
                              >
                                <i className="fa-solid fa-check"></i> Approve
                              </button>
                              <button
                                type="button"
                                className="dash-btn"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: '#fff7ed',
                                  color: '#c2410c',
                                  border: '1px solid #ffedd5',
                                  fontWeight: '700',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleReject(b._id)}
                              >
                                <i className="fa-solid fa-xmark"></i> Reject
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginRight: '4px', whiteSpace: 'nowrap' }}>
                              {isPendingTutor
                                ? '⏳ Pending Tutor Acceptance'
                                : isConfirmed
                                ? 'Confirmed Class'
                                : isRejectedTutor
                                ? 'Declined by Tutor'
                                : 'Rejected by Admin'}
                            </span>
                          )}

                          <button
                            type="button"
                            className="dash-btn"
                            title="Delete Request"
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              fontWeight: '700',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleDelete(b._id)}
                          >
                            <i className="fa-solid fa-trash-can"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
