import React from 'react';
import { FiMail, FiPhone } from 'react-icons/fi';
import { checkClassJoinable } from '../../../utils/classTimeHelper';

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
                <th>SUBJECT & TYPE</th>
                <th>SCHEDULED DATE & TIME</th>
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

                  const demoDateStr = req.scheduledDate
                    ? new Date(req.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    : req.date || new Date(req.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'medium' });
                  const demoTimeStr = req.scheduledStartTime || req.scheduledTime || req.time || '06:00 PM';

                  const timingStatus = isConfirmed
                    ? checkClassJoinable(req.scheduledDate || req.date, req.scheduledStartTime, req.scheduledEndTime, req.status)
                    : null;

                  return (
                    <tr key={req._id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f2a4a', fontSize: '14px' }}>{studentName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><FiMail size={12} /> {studentEmail}</div>
                        {studentPhone !== 'N/A' && <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><FiPhone size={12} /> {studentPhone}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{subjectName}</span>
                          <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            One-Time Demo
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                          {req.isHomeVisit ? ' Home Visit Tuition' : ' Online Live Class'} &bull; Grade: {req.grade || req.class || 'General'}
                        </div>
                        {req.message && (
                          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px' }}>
                            "{req.message}"
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2a4a' }}>
                          {demoDateStr}
                        </div>
                        <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>
                          <i className="fa-regular fa-clock"></i> {demoTimeStr}
                        </div>
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
                            ? 'Confirmed Demo'
                            : isPendingAcceptance
                            ? 'Pending Acceptance'
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
                              <i className="fa-solid fa-check"></i> Accept Demo
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
                          timingStatus && timingStatus.canJoin ? (
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                borderRadius: '8px',
                                background: '#0284c7',
                                borderColor: '#0284c7',
                              }}
                              onClick={() => {
                                window.location.href = `/video-call/${req.scheduleId || req._id}`;
                              }}
                            >
                              <i className="fa-solid fa-video"></i> Start Demo
                            </button>
                          ) : (
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid #e2e8f0',
                              }}
                              title={timingStatus ? timingStatus.actionNote : 'Scheduled'}
                            >
                              <i className="fa-regular fa-clock" style={{ color: '#0284c7' }}></i>
                              {timingStatus ? timingStatus.actionNote : 'Scheduled'}
                            </span>
                          )
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
