import React from 'react';
import { FiMail, FiPhone } from 'react-icons/fi';

export const TutorRequestsTab = ({ requests = [], onAcceptRequest, onRejectRequest }) => {
  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header">
          <h3><i className="fa-solid fa-calendar-check" style={{ color: '#16a34a' }}></i> Admin Approved Demo Class Requests</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
          These demo class requests have been verified and approved by Administration. Review the student requirements below to Accept or Decline the request.
        </p>
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>STUDENT DETAILS</th>
                <th>SUBJECT & REQUIREMENTS</th>
                <th>REQUEST DATE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                    No demo class requests awaiting your response.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const studentName = req.student?.name || req.studentName || 'Student';
                  const studentEmail = req.student?.email || 'N/A';
                  const studentPhone = req.student?.phone || 'N/A';
                  const subjectName = req.subject || req.tutorProfile?.primarySubject || 'Tuition Subject';
                  const isPendingAcceptance = req.status === 'Pending Tutor Acceptance' || req.status === 'Approved' || req.status === 'Pending';
                  const isConfirmed = req.status === 'Confirmed' || req.status === 'Accepted';
                  const isRejectedByTutor = req.status === 'Rejected by Tutor';

                  return (
                    <tr key={req._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f2a4a', fontSize: '14px' }}>{studentName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><FiMail size={12} /> {studentEmail}</div>
                        {studentPhone !== 'N/A' && <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><FiPhone size={12} /> {studentPhone}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{subjectName}</div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          {req.isHomeVisit ? ' Home Visit Tuition' : ' Online Live Class'}
                        </div>
                        {req.message && (
                          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                            "{req.message}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                          {new Date(req.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </div>
                        <small style={{ color: '#64748b' }}>
                          {new Date(req.createdAt || Date.now()).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            isConfirmed
                              ? 'status-confirmed'
                              : isPendingAcceptance
                              ? 'status-pending'
                              : 'status-cancelled'
                          }`}
                        >
                          {isConfirmed
                            ? 'Confirmed'
                            : isPendingAcceptance
                            ? 'Pending Your Action'
                            : isRejectedByTutor
                            ? 'Declined by You'
                            : req.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {isPendingAcceptance ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              className="dash-btn"
                              style={{
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                              onClick={() => onAcceptRequest && onAcceptRequest(req._id)}
                            >
                              <i className="fa-solid fa-check"></i> Accept Demo Class
                            </button>
                            <button
                              type="button"
                              className="dash-btn"
                              style={{
                                background: '#ffffff',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                              onClick={() => onRejectRequest && onRejectRequest(req._id)}
                            >
                              <i className="fa-solid fa-xmark"></i> Decline
                            </button>
                          </div>
                        ) : isConfirmed ? (
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                            <i className="fa-solid fa-circle-check"></i> Class Confirmed
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>
                            <i className="fa-solid fa-circle-xmark"></i> Request Declined
                          </span>
                        )}
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
