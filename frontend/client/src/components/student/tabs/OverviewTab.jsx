import React, { useState } from 'react';
import { AnnouncementsList } from '../../common/AnnouncementsList';
import { ReferralSection } from '../../common/ReferralSection';

export const OverviewTab = ({
  stats,
  upcomingClasses,
  referralCode,
  referralEarnings,
  referredCount = 0,
  referredUsers = [],
  onOpenAIRecommendations,
  onOpenReviewModal,
  onStartVideoCall,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const codeValue = referralCode || 'REF-B86925';
  const referralLinkUrl = `${window.location.origin}/signup?ref=${codeValue}`;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(codeValue);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLinkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareReferralLink = async () => {
    const shareData = {
      title: 'Join Smart HomeTutor',
      text: `Join Smart HomeTutor using my referral code ${codeValue} and get a ₹50 Welcome Bonus on your first tuition payment!`,
      url: referralLinkUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  const statItems = [
    { label: 'Upcoming Lessons', value: stats ? stats.upcomingClassesCount || 0 : 0, sub: 'Active bookings', icon: 'fa-calendar-check', bg: '#e0f2fe', color: '#0284c7' },
    { label: 'Learning Hours', value: stats ? `${stats.completedClassesCount || 0} hrs` : '0 hrs', sub: 'Active learning log', icon: 'fa-user-clock', bg: '#dcfce7', color: '#15803d' },
    { label: 'Active Tutors', value: stats ? `${stats.activeTutorsCount ?? stats.activeTutorCount ?? 0} Tutors` : '0 Tutors', sub: 'Active regular instructors', icon: 'fa-graduation-cap', bg: '#fef3c7', color: '#b45309' },
    { label: 'Attendance Rate', value: stats ? `${stats.attendancePercentage || 100}%` : '100%', sub: 'Overall attendance', icon: 'fa-chart-line', bg: '#f3e8ff', color: '#6b21a8' },
  ];

  const progressPct = stats ? stats.progressPercentage || 0 : 0;

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* STATS GRID */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        {statItems.map((st, idx) => (
          <div key={idx} className="stat-card">
            <div className="stat-info">
              <span className="stat-label">{st.label}</span>
              <div className="stat-value">{st.value}</div>
              <span className="stat-sub"><i className={`fa-solid ${st.icon}`}></i> {st.sub}</span>
            </div>
            <div className="stat-icon" style={{ background: st.bg, color: st.color }}>
              <i className={`fa-solid ${st.icon}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* CONTENT GRID */}
      <div className="dash-content-grid" style={{ gap: '20px' }}>
        {/* COLUMN 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* PLATFORM ANNOUNCEMENTS */}
          <div className="dash-card" style={{ borderLeft: '4px solid #f59e0b', padding: '18px 20px' }}>
            <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-bullhorn" style={{ color: '#d97706' }}></i> Platform Announcements & System Notices
              </h3>
              <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                Live Updates
              </span>
            </div>
            <AnnouncementsList role="student" />
          </div>

          {/* 1. UPCOMING LIVE CLASSES */}
          <div className="dash-card" style={{ padding: '18px 20px' }}>
            <div className="dash-card-header" style={{ marginBottom: '14px', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-video" style={{ color: '#0284c7' }}></i> Upcoming Live Classes
              </h3>
            </div>

            {upcomingClasses && upcomingClasses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingClasses.map((cls) => (
                  <div key={cls._id} style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13.5px', color: '#0f2a4a', fontWeight: '700' }}>{cls.subject || 'Live Class Session'}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                        Educator: {cls.tutor ? cls.tutor.name || 'Tutor' : 'Tutor'} &bull; {cls.time || 'Scheduled Time'}
                      </p>
                    </div>
                    <button className="dash-btn dash-btn-primary" style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '6px' }} onClick={onStartVideoCall}>
                      <i className="fa-solid fa-video" style={{ marginRight: '5px' }}></i> Join Class
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 18px', borderRadius: '10px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                    <i className="fa-solid fa-calendar-xmark"></i>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block' }}>No upcoming live classes today</span>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Book a tutor to schedule your next learning session.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="dash-btn dash-btn-outline"
                  style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                  onClick={() => { window.location.href = '/tutors'; }}
                >
                  <i className="fa-solid fa-graduation-cap" style={{ marginRight: '5px' }}></i> Book a Tutor
                </button>
              </div>
            )}
          </div>

          {/* 2. LEARNING SYLLABUS & ATTENDANCE PROGRESS */}
          <div className="dash-card" style={{ padding: '18px 20px' }}>
            <div className="dash-card-header" style={{ marginBottom: '14px', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-chart-bar" style={{ color: '#10b981' }}></i> Learning Syllabus Completion Progress
              </h3>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: '700', color: '#172533', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-book-open" style={{ color: '#0284c7', fontSize: '12px' }}></i> Overall Curriculum Mastery
                </span>
                <span style={{ fontSize: '14px', color: '#0284c7', fontFamily: 'monospace' }}>{progressPct}%</span>
              </div>

              <div style={{ height: '9px', width: '100%', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #0284c7 0%, #10b981 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.6s ease-in-out'
                }}></div>
              </div>
            </div>

            {/* SUBJECT-WISE ATTENDANCE BREAKDOWN */}
            <div style={{ marginTop: '14px' }}>
              <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f2a4a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-clipboard-user" style={{ color: '#0284c7' }}></i> Subject-Wise Attendance Breakdown
              </h4>

              {stats && stats.subjectWiseAttendance && stats.subjectWiseAttendance.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stats.subjectWiseAttendance.map((sub, idx) => (
                    <div key={idx} style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                        <span>{sub.subject}</span>
                        <span style={{ color: sub.attendancePercentage >= 75 ? '#16a34a' : '#d97706', fontFamily: 'monospace', fontWeight: '800' }}>
                          {sub.attendedClasses} / {sub.totalClasses} Attended &bull; {sub.attendancePercentage}%
                        </span>
                      </div>
                      <div style={{ height: '7px', width: '100%', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${sub.attendancePercentage}%`,
                          background: sub.attendancePercentage >= 75 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '12px' }}>
                  No subject attendance records available yet. Attended class sessions will calculate live percentages here.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 3. AI TUTOR RECOMMENDER */}
          <div className="dash-card" style={{ padding: '18px 20px' }}>
            <div className="dash-card-header" style={{ marginBottom: '12px', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-robot" style={{ color: '#0284c7' }}></i> AI Tutor Recommender
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.45' }}>
                  Find verified tutors matched specifically to your learning goals using AI.
                </p>
              </div>
              <button
                type="button"
                className="dash-btn dash-btn-accent"
                style={{
                  fontSize: '12px',
                  padding: '8px 16px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.15)',
                  transition: 'all 0.2s ease',
                }}
                onClick={onOpenAIRecommendations}
              >
                <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '6px' }}></i> View AI Recommendations
              </button>
            </div>
          </div>

          {/* 4. SUBMIT TUTOR REVIEW */}
          <div className="dash-card" style={{ padding: '18px 20px' }}>
            <div className="dash-card-header" style={{ marginBottom: '12px', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> Submit Tutor Review
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: '1.45' }}>
                  Completed a class recently? Share your feedback to help fellow students.
                </p>
              </div>
              <button
                type="button"
                className="dash-btn dash-btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '8px 16px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  background: '#0f2a4a',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
                onClick={onOpenReviewModal}
              >
                <i className="fa-solid fa-comment-medical" style={{ marginRight: '6px' }}></i> Rate & Review Tutor
              </button>
            </div>
          </div>

          {/* 5. PAYMENT-BASED REFERRAL REWARDS */}
          <ReferralSection
            referralCode={referralCode}
            referralEarnings={referralEarnings}
            referredCount={referredCount}
            referredUsers={referredUsers}
            userRole="student"
          />
        </div>
      </div>
    </div>
  );
};
