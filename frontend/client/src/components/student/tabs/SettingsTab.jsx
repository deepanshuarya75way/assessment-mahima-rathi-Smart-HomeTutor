import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';
import {
  UserIcon,
  LockIcon,
  ShieldIcon,
  CheckIcon,
  SpinnerIcon,
  ExclamationIcon,
  EyeIcon,
  EyeOffIcon,
  CrossIcon,
} from '../../common/ReactIcons';

export const SettingsTab = ({ studentData, onProfileUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'security' | 'danger'

  // --- Profile Form State ---
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: 'Male',
    city: '',
    location: '',
    grade: '',
    profileImage: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // --- Password Form State ---
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // --- Discontinue Classes State ---
  const [activeTutors, setActiveTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [discReason, setDiscReason] = useState('');
  const [isDiscModalOpen, setIsDiscModalOpen] = useState(false);
  const [discLoading, setDiscLoading] = useState(false);
  const [discSuccess, setDiscSuccess] = useState('');
  const [discError, setDiscError] = useState('');
  const [discPreview, setDiscPreview] = useState(null);
  const [discPreviewLoading, setDiscPreviewLoading] = useState(false);

  // Fetch Active Regular Tutors when Danger tab is active
  useEffect(() => {
    if (activeSubTab === 'danger') {
      fetchActiveTutors();
    }
  }, [activeSubTab]);

  const fetchActiveTutors = async () => {
    try {
      setLoadingTutors(true);
      const res = await studentApi.getMyTutors();
      if (res.success && Array.isArray(res.tutors)) {
        setActiveTutors(res.tutors);
      } else {
        setActiveTutors([]);
      }
    } catch (err) {
      console.error('Fetch Active Tutors Error:', err);
      setActiveTutors([]);
    } finally {
      setLoadingTutors(false);
    }
  };

  const selectedTutor = activeTutors.find(
    (t) => String(t._id) === String(selectedTutorId) || String(t.tutorProfileId) === String(selectedTutorId)
  );

  // Load preview when tutor selection changes
  const handleOpenDiscModal = async () => {
    if (!selectedTutorId) {
      setDiscError('Please select a tutor to discontinue classes.');
      return;
    }
    setDiscError('');
    setIsDiscModalOpen(true);
    setDiscPreviewLoading(true);
    setDiscPreview(null);
    try {
      const res = await studentApi.getDiscontinuePreview(selectedTutorId);
      if (res.success && res.preview) {
        setDiscPreview(res.preview);
      }
    } catch (err) {
      console.error('Failed to load discontinue preview:', err);
    } finally {
      setDiscPreviewLoading(false);
    }
  };

  // Populate profile form from studentData prop or fetch initial profile
  useEffect(() => {
    if (studentData) {
      setProfileForm({
        name: studentData.name || '',
        phone: studentData.phone || '',
        dob: studentData.dob || '',
        gender: studentData.gender || 'Male',
        city: studentData.city || '',
        location: studentData.location || '',
        grade: studentData.grade || '',
        profileImage: studentData.profileImage || studentData.avatar || '',
      });
    } else {
      fetchStudentProfile();
    }
  }, [studentData]);

  const fetchStudentProfile = async () => {
    try {
      const res = await studentApi.getProfile();
      if (res.success && res.student) {
        setProfileForm({
          name: res.student.name || '',
          phone: res.student.phone || '',
          dob: res.student.dob || '',
          gender: res.student.gender || 'Male',
          city: res.student.city || '',
          location: res.student.location || '',
          grade: res.student.grade || '',
          profileImage: res.student.profileImage || res.student.avatar || '',
        });
      }
    } catch (err) {
      console.error('Fetch Profile Error:', err);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileForm.name.trim()) {
      setProfileError('Full Name is required.');
      return;
    }

    if (profileForm.phone && !/^\d{10}$/.test(profileForm.phone.trim())) {
      setProfileError('Mobile number must contain exactly 10 digits.');
      return;
    }

    setProfileLoading(true);
    try {
      const res = await studentApi.updateProfile(profileForm);
      if (res.success) {
        setProfileSuccess('Profile updated successfully');
        if (onProfileUpdated && typeof onProfileUpdated === 'function') {
          onProfileUpdated(res.student);
        }
        setTimeout(() => setProfileSuccess(''), 5000);
      } else {
        setProfileError(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update Profile Error:', err);
      setProfileError('Network error. Unable to save changes.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!passForm.currentPassword) {
      setPassError('Current password is required.');
      return;
    }

    if (!passForm.newPassword) {
      setPassError('New password cannot be empty.');
      return;
    }

    if (passForm.newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError('New password and confirmation password do not match.');
      return;
    }

    if (passForm.currentPassword === passForm.newPassword) {
      setPassError('New password must be different from your current password.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await studentApi.changePassword(passForm);
      if (res.success) {
        setPassSuccess('Password changed successfully.');
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPassSuccess(''), 5000);
      } else {
        setPassError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      console.error('Change Password Error:', err);
      setPassError('Network error. Password could not be changed.');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Discontinue Regular Classes
  const handleDiscontinueSubmit = async () => {
    if (!selectedTutorId) {
      setDiscError('Please select a tutor to discontinue classes.');
      return;
    }

    setDiscError('');
    setDiscLoading(true);
    try {
      const res = await studentApi.discontinueClass({
        tutorId: selectedTutorId,
        reason: discReason,
      });
      if (res.success) {
        setIsDiscModalOpen(false);
        setDiscSuccess(res.message || 'Regular classes discontinued successfully.');
        setSelectedTutorId('');
        setDiscReason('');
        await fetchActiveTutors();
        if (onProfileUpdated && typeof onProfileUpdated === 'function') {
          onProfileUpdated();
        }
        setTimeout(() => setDiscSuccess(''), 6000);
      } else {
        setDiscError(res.message || 'Failed to discontinue classes.');
      }
    } catch (err) {
      console.error('Discontinue Class Error:', err);
      setDiscError('Network error. Unable to discontinue classes.');
    } finally {
      setDiscLoading(false);
    }
  };

  const displayName = profileForm.name || studentData?.name || 'Student Account';
  const displayEmail = studentData?.email || 'student@smart-hometutor.com';
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="dash-tab-content settings-container" style={{ display: 'block' }}>
      
      {/* PROFILE HEADER HERO BANNER */}
      <div className="settings-header-card">
        {profileForm.profileImage ? (
          <img src={profileForm.profileImage} alt={displayName} className="settings-avatar-circle" />
        ) : (
          <div className="settings-avatar-circle">{initials}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff' }}>{displayName}</h2>
            <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '2px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700 }}>
              <i className="fa-solid fa-user-graduate"></i> Verified Student
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13.5px' }}>{displayEmail}</p>
        </div>
      </div>

      {/* SEGMENTED SUB-NAV TABS */}
      <div className="settings-nav-tabs">
        <button
          type="button"
          className={`settings-nav-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('profile')}
        >
          <UserIcon size={16} color={activeSubTab === 'profile' ? '#0284c7' : '#64748b'} /> Personal Profile
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeSubTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('security')}
        >
          <LockIcon size={16} color={activeSubTab === 'security' ? '#0284c7' : '#64748b'} /> Password & Security
        </button>
        <button
          type="button"
          className={`settings-nav-btn ${activeSubTab === 'danger' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('danger')}
        >
          <ExclamationIcon size={16} color={activeSubTab === 'danger' ? '#dc2626' : '#64748b'} /> Danger Zone
        </button>
      </div>

      {/* TAB 1: EDIT PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={20} color="#0284c7" /> Edit Profile Details
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Keep your contact information and academic details updated.
            </p>
          </div>

          {profileSuccess && (
            <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckIcon size={18} color="#15803d" /> {profileSuccess}
            </div>
          )}

          {profileError && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExclamationIcon size={18} color="#b91c1c" /> {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="settings-grid">
              
              {/* Full Name */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="settings-input"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Mobile Number (10 digits)
                </label>
                <input
                  type="tel"
                  className="settings-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                />
              </div>

              {/* Date of Birth */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="settings-input"
                  value={profileForm.dob}
                  onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                />
              </div>

              {/* Gender */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Gender
                </label>
                <select
                  className="settings-input"
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              {/* Grade / Academic Class */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Class / Grade Level
                </label>
                <input
                  type="text"
                  className="settings-input"
                  value={profileForm.grade}
                  onChange={(e) => setProfileForm({ ...profileForm, grade: e.target.value })}
                  placeholder="e.g. Class 10, Class 12, B.Tech"
                />
              </div>

              {/* City / Location */}
              <div className="settings-field-group">
                <label className="settings-label">
                  City / Location
                </label>
                <input
                  type="text"
                  className="settings-input"
                  value={profileForm.city || profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value, location: e.target.value })}
                  placeholder="e.g. New Delhi, Mumbai"
                />
              </div>

              {/* Profile Photo URL */}
              <div className="settings-field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="settings-label">
                  Profile Image URL
                </label>
                <input
                  type="url"
                  className="settings-input"
                  value={profileForm.profileImage}
                  onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="settings-btn-primary"
                disabled={profileLoading}
              >
                {profileLoading ? (
                  <>
                    <SpinnerIcon size={18} color="#ffffff" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckIcon size={18} color="#ffffff" /> Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: CHANGE PASSWORD */}
      {activeSubTab === 'security' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LockIcon size={20} color="#0284c7" /> Password & Credentials
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Update your password regularly to protect your account.
            </p>
          </div>

          {passSuccess && (
            <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckIcon size={18} color="#15803d" /> {passSuccess}
            </div>
          )}

          {passError && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExclamationIcon size={18} color="#b91c1c" /> {passError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px' }}>
              
              {/* Current Password */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Current Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="settings-pass-wrapper">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="settings-input"
                    value={passForm.currentPassword}
                    onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowCurrent(!showCurrent)}
                  >
                    {showCurrent ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="settings-field-group">
                <label className="settings-label">
                  New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="settings-pass-wrapper">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="settings-input"
                    value={passForm.newPassword}
                    onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="settings-field-group">
                <label className="settings-label">
                  Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="settings-pass-wrapper">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="settings-input"
                    value={passForm.confirmPassword}
                    onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    className="settings-eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="settings-btn-primary"
                  disabled={passLoading}
                >
                  {passLoading ? (
                    <>
                      <SpinnerIcon size={18} color="#ffffff" /> Updating Password...
                    </>
                  ) : (
                    <>
                      <LockIcon size={18} color="#ffffff" /> Update Password
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* TAB 3: DANGER ZONE - DISCONTINUE CLASSES */}
      {activeSubTab === 'danger' && (
        <div className="settings-card" style={{ border: '1.5px solid #fecdd3', background: '#fff5f5' }}>
          <div className="settings-card-header" style={{ borderBottom: '1px solid #ffe4e6' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ExclamationIcon size={20} color="#dc2626" /> Discontinue Classes
            </h3>
            <p style={{ margin: '6px 0 0 0', color: '#7f1d1d', fontSize: '13.5px', lineHeight: '1.6' }}>
              Want to stop your regular classes with a tutor? Select the tutor below to discontinue your active classes. Your account will remain fully active.
            </p>
          </div>

          {discSuccess && (
            <div style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckIcon size={18} color="#15803d" /> {discSuccess}
            </div>
          )}

          {loadingTutors ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              <SpinnerIcon size={20} color="#dc2626" /> Loading active regular tutors...
            </div>
          ) : activeTutors.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #fee2e2', margin: '10px 0' }}>
              <ExclamationIcon size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#334155', fontWeight: 700 }}>No Active Regular Classes</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
                You currently have no active regular classes with any tutor.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
              
              {/* Select Tutor Dropdown */}
              <div className="settings-field-group">
                <label className="settings-label" style={{ color: '#991b1b', fontWeight: 800 }}>
                  Select Tutor <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="settings-input"
                  value={selectedTutorId}
                  onChange={(e) => setSelectedTutorId(e.target.value)}
                  style={{ background: '#ffffff', borderColor: selectedTutorId ? '#dc2626' : '#cbd5e1' }}
                >
                  <option value="">Select a tutor</option>
                  {activeTutors.map((t) => (
                    <option key={t._id || t.tutorProfileId} value={t._id || t.tutorProfileId}>
                      {t.name} — {t.subject || 'Regular Classes'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Reason Dropdown */}
              <div className="settings-field-group">
                <label className="settings-label" style={{ color: '#7f1d1d' }}>
                  Reason for Discontinuation <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                </label>
                <select
                  className="settings-input"
                  value={discReason}
                  onChange={(e) => setDiscReason(e.target.value)}
                  style={{ background: '#ffffff' }}
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

              {discError && (
                <div style={{ color: '#dc2626', fontSize: '13.5px', fontWeight: 600 }}>
                  {discError}
                </div>
              )}

              <div>
                <button
                  type="button"
                  className="settings-btn-danger"
                  disabled={!selectedTutorId}
                  style={{
                    opacity: selectedTutorId ? 1 : 0.5,
                    cursor: selectedTutorId ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleOpenDiscModal}
                >
                  <ExclamationIcon size={18} color="#ffffff" /> Discontinue Classes
                </button>
              </div>

            </div>
          )}
        </div>
      )}

      {/* DISCONTINUE CLASSES CONFIRMATION MODAL */}
      {isDiscModalOpen && selectedTutor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative' }}>
            
            <button
              type="button"
              onClick={() => setIsDiscModalOpen(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <CrossIcon size={20} color="#64748b" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ExclamationIcon size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '18px', fontWeight: 800 }}>Discontinue Classes?</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px' }}>Confirm discontinuation of regular classes</p>
              </div>
            </div>

            {discPreviewLoading ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b' }}>
                <SpinnerIcon size={24} color="#dc2626" />
                <p style={{ margin: '10px 0 0 0', fontSize: '13.5px', fontWeight: 600 }}>Checking fee payment and class usage status...</p>
              </div>
            ) : discPreview && (discPreview.isFullyPaid || discPreview.totalPaidAmount > 0) ? (
              /* FULLY / PARTIALLY PAID FEE FLOW WITH REFUND */
              <div>
                <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ color: '#059669', fontSize: '18px', marginTop: '1px' }}>
                      <CheckIcon size={20} color="#059669" />
                    </div>
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

                <p style={{ color: '#334155', fontSize: '13.5px', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                  Do you want to discontinue regular classes with <strong>{selectedTutor.name}</strong>? Unused class balance (₹{discPreview.refundAmount.toLocaleString('en-IN')}) will be refunded directly to your Smart Wallet upon confirmation.
                </p>
              </div>
            ) : (
              /* UNPAID / ZERO PAYMENT FLOW */
              <div>
                <p style={{ color: '#334155', fontSize: '14.5px', lineHeight: '1.5', marginBottom: '12px' }}>
                  You are about to discontinue your regular classes with <strong>{selectedTutor.name}</strong> ({selectedTutor.subject || 'Regular Classes'}).
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', color: '#475569', fontSize: '13px', lineHeight: '1.5' }}>
                  Your account will remain active, but your regular classes with this tutor will be discontinued.
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
              >
                {discLoading ? (
                  <>
                    <SpinnerIcon size={16} color="#ffffff" /> Discontinuing...
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
