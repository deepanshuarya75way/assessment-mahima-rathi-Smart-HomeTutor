import React, { useState, useEffect } from 'react';
import { FiCheck, FiPlus, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { tutorApi } from '../../../services/tutorApi';

const PRESET_SUBJECTS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'English',
  'Social Studies',
  'Economics',
  'Accountancy',
  'Business Studies',
  'Hindi',
];

const AVAILABLE_CLASSES = [
  'Class 1-5 (Primary)',
  'Class 6-8 (Middle)',
  'Class 9-10 (Secondary)',
  'Class 11-12 (Higher Secondary)',
  'Graduation / Competitive Exams',
];

const AVAILABLE_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE'];

export const EditTutorProfileModal = ({ isOpen, onClose, tutorProfile, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('subjects');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [serviceAreaRadius, setServiceAreaRadius] = useState(10);

  const [highestQualification, setHighestQualification] = useState('');
  const [degreeName, setDegreeName] = useState('');
  const [collegeUniversity, setCollegeUniversity] = useState('');
  const [experience, setExperience] = useState(0);
  const [previousInstitute, setPreviousInstitute] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [classes, setClasses] = useState([]);
  const [board, setBoard] = useState([]);
  const [mode, setMode] = useState('Both');

  const [fee, setFee] = useState(0);
  const [feeType, setFeeType] = useState('Per Hour');
  const [availableDays, setAvailableDays] = useState([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [homeVisitsEnabled, setHomeVisitsEnabled] = useState(true);
  const [about, setAbout] = useState('');

  // Demo Class Slots State (Separate from regular recurring availability)
  const [demoDuration, setDemoDuration] = useState(60);
  const [demoAvailableDays, setDemoAvailableDays] = useState([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ]);
  const [demoTimeSlots, setDemoTimeSlots] = useState([
    '05:00 PM – 06:00 PM',
    '06:00 PM – 07:00 PM',
    '07:00 PM – 08:00 PM',
  ]);
  const [customSlotStart, setCustomSlotStart] = useState('05:00 PM');
  const [customSlotEnd, setCustomSlotEnd] = useState('06:00 PM');
  const [editingSlotIdx, setEditingSlotIdx] = useState(null);
  const [editingSlotVal, setEditingSlotVal] = useState('');

  useEffect(() => {
    if (tutorProfile) {
      setFullName(tutorProfile.fullName || tutorProfile.user?.name || '');
      setMobile(tutorProfile.mobile || '');
      setWhatsapp(tutorProfile.whatsapp || '');
      setEmail(tutorProfile.email || tutorProfile.user?.email || '');
      setCurrentAddress(tutorProfile.currentAddress || '');
      setCity(tutorProfile.city || '');
      setState(tutorProfile.state || '');
      setPincode(tutorProfile.pincode || '');
      setServiceAreaRadius(tutorProfile.serviceAreaRadius || 10);

      setHighestQualification(tutorProfile.highestQualification || tutorProfile.qualification || '');
      setDegreeName(tutorProfile.degreeName || '');
      setCollegeUniversity(tutorProfile.collegeUniversity || '');
      setExperience(tutorProfile.experience || (tutorProfile.totalExperience ? parseInt(tutorProfile.totalExperience) : 0));
      setPreviousInstitute(tutorProfile.previousInstitute || '');

      setSubjects(Array.isArray(tutorProfile.subjects) ? tutorProfile.subjects : []);
      setClasses(Array.isArray(tutorProfile.classes) ? tutorProfile.classes : []);
      setBoard(Array.isArray(tutorProfile.board) ? tutorProfile.board : []);
      setMode(tutorProfile.mode || 'Both');

      setFee(tutorProfile.fee || 0);
      setFeeType(tutorProfile.feeType || 'Per Hour');
      setAvailableDays(Array.isArray(tutorProfile.availableDays) ? tutorProfile.availableDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      setStartTime(tutorProfile.startTime || '09:00');
      setEndTime(tutorProfile.endTime || '19:00');
      setHomeVisitsEnabled(tutorProfile.homeVisitsEnabled !== undefined ? tutorProfile.homeVisitsEnabled : true);
      setAbout(tutorProfile.about || '');

      // Load Demo Class Slot Settings
      setDemoDuration(tutorProfile.demoDuration !== undefined ? Number(tutorProfile.demoDuration) : 60);
      setDemoAvailableDays(
        Array.isArray(tutorProfile.demoAvailableDays) && tutorProfile.demoAvailableDays.length > 0
          ? tutorProfile.demoAvailableDays
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      );
      setDemoTimeSlots(
        Array.isArray(tutorProfile.demoTimeSlots) && tutorProfile.demoTimeSlots.length > 0
          ? tutorProfile.demoTimeSlots.map((s) => (typeof s === 'object' && s !== null ? s.slotLabel || `${s.startTime} – ${s.endTime}` : String(s)))
          : ['05:00 PM – 06:00 PM', '06:00 PM – 07:00 PM', '07:00 PM – 08:00 PM']
      );
    }
  }, [tutorProfile, isOpen]);

  if (!isOpen) return null;

  // Add / Remove Subject Handlers
  const handleAddSubject = (subjectName) => {
    const trimmed = subjectName.trim();
    if (!trimmed) return;
    if (!subjects.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSubjects([...subjects, trimmed]);
    }
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (subjectToRemove) => {
    setSubjects(subjects.filter((s) => s.toLowerCase() !== subjectToRemove.toLowerCase()));
  };

  const toggleArrayItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Demo Time Slot Helpers
  const handleAddDemoSlot = (slotString) => {
    const trimmed = (slotString || `${customSlotStart} – ${customSlotEnd}`).trim();
    if (!trimmed) return;
    if (!demoTimeSlots.includes(trimmed)) {
      setDemoTimeSlots([...demoTimeSlots, trimmed]);
    }
  };

  const handleRemoveDemoSlot = (indexToRemove) => {
    setDemoTimeSlots(demoTimeSlots.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveEditedSlot = (idx) => {
    const trimmed = editingSlotVal.trim();
    if (trimmed) {
      const updated = [...demoTimeSlots];
      updated[idx] = trimmed;
      setDemoTimeSlots(updated);
    }
    setEditingSlotIdx(null);
    setEditingSlotVal('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (subjects.length === 0) {
      setErrorMsg('Please add at least one subject you teach.');
      return;
    }
    if (isNaN(Number(fee)) || Number(fee) < 0) {
      setErrorMsg('Fee must be a valid positive number.');
      return;
    }
    if (demoAvailableDays.length === 0) {
      setErrorMsg('Please select at least one available day for demo classes.');
      return;
    }
    if (demoTimeSlots.length === 0) {
      setErrorMsg('Please add at least one available time slot for demo classes.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim().toLowerCase(),
        currentAddress: currentAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        serviceAreaRadius: Number(serviceAreaRadius) || 10,
        highestQualification: highestQualification.trim(),
        degreeName: degreeName.trim(),
        collegeUniversity: collegeUniversity.trim(),
        experience: Number(experience) || 0,
        totalExperience: String(experience),
        previousInstitute: previousInstitute.trim(),
        subjects,
        classes,
        board,
        mode,
        fee: Number(fee),
        feeType,
        availableDays,
        startTime,
        endTime,
        homeVisitsEnabled,
        about: about.trim(),
        demoDuration: Number(demoDuration) || 60,
        demoAvailableDays,
        demoTimeSlots,
      };

      const res = await tutorApi.updateTutorProfile(payload);
      if (res.success) {
        setErrorMsg('');
        setSuccessMsg('Tutor profile updated successfully!');
        try {
          if (onSuccess) await onSuccess(res.tutorProfile || payload);
        } catch (callErr) {
          console.warn('Dashboard reload error after profile save:', callErr);
        }
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      } else {
        setSuccessMsg('');
        setErrorMsg(res.message || 'Failed to update tutor profile.');
      }
    } catch (err) {
      console.error('Update Tutor Profile UI Error:', err);
      setSuccessMsg('');
      setErrorMsg('An error occurred while saving profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f2a4a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-user-pen" style={{ color: '#0284c7' }}></i> Edit Educator Profile & Teaching Details
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Update your subjects, tuition rates, qualifications, and availability in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer', padding: '4px' }}
          >
            &times;
          </button>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div
          className="no-scrollbar"
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: '0 16px',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            alignItems: 'center',
            gap: '4px',
            minHeight: '52px',
          }}
        >
          {[
            { id: 'subjects', label: 'Subjects & Teaching', icon: 'fa-book-open' },
            { id: 'rates', label: 'Rates & Availability', icon: 'fa-sack-dollar' },
            { id: 'personal', label: 'Personal & Contact', icon: 'fa-user' },
            { id: 'qualifications', label: 'Qualifications & Exp', icon: 'fa-graduation-cap' },
            { id: 'demo-slots', label: 'Demo Class Slots', icon: 'fa-calendar-check' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 12px',
                border: 'none',
                background: 'none',
                fontSize: '13px',
                lineHeight: '1.4',
                fontWeight: activeTab === tab.id ? '800' : '600',
                color: activeTab === tab.id ? '#0284c7' : '#64748b',
                borderBottom: activeTab === tab.id ? '3px solid #0284c7' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} id="edit-tutor-profile-form">
            {/* TAB 1: SUBJECTS & TEACHING */}
            {activeTab === 'subjects' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    Teaching Subjects * (Current: {subjects.length} Selected)
                  </label>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                    Add or remove subjects you wish to teach. Students on "Find Tutors" can discover you by searching these subjects.
                  </p>

                  {/* ACTIVE SUBJECT CHIPS */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', minHeight: '38px', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {subjects.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No subjects added yet. Pick from preset tags below or add a custom subject.</span>
                    ) : (
                      subjects.map((sub, idx) => (
                        <span
                          key={idx}
                          style={{
                            background: '#0284c7',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => handleRemoveSubject(sub)}
                            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', padding: 0 }}
                            title={`Remove ${sub}`}
                          >
                            &times;
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* ADD CUSTOM SUBJECT INPUT */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      className="tr-input"
                      placeholder="Type custom subject name (e.g. Higher Algebra)..."
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubject(newSubjectInput);
                        }
                      }}
                      style={{ flex: 1, height: '42px', fontSize: '13.5px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 14px', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      className="dash-btn dash-btn-primary"
                      onClick={() => handleAddSubject(newSubjectInput)}
                      style={{ padding: '0 16px', height: '42px', fontSize: '13px' }}
                    >
                      <i className="fa-solid fa-plus"></i> Add Subject
                    </button>
                  </div>

                  {/* PRESET QUICK TAGS */}
                  <div>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                      Quick Add Popular Subjects:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {PRESET_SUBJECTS.map((preset) => {
                        const isAdded = subjects.some((s) => s.toLowerCase() === preset.toLowerCase());
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => (isAdded ? handleRemoveSubject(preset) : handleAddSubject(preset))}
                            style={{
                              background: isAdded ? '#dcfce7' : '#f1f5f9',
                              color: isAdded ? '#15803d' : '#334155',
                              border: isAdded ? '1px solid #86efac' : '1px solid #cbd5e1',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            {isAdded ? <FiCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <FiPlus size={14} style={{ display: 'inline', marginRight: '4px' }} />} {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CLASSES / GRADES */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    Target Classes & Student Levels
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AVAILABLE_CLASSES.map((cls) => {
                      const isSelected = classes.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleArrayItem(classes, setClasses, cls)}
                          style={{
                            background: isSelected ? '#e0f2fe' : '#ffffff',
                            color: isSelected ? '#0369a1' : '#475569',
                            border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? <FiCheckSquare size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <FiSquare size={14} style={{ display: 'inline', marginRight: '4px' }} />} {cls}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EDUCATIONAL BOARD */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    Educational Boards Supported
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {AVAILABLE_BOARDS.map((b) => {
                      const isSelected = board.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleArrayItem(board, setBoard, b)}
                          style={{
                            background: isSelected ? '#fef3c7' : '#ffffff',
                            color: isSelected ? '#b45309' : '#475569',
                            border: isSelected ? '1px solid #f59e0b' : '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? <FiCheckSquare size={14} style={{ display: 'inline', marginRight: '4px' }} /> : <FiSquare size={14} style={{ display: 'inline', marginRight: '4px' }} />} {b}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TEACHING MODE */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    Teaching Mode Preference
                  </label>
                  <select
                    className="tr-select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      fontSize: '13.5px',
                      fontWeight: '600',
                      padding: '0 32px 0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                      lineHeight: '40px',
                    }}
                  >
                    <option value="Both">Both Online & Home Tuition</option>
                    <option value="Online">Online Tuition Only</option>
                    <option value="Home Tuition">Home Tuition Only</option>
                    <option value="Offline">Offline Center Only</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 2: RATES & AVAILABILITY */}
            {activeTab === 'rates' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Tuition Fee Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="tr-input"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                      required
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Fee Billing Structure
                    </label>
                    <select
                      className="tr-select"
                      value={feeType}
                      onChange={(e) => setFeeType(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', fontWeight: '600', padding: '0 32px 0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box', lineHeight: '40px' }}
                    >
                      <option value="Per Hour">Per Hour (₹ / Hr)</option>
                      <option value="Per Class">Per Class Session</option>
                      <option value="Monthly">Monthly Package</option>
                    </select>
                  </div>
                </div>

                {/* AVAILABLE DAYS */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    Available Teaching Days
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const isSelected = availableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleArrayItem(availableDays, setAvailableDays, day)}
                          style={{
                            background: isSelected ? '#0f2a4a' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#334155',
                            border: isSelected ? '1px solid #0f2a4a' : '1px solid #cbd5e1',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="tr-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      End Time
                    </label>
                    <input
                      type="time"
                      className="tr-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* HOME VISITS ENABLED TOGGLE */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '13.5px', color: '#0f2a4a', display: 'block' }}>Accept In-Person Home Visits</strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Allow parents to request home visits within your service radius.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={homeVisitsEnabled}
                    onChange={(e) => setHomeVisitsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {/* BIO / ABOUT EDUCATOR */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Educator Bio & Teaching Approach
                  </label>
                  <textarea
                    className="tr-input"
                    placeholder="Describe your background, teaching methodology, student success stories..."
                    rows="4"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    style={{ width: '100%', fontSize: '13.5px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', lineHeight: '1.5' }}
                  ></textarea>
                </div>
              </div>
            )}

            {/* TAB 3: PERSONAL & CONTACT */}
            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="tr-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Primary Mobile (10 digits)
                    </label>
                    <input
                      type="text"
                      className="tr-input"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      className="tr-input"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="tr-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Current Address
                  </label>
                  <input
                    type="text"
                    className="tr-input"
                    value={currentAddress}
                    onChange={(e) => setCurrentAddress(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      City
                    </label>
                    <input
                      type="text"
                      className="tr-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      State
                    </label>
                    <input
                      type="text"
                      className="tr-input"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      className="tr-input"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Preferred Service Radius (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="tr-input"
                    value={serviceAreaRadius}
                    onChange={(e) => setServiceAreaRadius(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: QUALIFICATIONS & EXP */}
            {activeTab === 'qualifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Highest Qualification / Degree Name
                  </label>
                  <input
                    type="text"
                    className="tr-input"
                    placeholder="e.g. M.Sc Physics, B.Tech Computer Science..."
                    value={highestQualification}
                    onChange={(e) => setHighestQualification(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    College / University
                  </label>
                  <input
                    type="text"
                    className="tr-input"
                    placeholder="e.g. Delhi University, IIT Delhi..."
                    value={collegeUniversity}
                    onChange={(e) => setCollegeUniversity(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Teaching Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="tr-input"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Previous Institutes / Coaching Experience
                  </label>
                  <input
                    type="text"
                    className="tr-input"
                    placeholder="e.g. Allen Institute, FIITJEE, Independent Tutor..."
                    value={previousInstitute}
                    onChange={(e) => setPreviousInstitute(e.target.value)}
                    style={{ width: '100%', height: '42px', fontSize: '13.5px', padding: '0 14px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 5: DEMO CLASS SLOTS */}
            {activeTab === 'demo-slots' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* INFO BANNER */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', color: '#166534', fontSize: '13px' }}>
                  <div style={{ fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-graduation-cap"></i> 1-on-1 Trial Demo Class Availability
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#15803d', lineHeight: '1.5' }}>
                    These settings are <strong>strictly for one-time trial demo classes</strong> booked by prospective students. They do NOT affect your regular recurring weekly class schedule.
                  </p>
                </div>

                {/* 1. DEMO CLASS DURATION */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    1. Demo Class Duration
                  </label>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                    Select the standard duration for your trial demo sessions.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { val: 30, label: '30 Minutes' },
                      { val: 45, label: '45 Minutes' },
                      { val: 60, label: '60 Minutes (Standard)' },
                      { val: 90, label: '90 Minutes' },
                    ].map((dur) => {
                      const isSelected = demoDuration === dur.val;
                      return (
                        <button
                          key={dur.val}
                          type="button"
                          onClick={() => setDemoDuration(dur.val)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: isSelected ? '#e0f2fe' : '#ffffff',
                            color: isSelected ? '#0369a1' : '#334155',
                            fontWeight: isSelected ? '800' : '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isSelected && <FiCheck size={14} />} {dur.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. DEMO CLASS AVAILABLE DAYS */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#0f2a4a', margin: 0 }}>
                      2. Demo Class Available Days * ({demoAvailableDays.length} Selected)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setDemoAvailableDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                      >
                        All 7 Days
                      </button>
                      <span style={{ color: '#cbd5e1' }}>&bull;</span>
                      <button
                        type="button"
                        onClick={() => setDemoAvailableDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                      >
                        Mon - Fri
                      </button>
                      <span style={{ color: '#cbd5e1' }}>&bull;</span>
                      <button
                        type="button"
                        onClick={() => setDemoAvailableDays([])}
                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                    Select which days you are willing to conduct 1-on-1 trial demo classes.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                      const isSelected = demoAvailableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleArrayItem(demoAvailableDays, setDemoAvailableDays, day)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: isSelected ? '1px solid #16a34a' : '1px solid #cbd5e1',
                            background: isSelected ? '#dcfce7' : '#ffffff',
                            color: isSelected ? '#15803d' : '#475569',
                            fontWeight: isSelected ? '700' : '600',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isSelected ? <FiCheckSquare size={14} /> : <FiSquare size={14} />} {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. DEMO CLASS TIME SLOTS */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#0f2a4a', marginBottom: '6px' }}>
                    3. Demo Class Time Slots * ({demoTimeSlots.length} Slots Configured)
                  </label>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                    Define the specific time slots during which students can book their demo session with you.
                  </p>

                  {/* ACTIVE TIME SLOTS LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                    {demoTimeSlots.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '12.5px' }}>
                        No demo time slots added yet. Please add at least one slot below.
                      </div>
                    ) : (
                      demoTimeSlots.map((slot, idx) => {
                        const isEditing = editingSlotIdx === idx;
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="tr-input"
                                  value={editingSlotVal}
                                  onChange={(e) => setEditingSlotVal(e.target.value)}
                                  placeholder="e.g. 05:00 PM – 06:00 PM"
                                  style={{ flex: 1, height: '36px', fontSize: '13px', borderRadius: '6px', border: '1px solid #0284c7', padding: '0 10px' }}
                                />
                                <button
                                  type="button"
                                  className="dash-btn dash-btn-primary"
                                  onClick={() => handleSaveEditedSlot(idx)}
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="dash-btn dash-btn-outline"
                                  onClick={() => { setEditingSlotIdx(null); setEditingSlotVal(''); }}
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                                    {idx + 1}
                                  </span>
                                  <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                                    <i className="fa-regular fa-clock" style={{ color: '#0284c7', marginRight: '6px' }}></i> {slot}
                                  </span>
                                  <span style={{ fontSize: '10.5px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    {demoDuration} Mins
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => { setEditingSlotIdx(idx); setEditingSlotVal(slot); }}
                                    style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                                    title="Edit Slot"
                                  >
                                    <i className="fa-solid fa-pen"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDemoSlot(idx)}
                                    style={{ background: 'none', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                                    title="Remove Slot"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ADD CUSTOM / PRESET TIME SLOTS */}
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Add New Time Slot:
                    </span>
                    
                    {/* CUSTOM START & END TIME INPUTS */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>Start Time</label>
                        <select
                          className="tr-input"
                          value={customSlotStart}
                          onChange={(e) => setCustomSlotStart(e.target.value)}
                          style={{ width: '100%', height: '38px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                        >
                          {[
                            '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                            '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
                            '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM',
                          ].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: '130px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>End Time</label>
                        <select
                          className="tr-input"
                          value={customSlotEnd}
                          onChange={(e) => setCustomSlotEnd(e.target.value)}
                          style={{ width: '100%', height: '38px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px' }}
                        >
                          {[
                            '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
                            '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
                            '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM',
                          ].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="dash-btn dash-btn-primary"
                        onClick={() => handleAddDemoSlot(`${customSlotStart} – ${customSlotEnd}`)}
                        style={{ alignSelf: 'flex-end', height: '38px', padding: '0 16px', fontSize: '12.5px', fontWeight: '700' }}
                      >
                        <i className="fa-solid fa-plus"></i> Add Time Slot
                      </button>
                    </div>

                    {/* QUICK PRESET BUTTONS */}
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Quick Add Common Time Slots:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {[
                          '10:00 AM – 11:00 AM',
                          '04:00 PM – 05:00 PM',
                          '05:00 PM – 06:00 PM',
                          '06:00 PM – 07:00 PM',
                          '07:00 PM – 08:00 PM',
                          '08:00 PM – 09:00 PM',
                        ].map((preset) => {
                          const isAdded = demoTimeSlots.includes(preset);
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                if (!isAdded) handleAddDemoSlot(preset);
                              }}
                              disabled={isAdded}
                              style={{
                                background: isAdded ? '#f1f5f9' : '#e0f2fe',
                                color: isAdded ? '#94a3b8' : '#0284c7',
                                border: isAdded ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: '600',
                                cursor: isAdded ? 'default' : 'pointer',
                              }}
                            >
                              {isAdded ? <FiCheck size={12} style={{ display: 'inline', marginRight: '3px' }} /> : <FiPlus size={12} style={{ display: 'inline', marginRight: '3px' }} />}
                              {preset}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="dash-btn dash-btn-outline"
            onClick={onClose}
            style={{ fontSize: '13px', padding: '8px 18px' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-tutor-profile-form"
            className="dash-btn dash-btn-primary"
            disabled={saving}
            style={{ fontSize: '13px', padding: '8px 24px' }}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Saving Changes...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Save Profile Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
