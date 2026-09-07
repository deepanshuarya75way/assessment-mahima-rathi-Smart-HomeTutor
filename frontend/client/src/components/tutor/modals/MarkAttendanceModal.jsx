import React, { useState, useEffect } from 'react';

export const MarkAttendanceModal = ({ isOpen, onClose, schedule, onSuccess }) => {
  const [status, setStatus] = useState('Present');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (schedule) {
      setStatus(schedule.attendance && schedule.attendance !== 'Pending' ? schedule.attendance : 'Present');
      setNotes('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classScheduleId: schedule._id,
          studentId: schedule.student ? (schedule.student._id || schedule.student) : undefined,
          status,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Student attendance marked as ${status}!`);
        setTimeout(() => {
          if (onSuccess) onSuccess(data);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.message || 'Failed to mark attendance.');
      }
    } catch (err) {
      console.error('Mark Attendance Submit Error:', err);
      setErrorMsg('Server connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = schedule.student ? (schedule.student.name || schedule.student.email || 'Student') : 'Student';
  const dateStr = schedule.date ? new Date(schedule.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled Date';

  return (
    <div className="dash-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="dash-modal-card" style={{ maxWidth: '480px', width: '90%', borderRadius: '16px', padding: '24px', background: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-clipboard-check" style={{ color: '#0284c7' }}></i> Mark Class Attendance
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SESSION DETAILS */}
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Class Session Details</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f2a4a' }}>{schedule.subject || 'Tuition Class'}</div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
              Student: <strong>{studentName}</strong> &bull; {dateStr}
            </div>
          </div>

          {/* STATUS SELECTOR */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
              Select Attendance Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStatus('Present')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: status === 'Present' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: status === 'Present' ? '#dcfce7' : '#ffffff',
                  color: status === 'Present' ? '#15803d' : '#475569',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-circle-check"></i> Present
              </button>

              <button
                type="button"
                onClick={() => setStatus('Absent')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: status === 'Absent' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: status === 'Absent' ? '#fee2e2' : '#ffffff',
                  color: status === 'Absent' ? '#b91c1c' : '#475569',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-circle-xmark"></i> Absent
              </button>

              <button
                type="button"
                onClick={() => setStatus('Late')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: status === 'Late' ? '2px solid #d97706' : '1px solid #cbd5e1',
                  background: status === 'Late' ? '#fef3c7' : '#ffffff',
                  color: status === 'Late' ? '#b45309' : '#475569',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className="fa-solid fa-clock"></i> Late
              </button>
            </div>
          </div>

          {/* NOTES / REMARKS */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Tutor Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              className="dash-input"
              placeholder="e.g. Completed Chapter 4 review session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </div>

          {/* ACTIONS */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="dash-btn dash-btn-outline"
              onClick={onClose}
              disabled={submitting}
              style={{ fontSize: '12.5px', padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn dash-btn-primary"
              disabled={submitting}
              style={{ fontSize: '12.5px', padding: '8px 18px', background: '#0284c7' }}
            >
              {submitting ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> Saving...</span>
              ) : (
                <span><i className="fa-solid fa-floppy-disk"></i> Save Attendance</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
