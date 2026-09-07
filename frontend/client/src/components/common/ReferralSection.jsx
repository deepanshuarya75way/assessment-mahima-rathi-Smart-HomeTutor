import React, { useState } from 'react';

export const ReferralSection = ({
  referralCode = '',
  referralEarnings = 0,
  referredCount = 0,
  referredUsers = [],
  userRole = 'student',
  title = '🎁 Referral Program & History',
  description = 'Earn ₹50 when a referred Student completes their first tuition payment, and ₹100 when a referred Tutor completes their first qualifying payment.',
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const codeValue = referralCode || 'REF-WELCOME';
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
      text: `Join Smart HomeTutor using my referral code ${codeValue} and earn rewards on your first payment!`,
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

  // Compute stats from referredUsers array if available
  const totalReferrals = referredUsers.length > 0 ? referredUsers.length : referredCount;
  const studentCount = referredUsers.filter(
    (u) => String(u.role).toLowerCase() === 'student' || String(u.referredRole).toLowerCase() === 'student'
  ).length;
  const tutorCount = referredUsers.filter(
    (u) => String(u.role).toLowerCase() === 'tutor' || String(u.referredRole).toLowerCase() === 'tutor'
  ).length;

  const computedEarnings = referredUsers.reduce((sum, u) => {
    return u.rewardStatus === 'Rewarded' ? sum + (Number(u.rewardAmount) || 0) : sum;
  }, 0);

  const finalEarnings = Math.max(referralEarnings, computedEarnings);

  return (
    <div className="dash-card" style={{ padding: '20px', marginBottom: '24px' }}>
      
      {/* SECTION HEADER */}
      <div className="dash-card-header" style={{ marginBottom: '14px', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f2a4a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-gift" style={{ color: '#10b981' }}></i> {title}
        </h3>
      </div>

      <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
        {description}
      </p>

      {/* REFERRAL CODE & LINK SHARING BOXES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        
        {/* REFERRAL CODE BOX */}
        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Your Referral Code
          </span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <strong style={{ fontSize: '16px', color: '#0f2a4a', letterSpacing: '0.8px', fontFamily: 'monospace' }}>
              {codeValue}
            </strong>
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              style={{ fontSize: '11.5px', padding: '5px 12px', height: '30px' }}
              onClick={copyReferralCode}
            >
              <i className="fa-solid fa-copy" style={{ marginRight: '4px' }}></i> {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* REFERRAL LINK & SHARE BUTTONS BOX */}
        <div style={{ background: '#f0f9ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
          <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            Your Referral Link
          </span>
          <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700', wordBreak: 'break-all', marginBottom: '8px' }}>
            {referralLinkUrl}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              style={{ fontSize: '11.5px', padding: '4px 10px', flex: 1, justifyContent: 'center', background: '#ffffff' }}
              onClick={copyReferralLink}
            >
              <i className="fa-solid fa-link" style={{ marginRight: '4px' }}></i> {copiedLink ? 'Copied Link!' : 'Copy Link'}
            </button>
            <button
              type="button"
              className="dash-btn dash-btn-primary"
              style={{ fontSize: '11.5px', padding: '4px 10px', flex: 1, justifyContent: 'center' }}
              onClick={shareReferralLink}
            >
              <i className="fa-solid fa-share-nodes" style={{ marginRight: '4px' }}></i> Share Link
            </button>
          </div>
        </div>

      </div>

      {/* REFERRAL SUMMARY CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        
        {/* TOTAL REFERRALS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-users" style={{ color: '#0284c7' }}></i> Total Referrals
          </span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f2a4a', marginTop: '4px' }}>
            {totalReferrals}
          </div>
        </div>

        {/* STUDENT REFERRALS */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px 14px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-user-graduate" style={{ color: '#0284c7' }}></i> Student Referrals
          </span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
            {studentCount}
          </div>
          <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>₹50 per payment</span>
        </div>

        {/* TUTOR REFERRALS */}
        <div style={{ background: '#fdf4ff', border: '1px solid #f5d0fe', padding: '12px 14px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#86198f', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-chalkboard-user" style={{ color: '#c026d3' }}></i> Tutor Referrals
          </span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#c026d3', marginTop: '4px' }}>
            {tutorCount}
          </div>
          <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>₹100 per payment</span>
        </div>

        {/* TOTAL REFERRAL EARNINGS */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 14px', borderRadius: '10px' }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-wallet" style={{ color: '#16a34a' }}></i> Total Earnings
          </span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
            ₹{finalEarnings.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '10.5px', color: '#166534', marginTop: '2px', display: 'block' }}>Credited to Wallet</span>
        </div>

      </div>

      {/* REFERRAL HISTORY TABLE SECTION */}
      <div>
        <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-list-check" style={{ color: '#0284c7' }}></i> Referral History List
        </h4>

        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <table className="dash-table" style={{ width: '100%', minWidth: '600px', margin: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Referred User</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Email</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Role</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Date Joined</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>First Payment</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Reward</th>
                <th style={{ padding: '10px 14px', fontSize: '11.5px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {referredUsers && referredUsers.length > 0 ? (
                referredUsers.map((u, idx) => {
                  const dateStr = u.joinedAt || u.createdAt
                    ? new Date(u.joinedAt || u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Recently';
                  const isRewarded = u.rewardStatus === 'Rewarded' || u.referralRewardStatus === 'Rewarded';
                  const displayRole = u.role || (u.referredRole === 'tutor' ? 'Tutor' : 'Student');
                  const isTutorRole = String(displayRole).toLowerCase().includes('tutor');

                  return (
                    <tr key={u.id || u._id || idx}>
                      <td style={{ fontWeight: '700', color: '#0f2a4a', fontSize: '13px' }}>
                        {u.name || 'Referred User'}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                        {u.email || '—'}
                      </td>
                      <td>
                        <span
                          style={{
                            background: isTutorRole ? '#fdf4ff' : '#f0f9ff',
                            color: isTutorRole ? '#c026d3' : '#0284c7',
                            border: `1px solid ${isTutorRole ? '#f5d0fe' : '#bae6fd'}`,
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                          }}
                        >
                          {displayRole}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '12.5px' }}>
                        {dateStr}
                      </td>
                      <td style={{ fontWeight: '600', color: '#334155', fontSize: '12.5px' }}>
                        {u.firstPaymentAmount && u.firstPaymentAmount > 0 ? `₹${u.firstPaymentAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td style={{ fontWeight: '800', color: isRewarded ? '#15803d' : '#64748b', fontSize: '13px' }}>
                        {isRewarded ? `₹${u.rewardAmount || (isTutorRole ? 100 : 50)}` : '₹0'}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${isRewarded ? 'status-confirmed' : 'status-pending'}`}
                          style={{
                            fontSize: '11px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                          }}
                        >
                          {isRewarded ? 'Rewarded' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13.5px' }}>
                    <i className="fa-solid fa-gift" style={{ fontSize: '24px', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}></i>
                    No referrals yet. Share your referral link with friends and colleagues to earn rewards when they join and complete their first payment!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
