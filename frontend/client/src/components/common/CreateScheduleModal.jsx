import React, { useState, useEffect } from 'react';

export const CreateScheduleModal = ({ isOpen, onClose, onSuccess, userRole = 'tutor', currentUserId = '' }) => {
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    studentId: '',
    tutorId: '',
    subject: 'Mathematics Tuition',
    frequency: 'Weekly',
    days: 'Mon, Wed, Fri',
    date: new Date().toISOString().split('T')[0],
    startTime: '05:00 PM',
    endTime: '06:00 PM',
    mode: 'Online',
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setErrorMsg('');
    try {
      if (userRole === 'admin') {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          const stds = data.users.filter((u) => u.role === 'student');
          const tuts = data.users.filter((u) => u.role === 'tutor');
          setStudents(stds);
          setTutors(tuts);
          if (stds.length > 0) setFormData((prev) => ({ ...prev, studentId: stds[0]._id }));
          if (tuts.length > 0) setFormData((prev) => ({ ...prev, tutorId: tuts[0]._id }));
        }
      } else {
        // Tutor role: fetch booking requests or students
        const res = await fetch('/api/tutor/booking-requests');
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          const accepted = data.requests.filter((r) => r.status === 'Accepted' && r.student);
          const uniqueStudentsMap = new Map();
          accepted.forEach((r) => {
            if (r.student && r.student._id) {
              uniqueStudentsMap.set(r.student._id.toString(), r.student);
            }
          });
          const stdList = Array.from(uniqueStudentsMap.values());
          setStudents(stdList);
          if (stdList.length > 0) {
            setFormData((prev) => ({ ...prev, studentId: stdList[0]._id }));
          }
        }
      }
    } catch (err) {
      console.error('Fetch Users for Scheduling Error:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentId) {
      setErrorMsg('Please select a student.');
      return;
    }
    if (userRole === 'admin' && !formData.tutorId) {
      setErrorMsg('Please select a tutor.');
      return;
    }
    if (!formData.subject || !formData.date) {
      setErrorMsg('Subject and Date are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/schedule/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (onSuccess) onSuccess('Class session scheduled successfully!');
        onClose();
      } else {
        setErrorMsg(data.message || 'Failed to create class schedule.');
      }
    } catch (err) {
      console.error('Schedule Create Error:', err);
      setErrorMsg('Network error. Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            background: '#0f2a4a',
            color: '#ffffff',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-calendar-plus" style={{ color: '#0284c7' }}></i>
            Schedule Class Session
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              {errorMsg}
            </div>
          )}

          {/* STUDENT SELECTION */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Select Student *
            </label>
            {loadingUsers ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>Loading students...</p>
            ) : students.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#dc2626' }}>No active enrolled students found.</p>
            ) : (
              <select
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#f8fafc',
                }}
              >
                {students.map((std) => (
                  <option key={std._id} value={std._id}>
                    {std.name} ({std.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* TUTOR SELECTION (FOR ADMIN) */}
          {userRole === 'admin' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Select Educator / Tutor *
              </label>
              <select
                name="tutorId"
                value={formData.tutorId}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  background: '#f8fafc',
                }}
              >
                {tutors.map((tut) => {
                  const subjectDisplay = tut.subject ? ` — ${tut.subject}` : '';
                  return (
                    <option key={tut._id} value={tut._id}>
                      {tut.name}{subjectDisplay}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* SUBJECT / CLASS NAME */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Subject / Class Name *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g. Class 10th Mathematics"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
              }}
            />
          </div>

          {/* CLASS MODE & FREQUENCY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Class Mode *
              </label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: formData.mode === 'Online' ? '#e0f2fe' : '#fef3c7',
                  color: formData.mode === 'Online' ? '#0369a1' : '#b45309',
                }}
              >
                <option value="Online">Online (WebRTC Video)</option>
                <option value="Offline">Offline (In-Person / Home)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Frequency
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              >
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="One-Time">One-Time</option>
              </select>
            </div>
          </div>

          {/* DAYS & DATE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Class Days
              </label>
              <input
                type="text"
                name="days"
                value={formData.days}
                onChange={handleChange}
                placeholder="e.g. Mon, Wed, Fri"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                First Class Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* TIME RANGE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Class Start Time
              </label>
              <input
                type="text"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                placeholder="05:00 PM"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Class End Time
              </label>
              <input
                type="text"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                placeholder="06:00 PM"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="dash-btn dash-btn-outline"
              style={{ padding: '8px 18px' }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="dash-btn dash-btn-accent"
              style={{ padding: '8px 22px' }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  Saving Schedule...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                  Confirm & Create Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
