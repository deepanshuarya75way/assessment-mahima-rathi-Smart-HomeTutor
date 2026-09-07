import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';
import { isDemoCompletedForTutor, isPendingDemoForTutor } from '../../../utils/demoEligibility';

export const BookDemoModal = ({
  isOpen,
  onClose,
  tutor,
  onSuccess,
  onOpenRegularPayment,
  completedDemoTutorIds = [],
  pendingDemoTutorIds = [],
}) => {
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [isTrial, setIsTrial] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingWarning, setPendingWarning] = useState('');

  const isDemoUsed = isDemoCompletedForTutor(tutor, completedDemoTutorIds);
  const isDemoPending = isPendingDemoForTutor(tutor, pendingDemoTutorIds);
  const tutorName = tutor && tutor.user ? tutor.user.name || 'Tutor' : 'Tutor';
  const subjects = tutor && tutor.subjects ? tutor.subjects.join(', ') : 'General Subjects';

  useEffect(() => {
    if (isOpen) {
      // Clear stale frontend error/warning state from previously opened tutor modals
      setError('');
      setAddress('');
      setMessage('');
      setIsHomeVisit(false);
      setLoading(false);

      if (isDemoUsed) {
        setIsTrial(false);
        setPendingWarning('');
      } else if (isDemoPending) {
        setIsTrial(false);
        setPendingWarning(`You already have a pending demo class request for ${tutorName}.`);
      } else {
        setIsTrial(true);
        setPendingWarning('');
      }
    }
  }, [isOpen, tutor, isDemoUsed, isDemoPending, tutorName]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isTrial && onOpenRegularPayment) {
      onClose();
      onOpenRegularPayment(tutor);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resData = await studentApi.bookTutor({
        tutorProfileId: tutor ? tutor._id : null,
        address,
        message,
        isHomeVisit,
        isTrial,
      });

      if (resData.success) {
        setLoading(false);
        if (onSuccess) onSuccess(resData.message);
        onClose();
      } else {
        setLoading(false);
        setError(resData.message || 'Failed to submit booking request.');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError('Network error submitting booking request.');
    }
  };

  const isDemoDisabled = isDemoUsed || isDemoPending;

  return (
    <div className="tr-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div className="tr-modal-card" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer' }}
        >
          &times;
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            <i className="fa-solid fa-calendar-plus"></i>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a' }}>Book Session with {tutorName}</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{subjects} &bull; ₹{tutor ? tutor.fee || 500 : 500}/hr</span>
          </div>
        </div>

        {isDemoUsed && (
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', color: '#1e40af', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#2563eb' }}></i>
            <span>You have already attended a demo class with this tutor. You can book Regular Classes instead.</span>
          </div>
        )}

        {!isDemoUsed && pendingWarning && (
          <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', color: '#c2410c', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#f97316' }}></i>
            <span>{pendingWarning}</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Session Type</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${isTrial ? '#0284c7' : '#cbd5e1'}`, background: isTrial ? '#f0f9ff' : '#f8fafc', cursor: isDemoDisabled ? 'not-allowed' : 'pointer', opacity: isDemoDisabled ? 0.55 : 1, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input type="radio" checked={isTrial} onChange={() => !isDemoDisabled && setIsTrial(true)} disabled={isDemoDisabled} />
                <span>Free / Trial Demo Class {isDemoUsed ? '(Used)' : isDemoPending ? '(Pending)' : ''}</span>
              </label>
              <label style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${!isTrial ? '#0284c7' : '#cbd5e1'}`, background: !isTrial ? '#f0f9ff' : '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input type="radio" checked={!isTrial} onChange={() => setIsTrial(false)} />
                <span>Regular Class</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={isHomeVisit} onChange={(e) => setIsHomeVisit(e.target.checked)} />
              <span>Request In-Person Home Visit (Tutor travels to address)</span>
            </label>
          </div>

          {isHomeVisit && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Home Address <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                className="tr-input"
                placeholder="House/Flat No., Landmark, Locality..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required={isHomeVisit}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Message to Tutor / Topics to Cover</label>
            <textarea
              className="tr-textarea"
              rows="3"
              placeholder="Specify convenient days/times or topics you'd like to focus on..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="dash-btn dash-btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dash-btn dash-btn-primary" disabled={loading}>
              {loading ? <span><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</span> : (!isTrial ? <span><i className="fa-solid fa-credit-card"></i> Proceed to Payment</span> : 'Send Booking Request')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
