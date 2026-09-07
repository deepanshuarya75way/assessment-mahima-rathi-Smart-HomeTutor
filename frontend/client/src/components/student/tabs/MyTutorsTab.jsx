import React, { useState, useEffect } from 'react';
import {
  FaGraduationCap,
  FaRotateRight,
  FaSpinner,
  FaTriangleExclamation,
  FaUserSlash,
  FaMagnifyingGlass,
  FaUser,
  FaCircle,
  FaXmark,
  FaCircleCheck,
  FaBan,
} from 'react-icons/fa6';
import { studentApi } from '../../../services/studentApi';

export const MyTutorsTab = ({ onFindTutor, onProfileUpdated }) => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Discontinue modal state
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [discReason, setDiscReason] = useState('');
  const [isDiscModalOpen, setIsDiscModalOpen] = useState(false);
  const [discLoading, setDiscLoading] = useState(false);
  const [discSuccess, setDiscSuccess] = useState('');
  const [discError, setDiscError] = useState('');
  const [discPreview, setDiscPreview] = useState(null);
  const [discPreviewLoading, setDiscPreviewLoading] = useState(false);

  const fetchMyTutors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentApi.getMyTutors();
      if (res.success) {
        setTutors(res.tutors || []);
      } else {
        setError(res.message || 'Failed to load regular tutors.');
      }
    } catch (err) {
      console.error('Fetch My Tutors error:', err);
      setError('Unable to load tutors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTutors();
  }, []);

  const handleOpenDiscontinue = async (tutor) => {
    setSelectedTutor(tutor);
    setDiscReason('');
    setDiscError('');
    setIsDiscModalOpen(true);
    setDiscPreviewLoading(true);
    setDiscPreview(null);
    try {
      const res = await studentApi.getDiscontinuePreview(tutor._id);
      if (res.success && res.preview) {
        setDiscPreview(res.preview);
      }
    } catch (err) {
      console.error('Error fetching discontinue preview:', err);
    } finally {
      setDiscPreviewLoading(false);
    }
  };

  const handleDiscontinueSubmit = async () => {
    if (!selectedTutor) return;
    setDiscLoading(true);
    setDiscError('');
    try {
      const res = await studentApi.discontinueClass({
        tutorId: selectedTutor._id,
        reason: discReason,
      });
      if (res.success) {
        setIsDiscModalOpen(false);
        setDiscSuccess(res.message || 'Classes discontinued successfully.');
        await fetchMyTutors();
        if (onProfileUpdated && typeof onProfileUpdated === 'function') {
          onProfileUpdated();
        }
        setTimeout(() => setDiscSuccess(''), 6000);
      } else {
        setDiscError(res.message || 'Failed to discontinue classes.');
      }
    } catch (err) {
      console.error('Discontinue error:', err);
      setDiscError('Network error. Unable to discontinue classes.');
    } finally {
      setDiscLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'TU';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="my-tutors-tab" style={{ maxWidth: '1200px', margin: '0 auto', padding: '10px 0' }}>
      {/* SECTION HEADER */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f2a4a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaGraduationCap style={{ color: '#0284c7' }} /> My Tutors
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Your active regular-class educators assigned to your subscription.
          </p>
        </div>
        <button
          type="button"
          className="dash-btn dash-btn-outline"
          onClick={fetchMyTutors}
          style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <FaRotateRight /> Refresh
        </button>
      </div>

      {discSuccess && (
        <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '12px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaCircleCheck style={{ color: '#16a34a' }} />
          <span>{discSuccess}</span>
        </div>
      )}

      {/* LOADING STATE */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <FaSpinner className="fa-spin" style={{ color: '#0284c7', fontSize: '32px', marginBottom: '12px' }} />
          <p style={{ fontWeight: 600 }}>Loading your regular tutors...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px 20px', borderRadius: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <FaTriangleExclamation />
          <span>{error}</span>
        </div>
      ) : tutors.length === 0 ? (
        /* EMPTY STATE */
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '2px dashed #cbd5e1',
          padding: '48px 24px',
          textAlign: 'center',
          maxWidth: '520px',
          margin: '30px auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 16px auto'
          }}>
            <FaUserSlash />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f2a4a', margin: '0 0 8px 0' }}>
            My Tutors
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>
            You don't have any regular-class tutors yet.
          </p>
          <button
            type="button"
            className="dash-btn dash-btn-primary"
            onClick={onFindTutor}
            style={{ padding: '12px 28px', fontSize: '14px', background: '#0284c7', borderColor: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
          >
            <FaMagnifyingGlass /> Find a Tutor
          </button>
        </div>
      ) : (
        /* TUTOR CARDS GRID */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {tutors.map((tutor) => (
            <div
              key={tutor._id}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* AVATAR */}
                {tutor.avatar ? (
                  <img
                    src={tutor.avatar}
                    alt={tutor.name}
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #0284c7',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(tutor.name)}
                  </div>
                )}

                {/* CARD DETAILS */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 3px 0', fontSize: '15.5px', fontWeight: 800, color: '#0f2a4a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaUser style={{ color: '#0284c7', fontSize: '13px' }} /> {tutor.name}
                  </h4>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                    {tutor.subject || 'Tuition'}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '10px', fontSize: '11.5px', fontWeight: '700' }}>
                    <FaCircle style={{ color: '#22c55e', fontSize: '7px' }} />
                    <span>Regular Classes</span>
                  </div>
                </div>
              </div>

              {/* CARD ACTION: DISCONTINUE BUTTON */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => handleOpenDiscontinue(tutor)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }}
                >
                  <FaBan style={{ fontSize: '11px' }} /> Discontinue Class
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DISCONTINUE MODAL */}
      {isDiscModalOpen && selectedTutor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative' }}>
            
            <button
              type="button"
              onClick={() => setIsDiscModalOpen(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '16px' }}
            >
              <FaXmark />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#dc2626', fontSize: '20px' }}>
                <FaTriangleExclamation />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '18px', fontWeight: 800 }}>Discontinue Classes?</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px' }}>Confirm discontinuation of regular classes</p>
              </div>
            </div>

            {discPreviewLoading ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                <FaSpinner className="fa-spin" style={{ color: '#dc2626', fontSize: '24px', marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600 }}>Checking fee payment and class usage status...</p>
              </div>
            ) : discPreview && (discPreview.isFullyPaid || discPreview.totalPaidAmount > 0) ? (
              /* FULLY / PARTIALLY PAID FEE FLOW WITH REFUND */
              <div>
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <FaCircleCheck style={{ color: '#059669', fontSize: '18px', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14.5px', fontWeight: 800, color: '#065f46' }}>
                        Paid Fees & Refund Eligible
                      </h4>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', color: '#047857', lineHeight: '1.5', fontWeight: 600 }}>
                        Your fees for this tutor have already been paid. You have <strong>{discPreview.remainingClasses}</strong> {discPreview.remainingClasses === 1 ? 'class' : 'classes'} remaining.
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#065f46', fontWeight: 800 }}>
                        Refund/adjustment amount: ₹{discPreview.refundAmount.toLocaleString('en-IN')}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BREAKDOWN CARD */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569' }}>
                    <span>Tutor & Subject:</span>
                    <strong style={{ color: '#0f2a4a' }}>{selectedTutor.name} ({selectedTutor.subject || 'Regular Classes'})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569' }}>
                    <span>Total Fee Paid:</span>
                    <strong style={{ color: '#0f2a4a' }}>₹{discPreview.totalPaidAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569' }}>
                    <span>Classes Completed:</span>
                    <span style={{ fontWeight: 700, color: '#0f2a4a' }}>{discPreview.usedClasses} of {discPreview.totalClasses}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569' }}>
                    <span>Classes Remaining:</span>
                    <span style={{ fontWeight: 700, color: '#0284c7' }}>{discPreview.remainingClasses}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px', fontSize: '13.5px' }}>
                    <span style={{ fontWeight: 800, color: '#0f2a4a' }}>Refund to Smart Wallet:</span>
                    <strong style={{ color: '#059669', fontSize: '14.5px' }}>₹{discPreview.refundAmount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7f1d1d', marginBottom: '4px' }}>
                    Reason for Discontinuation (Optional)
                  </label>
                  <select
                    value={discReason}
                    onChange={(e) => setDiscReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="">Select a reason (optional)</option>
                    <option value="Schedule conflict">Schedule conflict</option>
                    <option value="Fee issue">Fee issue</option>
                    <option value="Tutor preference">Tutor preference</option>
                    <option value="No longer need classes">No longer need classes</option>
                    <option value="Academic change">Academic change</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <p style={{ color: '#334155', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                  Do you want to discontinue regular classes with <strong>{selectedTutor.name}</strong>? Unused class balance (₹{discPreview.refundAmount.toLocaleString('en-IN')}) will be refunded directly to your Smart Wallet upon confirmation.
                </p>
              </div>
            ) : (
              /* UNPAID / ZERO PAYMENT FLOW */
              <div>
                <p style={{ color: '#334155', fontSize: '14.5px', lineHeight: '1.5', marginBottom: '12px' }}>
                  You are about to discontinue your regular classes with <strong>{selectedTutor.name}</strong> ({selectedTutor.subject || 'Regular Classes'}).
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
                  Your account will remain active, but your regular classes with this tutor will be discontinued.
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#7f1d1d', marginBottom: '4px' }}>
                    Reason for Discontinuation (Optional)
                  </label>
                  <select
                    value={discReason}
                    onChange={(e) => setDiscReason(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="">Select a reason (optional)</option>
                    <option value="Schedule conflict">Schedule conflict</option>
                    <option value="Fee issue">Fee issue</option>
                    <option value="Tutor preference">Tutor preference</option>
                    <option value="No longer need classes">No longer need classes</option>
                    <option value="Academic change">Academic change</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {discError && (
              <div style={{ color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                {discError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="dash-btn dash-btn-outline"
                onClick={() => setIsDiscModalOpen(false)}
                disabled={discLoading || discPreviewLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="settings-btn-danger"
                disabled={discLoading || discPreviewLoading}
                onClick={handleDiscontinueSubmit}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {discLoading ? (
                  <>
                    <FaSpinner className="fa-spin" /> Discontinuing...
                  </>
                ) : discPreview && discPreview.refundAmount > 0 ? (
                  'Discontinue & Claim Refund'
                ) : (
                  'Confirm Discontinuation'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
