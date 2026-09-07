import React from 'react';
import { FiStar } from 'react-icons/fi';
import { AnnouncementsList } from '../../common/AnnouncementsList';
import { ReferralSection } from '../../common/ReferralSection';
import { getSocket } from '../../../services/socket';

export const TutorOverviewTab = ({
  stats,
  schedule = [],
  pendingRequests = [],
  payoutHistory = [],
  reviews = [],
  referralCode = '',
  referralEarnings = 0,
  referredCount = 0,
  referredUsers = [],
  onAcceptRequest,
  onRejectRequest,
  onRequestPayout
}) => {
  const netEarnings = stats?.netEarnings || 0;
  const activeStudentsCount = stats?.activeStudentsCount || 0;
  const ratingDisplay = stats?.rating || '5.0';
  const pendingCount = pendingRequests.length || stats?.pendingRequestsCount || 0;

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* STATS GRID */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Monthly Net Earnings</span>
            <div className="stat-value">₹{netEarnings.toFixed(2)}</div>
            <span className="stat-sub"><i className="fa-solid fa-arrow-up"></i> Available Balance</span>
          </div>
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Active Students</span>
            <div className="stat-value">{activeStudentsCount} Students</div>
            <span className="stat-sub"><i className="fa-solid fa-user-check"></i> Accepted Enrolments</span>
          </div>
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <i className="fa-solid fa-users"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Rating & Feedback</span>
            <div className="stat-value">{ratingDisplay} Rating</div>
            <span className="stat-sub"><i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> Verified Educator</span>
          </div>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <i className="fa-solid fa-award"></i>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Pending Requests</span>
            <div className="stat-value">{pendingCount} Requests</div>
            <span className="stat-sub negative"><i className="fa-solid fa-clock"></i> Action required</span>
          </div>
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
            <i className="fa-solid fa-envelope"></i>
          </div>
        </div>
      </div>

      <div className="dash-content-grid">
        <div>
          {/* PLATFORM ANNOUNCEMENTS & NOTIFICATIONS */}
          <div className="dash-card" style={{ marginBottom: '16px', borderLeft: '4px solid #f59e0b' }}>
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800' }}>
                <i className="fa-solid fa-bullhorn" style={{ color: '#d97706', marginRight: '8px' }}></i> Platform Announcements & Educator Notices
              </h3>
              <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                Live Updates
              </span>
            </div>

            <AnnouncementsList role="tutor" />
          </div>

          {/* TODAY'S LIVE TEACHING SCHEDULE */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3><i className="fa-solid fa-calendar-day"></i> Today's Live Teaching Schedule</h3>
            </div>
            {schedule.length === 0 ? (
              <div style={{ textalign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                No active live teaching sessions scheduled for today.
              </div>
            ) : (
              schedule.map((item, idx) => (
                <div key={item._id || idx} className="class-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', borderRadius: '12px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                  <div className="class-info" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="class-date-badge" style={{ background: '#0f2a4a', color: '#ffffff', padding: '8px 12px', borderRadius: '10px', textalign: 'center', minWidth: '60px' }}>
                      <span className="day" style={{ fontSize: '16px', fontWeight: '800' }}>{item.time || 'Today'}</span>
                    </div>
                    <div className="class-details">
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                        {item.studentName || item.student?.name || 'Student Class'} ({item.subject || 'Tuition'})
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                        Mode: {item.mode || 'Online'} &bull; Grade: {item.grade || 'General'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dash-btn dash-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => {
                      const socket = getSocket();
                      if (socket) {
                        socket.emit('initiate-video-call', {
                          bookingId: item._id,
                          callerName: item.tutor?.name || 'Tutor',
                          callerRole: 'Tutor',
                        });
                      }
                      window.location.href = `/video-call/${item._id}`;
                    }}
                  >
                    <i className="fa-solid fa-video"></i> Join Live
                  </button>

                </div>
              ))
            )}
          </div>
          {/* ASSIGNED APPROVED DEMO CLASSES */}
          <div className="dash-card" style={{ marginTop: '20px' }}>
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3><i className="fa-solid fa-calendar-check" style={{ color: '#0284c7' }}></i> Assigned Demo Classes (One-Time Trials)</h3>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                One-Time Sessions
              </span>
            </div>

            {pendingRequests.filter((r) => r.status === 'Approved' || r.status === 'Accepted' || r.status === 'Confirmed').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                No scheduled demo class sessions assigned at the moment.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingRequests.filter((r) => r.status === 'Approved' || r.status === 'Accepted' || r.status === 'Confirmed').map((req) => {
                  const demoDateStr = req.scheduledDate
                    ? new Date(req.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                    : req.date || 'Scheduled Date';
                  const demoTimeStr = req.scheduledStartTime || req.scheduledTime || req.time || '06:00 PM';

                  return (
                    <div
                      key={req._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                            {req.student?.name || req.studentName || 'Student'} ({req.grade || req.class || 'General'})
                          </h4>
                          <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                            One-Time Demo
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>
                          <strong>Subject:</strong> {req.subject || 'Tuition'} &bull; <strong>Date:</strong> {demoDateStr} &bull; <strong>Time:</strong> {demoTimeStr}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="dash-btn dash-btn-primary"
                          style={{ padding: '6px 14px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                          onClick={() => {
                            const socket = getSocket();
                            if (socket) {
                              socket.emit('initiate-video-call', {
                                bookingId: req.scheduleId || req._id,
                                callerName: req.tutor?.name || 'Tutor',
                                callerRole: 'Tutor',
                              });
                            }
                            window.location.href = `/video-call/${req.scheduleId || req._id}`;
                          }}
                        >
                          <i className="fa-solid fa-video"></i> Start Demo
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div>
          {/* PAYOUT SUMMARY */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3><i className="fa-solid fa-wallet"></i> Earnings & Direct Payout</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
              Available balance ready for instant transfer to bank account or UPI.
            </p>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f2a4a', marginBottom: '16px' }}>
              ₹{netEarnings.toFixed(2)}
            </div>
            <button className="dash-btn dash-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onRequestPayout}>
              <i className="fa-solid fa-building-columns"></i> Transfer to Bank Account
            </button>
          </div>

          {/* REFERRAL PROGRAM & REWARDS */}
          <div style={{ marginTop: '20px' }}>
            <ReferralSection
              referralCode={referralCode || stats?.referralCode}
              referralEarnings={referralEarnings || stats?.referralEarnings || 0}
              referredCount={referredCount || stats?.referredCount || 0}
              referredUsers={referredUsers}
              userRole="tutor"
            />
          </div>

          {/* PAYOUT REQUEST HISTORY & STATUS */}
          <div className="dash-card" style={{ marginTop: '20px' }}>
            <div className="dash-card-header">
              <h3><i className="fa-solid fa-clock-rotate-left"></i> Payout Request History</h3>
            </div>
            {payoutHistory.length === 0 ? (
              <div style={{ textalign: 'center', color: '#94a3b8', padding: '16px', fontSize: '13px' }}>
                No payout history recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payoutHistory.map((p, idx) => (
                  <div key={p._id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>₹{p.amount?.toFixed(2)}</div>
                      <small style={{ color: '#64748b' }}>{new Date(p.createdAt || Date.now()).toLocaleDateString()}</small>
                    </div>
                    <span className={`status-pill ${p.status === 'Completed' || p.status === 'Approved' ? 'status-approved' : 'status-pending'}`}>
                      {p.status || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT STUDENT REVIEWS & FEEDBACK */}
          <div className="dash-card" style={{ marginTop: '20px' }}>
            <div className="dash-card-header">
              <h3><i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> Student Ratings & Reviews</h3>
            </div>
            {reviews.length === 0 ? (
              <div style={{ textalign: 'center', color: '#94a3b8', padding: '16px', fontSize: '13px' }}>
                No student reviews submitted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.map((rev, idx) => (
                  <div key={rev._id || idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f2a4a' }}>{rev.studentName || rev.student?.name || 'Student'}</strong>
                      <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><FiStar size={12} fill="#f59e0b" /> {rev.rating || 5}/5</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>"{rev.comment || rev.reviewText || 'Great teacher!'}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
