import React, { useState, useEffect } from 'react';

export const TutorBookingModal = ({ isOpen, onClose, tutorId, tutorName, tutor }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Tomorrow date string in YYYY-MM-DD
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const demoDuration = tutor?.demoDuration || 60;
  const availableDays = Array.isArray(tutor?.demoAvailableDays) && tutor.demoAvailableDays.length > 0
    ? tutor.demoAvailableDays
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const availableSlots = Array.isArray(tutor?.demoTimeSlots) && tutor.demoTimeSlots.length > 0
    ? tutor.demoTimeSlots.map((s) => (typeof s === 'object' && s !== null ? s.slotLabel || `${s.startTime} – ${s.endTime}` : String(s)))
    : ['05:00 PM – 06:00 PM', '06:00 PM – 07:00 PM', '07:00 PM – 08:00 PM'];

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setAlertMsg({ type: '', text: '' });
      setLoading(false);
      setSelectedDate(tomorrowStr);
      setSelectedSlot(availableSlots[0] || '05:00 PM – 06:00 PM');
    }
  }, [isOpen, tutorId, tutor]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertMsg({ type: '', text: '' });
    setLoading(true);

    const parts = selectedSlot ? selectedSlot.split(/[-–—]/).map((p) => p.trim()) : [];
    const scheduledStartTime = parts[0] || '18:00';
    const scheduledEndTime = parts[1] || '19:00';

    try {
      const response = await fetch('/api/student/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorProfileId: tutorId,
          message: message.trim(),
          isTrial: true,
          scheduledDate: selectedDate ? new Date(selectedDate) : new Date(Date.now() + 86400000),
          scheduledStartTime,
          scheduledEndTime,
          demoSlot: selectedSlot,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAlertMsg({ type: 'success', text: data.message || 'Demo class booking request sent successfully!' });
        setTimeout(() => {
          setMessage('');
          setAlertMsg({ type: '', text: '' });
          onClose();
        }, 1800);
      } else {
        setAlertMsg({ type: 'error', text: data.message || 'Failed to book demo class. Please make sure you are logged in as a student.' });
      }
    } catch (err) {
      console.error('Book demo class error:', err);
      setAlertMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-calendar-check" style={{ color: 'var(--accent, #f59e0b)' }}></i> Book Free Demo Class
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#475569' }}>
          Request a 1-on-1 trial demo class with <strong>{tutorName}</strong>.
        </p>

        {alertMsg.text && (
          <div style={{ background: alertMsg.type === 'success' ? '#dcfce7' : '#fef2f2', border: `1px solid ${alertMsg.type === 'success' ? '#86efac' : '#fca5a5'}`, color: alertMsg.type === 'success' ? '#166534' : '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            <i className={`fa-solid ${alertMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {alertMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* DEMO DETAILS CARD */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f2a4a' }}>
                <i className="fa-solid fa-clock" style={{ color: '#0284c7', marginRight: '6px' }}></i> Tutor Demo Schedule
              </span>
              <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                {demoDuration} Mins Duration
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              <strong>Available Days:</strong> {availableDays.join(', ')}
            </div>

            {/* DATE PICKER */}
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Select Preferred Date
              </label>
              <input
                type="date"
                min={tomorrowStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                style={{ width: '100%', height: '36px', fontSize: '13px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            {/* TIME SLOTS */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Select Time Slot
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: isSelected ? '#e0f2fe' : '#ffffff',
                        color: isSelected ? '#0369a1' : '#475569',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <i className="fa-regular fa-clock" style={{ fontSize: '11px', color: isSelected ? '#0284c7' : '#94a3b8' }}></i> {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#0f2a4a', marginBottom: '6px' }}>
              Message / Topics for Tutor (Optional)
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Specify required subjects, topics, or grade level..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="dash-btn dash-btn-outline" style={{ padding: '8px 18px', fontSize: '13px' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="dash-btn dash-btn-primary" style={{ padding: '8px 22px', fontSize: '13px' }}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</> : <><i className="fa-solid fa-paper-plane"></i> Send Booking Request</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
