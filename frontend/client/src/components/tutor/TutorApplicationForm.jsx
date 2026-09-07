import React, { useState, useEffect } from 'react';
import { FiCheck, FiPlus, FiCheckCircle, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

export const TutorApplicationForm = ({ onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Main Form Data State
  const [formData, setFormData] = useState({
    // Step 1: Personal & Location
    firstName: '',
    lastName: '',
    fullName: '',
    gender: '',
    dob: '',
    mobile: '',
    whatsapp: '',
    email: '',
    alternateContact: '',
    currentAddress: '',
    city: '',
    state: '',
    pincode: '',
    teachingArea: '',
    preferredRadius: '10 km',

    // Step 2: Qualification & Experience
    highestQualification: '',
    degreeName: '',
    collegeUniversity: '',
    passingYear: '',
    specialization: ['Subject Specialization'],
    additionalQualifications: '',
    experienceType: 'Experienced', // 'Fresher' | 'Experienced'
    totalExperience: '',
    previousInstitute: '',
    experienceDuration: '',
    classesTaught: [],
    subjectsTaught: [],

    // Step 3: Teaching Details & Approach
    classesYouTeach: ['Class 9–10', 'Class 11–12'],
    board: ['CBSE', 'ICSE'],
    subjectsYouTeach: ['Mathematics', 'Physics'],
    classType: ['One-to-One'], // 'One-to-One' | 'Group Class'
    teachingMethod: '',
    studentLevel: 'Intermediate', // 'Beginner' | 'Intermediate' | 'Advanced'
    teachingMode: 'Both', // 'Home Tuition' | 'Online Tuition' | 'Both'
    // Home Tuition Conditional
    preferredTeachingAreas: '',
    maxTravelDistance: '10 km',
    preferredLocation: '',
    // Online Tuition Conditional
    onlinePlatform: 'Zoom / Google Meet',
    laptopAvailable: 'Yes',
    stableInternet: 'Yes',
    digitalTabletAvailable: 'No',

    // Step 4: Availability & Fees
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    startTime: '09:00',
    endTime: '19:00',
    expectedFee: '',
    feeType: 'Per Hour', // 'Per Hour' | 'Per Class' | 'Monthly'
    negotiable: 'Yes',
    additionalFeeNotes: '',

    // Step 5: Optional Payment Details & Declaration
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    declarationAccepted: false,
  });

  // File Upload State
  const [files, setFiles] = useState({
    profilePhoto: null,
    qualificationDoc: null,
    experienceDoc: null,
    idProofDoc: null,
    resumeDoc: null,
    addressProofDoc: null,
  });

  // Custom subject input state for Step 3
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Map data from signup / user profile automatically on mount
  useEffect(() => {
    const prefillUserData = async () => {
      try {
        const res = await fetch('/api/tutor/profile');
        const data = await res.json();

        let rawName = '';
        let emailVal = '';
        let phoneVal = '';

        if (data.success && data.user) {
          if (data.user.name) rawName = data.user.name;
          if (data.user.email) emailVal = data.user.email;
          if (data.user.phone) phoneVal = data.user.phone;
        }

        if (!rawName && localStorage.getItem('userName')) rawName = localStorage.getItem('userName');
        if (!emailVal && localStorage.getItem('userEmail')) emailVal = localStorage.getItem('userEmail');
        if (!phoneVal && localStorage.getItem('userPhone')) phoneVal = localStorage.getItem('userPhone');

        let fName = '';
        let lName = '';
        if (rawName) {
          const parts = rawName.trim().split(' ');
          fName = parts[0] || '';
          lName = parts.slice(1).join(' ') || '';
        }

        setFormData((prev) => ({
          ...prev,
          firstName: prev.firstName || fName,
          lastName: prev.lastName || lName,
          fullName: prev.fullName || rawName,
          email: prev.email || emailVal,
          mobile: prev.mobile || phoneVal,
          whatsapp: prev.whatsapp || phoneVal,
        }));
      } catch (err) {
        console.error('Error prefilling tutor form from signup user data:', err);
      }
    };

    prefillUserData();
  }, []);

  // Handle Text/Select/Radio input change
  const handleChange = (e) => {
    const { name, type, checked } = e.target;
    let value = e.target.value;

    if (name === 'mobile' || name === 'whatsapp') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    } else if (name === 'totalExperience' || name === 'expectedFee') {
      value = value.replace(/\D/g, '');
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (invalidFieldName === name) {
      setInvalidFieldName('');
      setErrorMessage('');
    }
  };

  // Handle Array Multi-Select Toggle
  const handleArrayToggle = (field, value) => {
    setFormData((prev) => {
      const currentList = prev[field] || [];
      const exists = currentList.includes(value);
      const updated = exists ? currentList.filter((item) => item !== value) : [...currentList, value];
      return { ...prev, [field]: updated };
    });
  };

  // Handle Custom Subject Add/Remove in Step 3
  const handleAddSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (trimmed && !formData.subjectsYouTeach.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        subjectsYouTeach: [...prev.subjectsYouTeach, trimmed],
      }));
      setCustomSubjectInput('');
    }
  };

  const handleRemoveSubject = (subjectToRemove) => {
    setFormData((prev) => ({
      ...prev,
      subjectsYouTeach: prev.subjectsYouTeach.filter((s) => s !== subjectToRemove),
    }));
  };

  // Handle File Upload Change
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File size for ${fieldName} exceeds 10MB limit.`);
      return;
    }

    // Validate extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Invalid file format for ${fieldName}. Only JPG, JPEG, PNG, and PDF are allowed.`);
      return;
    }

    setFiles((prev) => ({ ...prev, [fieldName]: file }));
    if (errorMessage) setErrorMessage('');
  };

  const handleRemoveFile = (fieldName) => {
    setFiles((prev) => ({ ...prev, [fieldName]: null }));
  };

  const [invalidFieldName, setInvalidFieldName] = useState('');

  // Auto-scroll and focus to the first missing mandatory field
  const scrollToAndFocusField = (fieldName) => {
    setInvalidFieldName(fieldName);
    setTimeout(() => {
      let targetEl = document.querySelector(`[name="${fieldName}"]`);
      if (!targetEl) {
        targetEl = document.getElementById(fieldName);
      }
      if (!targetEl) {
        targetEl = document.querySelector(`.tr-field-group-${fieldName}`);
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (targetEl.focus && typeof targetEl.focus === 'function') {
          targetEl.focus({ preventScroll: true });
        }
      } else {
        window.scrollTo({ top: 160, behavior: 'smooth' });
      }
    }, 50);
  };

  const getFieldStyle = (fieldName) => {
    if (invalidFieldName === fieldName) {
      return {
        borderColor: '#ef4444',
        backgroundColor: '#fef2f2',
        boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.25)',
        transition: 'all 0.2s ease',
      };
    }
    return {};
  };

  const renderInlineError = (fieldName) => {
    if (invalidFieldName === fieldName) {
      return (
        <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{errorMessage || 'This field is required.'}</span>
        </div>
      );
    }
    return null;
  };

  // Detailed Step Validation Logic
  const validateStepDetails = (step) => {
    // Step 1: Personal & Location
    if (step === 1) {
      if (!formData.firstName.trim()) {
        return { valid: false, error: 'First Name is required.', fieldName: 'firstName' };
      }
      if (!formData.lastName.trim()) {
        return { valid: false, error: 'Last Name is required.', fieldName: 'lastName' };
      }
      if (!formData.gender) {
        return { valid: false, error: 'Gender selection is required.', fieldName: 'gender' };
      }
      if (!formData.mobile.trim()) {
        return { valid: false, error: 'Mobile Number is required.', fieldName: 'mobile' };
      }
      if (!/^\d{10}$/.test(formData.mobile.trim())) {
        return { valid: false, error: 'Mobile number must contain exactly 10 digits.', fieldName: 'mobile' };
      }
      if (formData.whatsapp && formData.whatsapp.trim() && !/^\d{10}$/.test(formData.whatsapp.trim())) {
        return { valid: false, error: 'WhatsApp number must contain exactly 10 digits.', fieldName: 'whatsapp' };
      }
      if (!formData.email.trim()) {
        return { valid: false, error: 'Email Address is required.', fieldName: 'email' };
      }
      if (!formData.currentAddress.trim()) {
        return { valid: false, error: 'Current Address is required.', fieldName: 'currentAddress' };
      }
      if (!formData.city.trim()) {
        return { valid: false, error: 'City is required.', fieldName: 'city' };
      }
      if (!formData.state.trim()) {
        return { valid: false, error: 'State is required.', fieldName: 'state' };
      }
      if (!formData.pincode.trim()) {
        return { valid: false, error: 'Pincode is required.', fieldName: 'pincode' };
      }
      if (!/^\d{6}$/.test(formData.pincode.trim())) {
        return { valid: false, error: 'Pincode must contain exactly 6 digits.', fieldName: 'pincode' };
      }
      if (!formData.teachingArea.trim()) {
        return { valid: false, error: 'Teaching Area / Locality is required.', fieldName: 'teachingArea' };
      }
    }

    // Step 2: Qualification & Experience
    if (step === 2) {
      if (!formData.highestQualification.trim()) {
        return { valid: false, error: 'Highest Qualification is required.', fieldName: 'highestQualification' };
      }
      if (!formData.totalExperience.trim()) {
        return { valid: false, error: 'Total Teaching Experience is required.', fieldName: 'totalExperience' };
      }
      if (isNaN(formData.totalExperience) || Number(formData.totalExperience) < 0) {
        return { valid: false, error: 'Please enter numbers only for teaching experience.', fieldName: 'totalExperience' };
      }
      if (formData.experienceType === 'Experienced' && !formData.previousInstitute.trim()) {
        return { valid: false, error: 'Previous School / Institute / Coaching Name is required for experienced tutors.', fieldName: 'previousInstitute' };
      }
    }

    // Step 3: Teaching Details & Approach
    if (step === 3) {
      if (!formData.classesYouTeach || formData.classesYouTeach.length === 0) {
        return { valid: false, error: 'Please select at least one Class that you teach.', fieldName: 'classesYouTeach' };
      }
      if (!formData.board || formData.board.length === 0) {
        return { valid: false, error: 'Please select at least one Educational Board (e.g. CBSE, ICSE).', fieldName: 'board' };
      }
      if (!formData.subjectsYouTeach || formData.subjectsYouTeach.length === 0) {
        return { valid: false, error: 'Please select or add at least one Subject.', fieldName: 'subjectsYouTeach' };
      }
      if (!formData.teachingMode) {
        return { valid: false, error: 'Please select a Teaching Mode.', fieldName: 'teachingMode' };
      }
    }

    // Step 4: Availability & Fees
    if (step === 4) {
      if (!formData.expectedFee.trim()) {
        return { valid: false, error: 'Expected Fee is required.', fieldName: 'expectedFee' };
      }
      if (isNaN(formData.expectedFee) || Number(formData.expectedFee) <= 0) {
        return { valid: false, error: 'Please enter a valid numeric tuition fee amount.', fieldName: 'expectedFee' };
      }
    }

    // Step 5: Documents & Declaration
    if (step === 5) {
      if (!files.qualificationDoc) {
        return { valid: false, error: 'Qualification Certificate document upload is required.', fieldName: 'qualificationDoc' };
      }
      if (!files.idProofDoc) {
        return { valid: false, error: 'ID Proof document upload is required.', fieldName: 'idProofDoc' };
      }
      if (!formData.declarationAccepted) {
        return { valid: false, error: 'You must accept the declaration to submit your application.', fieldName: 'declarationAccepted' };
      }
    }

    return { valid: true, error: null, fieldName: null };
  };

  // Step Navigation
  const handleNext = () => {
    const res = validateStepDetails(currentStep);
    if (!res.valid) {
      setErrorMessage(res.error);
      scrollToAndFocusField(res.fieldName);
      return;
    }
    setErrorMessage('');
    setInvalidFieldName('');
    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setErrorMessage('');
    setInvalidFieldName('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClick = (targetStep) => {
    if (targetStep <= currentStep) {
      setErrorMessage('');
      setInvalidFieldName('');
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    for (let s = 1; s < targetStep; s++) {
      const res = validateStepDetails(s);
      if (!res.valid) {
        setCurrentStep(s);
        setErrorMessage(res.error);
        scrollToAndFocusField(res.fieldName);
        return;
      }
    }

    setErrorMessage('');
    setInvalidFieldName('');
    setCurrentStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetAndNewApplication = () => {
    setFormData({
      firstName: '',
      lastName: '',
      fullName: '',
      gender: '',
      dob: '',
      mobile: '',
      whatsapp: '',
      email: '',
      alternateContact: '',
      currentAddress: '',
      city: '',
      state: '',
      pincode: '',
      teachingArea: '',
      preferredRadius: '10 km',

      highestQualification: '',
      degreeName: '',
      collegeUniversity: '',
      passingYear: '',
      specialization: '',
      additionalQualifications: '',
      experienceType: 'Experienced',
      totalExperience: '',
      previousInstitute: '',
      experienceDuration: '',
      classesTaught: [],
      subjectsTaught: [],

      classesYouTeach: ['Class 9–10', 'Class 11–12'],
      board: ['CBSE', 'ICSE'],
      subjectsYouTeach: ['Mathematics', 'Physics'],
      teachingMode: 'Both',
      preferredTeachingAreas: '',
      maxTravelDistance: '10 km',
      preferredLocation: '',
      onlinePlatform: 'Zoom / Google Meet',
      laptopAvailable: 'Yes',
      stableInternet: 'Yes',
      digitalTabletAvailable: 'No',

      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '09:00',
      endTime: '19:00',
      expectedFee: '',
      feeType: 'Per Hour',
      negotiable: 'Yes',
      additionalFeeNotes: '',

      declarationAccepted: false,
    });
    setFiles({
      profilePhoto: null,
      qualificationDoc: null,
      experienceDoc: null,
      idProofDoc: null,
    });
    setCustomSubjectInput('');
    setErrorMessage('');
    setInvalidFieldName('');
    setCurrentStep(1);
    setSubmitSuccess(false);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all 5 steps sequentially before submission
    for (let s = 1; s <= 5; s++) {
      const res = validateStepDetails(s);
      if (!res.valid) {
        setCurrentStep(s);
        setErrorMessage(res.error);
        scrollToAndFocusField(res.fieldName);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setInvalidFieldName('');

    try {
      const computedName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
      const updatedFormData = {
        ...formData,
        fullName: computedName || formData.fullName,
      };

      const dataPayload = new FormData();
      Object.keys(updatedFormData).forEach((key) => {
        if (Array.isArray(updatedFormData[key])) {
          dataPayload.append(key, JSON.stringify(updatedFormData[key]));
        } else {
          dataPayload.append(key, updatedFormData[key]);
        }
      });

      if (files.profilePhoto) dataPayload.append('profilePhoto', files.profilePhoto);
      if (files.qualificationDoc) dataPayload.append('qualificationDoc', files.qualificationDoc);
      if (files.experienceDoc) dataPayload.append('experienceDoc', files.experienceDoc);
      if (files.idProofDoc) dataPayload.append('idProofDoc', files.idProofDoc);
      if (files.resumeDoc) dataPayload.append('resumeDoc', files.resumeDoc);
      if (files.addressProofDoc) dataPayload.append('addressProofDoc', files.addressProofDoc);

      const response = await fetch('/api/tutor/profile', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: dataPayload,
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        if (onSuccess) onSuccess(resData);
      } else {
        setIsSubmitting(false);
        setErrorMessage(resData.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Tutor Registration Submission Error:', err);
      setIsSubmitting(false);
      setErrorMessage('Network error while submitting application. Please try again.');
    }
  };

  const availableSubjectOptions = [
    'Mathematics',
    'Science',
    'English',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Social Science',
    'Hindi',
    'Accountancy',
    'Economics',
    'Business Studies',
  ];

  return (
    <div className="tr-multi-step-form-container">
      {/* 5-STEP PROGRESS INDICATOR */}
      <div className="tr-progress-header">
        {[
          { step: 1, title: 'Personal & Location', icon: 'fa-user' },
          { step: 2, title: 'Qualification & Exp.', icon: 'fa-graduation-cap' },
          { step: 3, title: 'Teaching Details', icon: 'fa-chalkboard-user' },
          { step: 4, title: 'Availability & Fees', icon: 'fa-clock' },
          { step: 5, title: 'Documents & Submit', icon: 'fa-file-shield' },
        ].map((st) => {
          const isCompleted = currentStep > st.step;
          const isCurrent = currentStep === st.step;
          return (
            <div
              key={st.step}
              className={`tr-progress-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => {
                if (st.step < currentStep) setCurrentStep(st.step);
              }}
            >
              <div className="tr-step-badge">
                {isCompleted ? <i className="fa-solid fa-check"></i> : st.step}
              </div>
              <div className="tr-step-info">
                <span className="tr-step-subtitle">STEP {st.step}</span>
                <span className="tr-step-title">{st.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ERROR ALERT DISPLAY */}
      {errorMessage && (
        <div className="tr-alert error-banner">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SUCCESS CARD */}
      {submitSuccess ? (
        <div className="tr-success-card">
          <div className="tr-success-icon-circle">
            <FiCheckCircle size={40} />
          </div>
          <h2>Registration Submitted</h2>
          <p>
            Your tutor application has been submitted successfully.
          </p>
          <div className="tr-success-summary-box">
            <p><strong>Status:</strong> <span style={{ color: '#b45309', fontWeight: 700 }}>Pending Review</span></p>
            <p><strong>Applicant Name:</strong> {formData.firstName} {formData.lastName}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Mobile:</strong> {formData.mobile}</p>
            <p><strong>Teaching Mode:</strong> {formData.teachingMode}</p>
          </div>
          <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px' }}>
            Our admin team will review your application and documents.
          </p>
          <button
            type="button"
            className="tr-btn tr-btn-primary"
            onClick={handleResetAndNewApplication}
          >
            Submit Another Application
          </button>
        </div>
      ) : (
        <form className="tr-step-form-body" onSubmit={handleSubmit}>
          {/* ========================================================================= */}
          {/* STEP 1: PERSONAL & LOCATION */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="tr-form-step-pane">
              <div className="tr-step-heading">
                <h3>Personal & Location Details</h3>
                <p>Provide your official contact details and current residential address.</p>
              </div>

              {/* Personal Details Subsection */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Personal Details</h4>
                <div className="tr-grid-2col">
                  <div className="tr-field-group">
                    <label className="tr-field-label">First Name <span className="req">*</span></label>
                    <input
                      type="text"
                      name="firstName"
                      className="tr-input"
                      placeholder="e.g. Ramesh"
                      value={formData.firstName}
                      onChange={handleChange}
                      style={getFieldStyle('firstName')}
                      required
                    />
                    {renderInlineError('firstName')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Last Name <span className="req">*</span></label>
                    <input
                      type="text"
                      name="lastName"
                      className="tr-input"
                      placeholder="e.g. Kumar"
                      value={formData.lastName}
                      onChange={handleChange}
                      style={getFieldStyle('lastName')}
                      required
                    />
                    {renderInlineError('lastName')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Gender <span className="req">*</span></label>
                    <select
                      name="gender"
                      className="tr-select"
                      value={formData.gender}
                      onChange={handleChange}
                      style={getFieldStyle('gender')}
                      required
                    >
                      <option value="">Select Gender *</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {renderInlineError('gender')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      className="tr-input"
                      value={formData.dob}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Mobile Number <span className="req">*</span></label>
                    <input
                      type="tel"
                      name="mobile"
                      className="tr-input"
                      placeholder="10-digit Mobile Number *"
                      value={formData.mobile}
                      onChange={handleChange}
                      style={getFieldStyle('mobile')}
                      required
                    />
                    {renderInlineError('mobile')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">WhatsApp Number</label>
                    <input
                      type="tel"
                      name="whatsapp"
                      className="tr-input"
                      placeholder="WhatsApp Number (if different)"
                      value={formData.whatsapp}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Email Address (From Sign Up Account) <span className="req">*</span></label>
                    <input
                      type="email"
                      name="email"
                      className="tr-input"
                      placeholder="your.email@example.com *"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly
                      style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#475569', fontWeight: '600', ...getFieldStyle('email') }}
                      required
                    />
                    {renderInlineError('email')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Alternate Contact Number</label>
                    <input
                      type="tel"
                      name="alternateContact"
                      className="tr-input"
                      placeholder="Alternate phone / emergency contact"
                      value={formData.alternateContact}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Address Details Subsection */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Address Details</h4>
                <div className="tr-grid-2col">
                  <div className="tr-field-group full-width">
                    <label className="tr-field-label">Current Address <span className="req">*</span></label>
                    <textarea
                      name="currentAddress"
                      className="tr-textarea"
                      rows="2"
                      placeholder="House/Flat No., Street, Landmark *"
                      value={formData.currentAddress}
                      onChange={handleChange}
                      style={getFieldStyle('currentAddress')}
                      required
                    ></textarea>
                    {renderInlineError('currentAddress')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">City <span className="req">*</span></label>
                    <input
                      type="text"
                      name="city"
                      className="tr-input"
                      placeholder="e.g. New Delhi *"
                      value={formData.city}
                      onChange={handleChange}
                      style={getFieldStyle('city')}
                      required
                    />
                    {renderInlineError('city')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">State <span className="req">*</span></label>
                    <input
                      type="text"
                      name="state"
                      className="tr-input"
                      placeholder="e.g. Delhi *"
                      value={formData.state}
                      onChange={handleChange}
                      style={getFieldStyle('state')}
                      required
                    />
                    {renderInlineError('state')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Pincode <span className="req">*</span></label>
                    <input
                      type="text"
                      name="pincode"
                      className="tr-input"
                      placeholder="6-digit Pincode *"
                      value={formData.pincode}
                      onChange={handleChange}
                      style={getFieldStyle('pincode')}
                      required
                    />
                    {renderInlineError('pincode')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Teaching Area / Locality <span className="req">*</span></label>
                    <input
                      type="text"
                      name="teachingArea"
                      className="tr-input"
                      placeholder="e.g. South Extension, Saket *"
                      value={formData.teachingArea}
                      onChange={handleChange}
                      style={getFieldStyle('teachingArea')}
                      required
                    />
                    {renderInlineError('teachingArea')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Preferred Radius for Home Tuition</label>
                    <select
                      name="preferredRadius"
                      className="tr-select"
                      value={formData.preferredRadius}
                      onChange={handleChange}
                    >
                      <option value="5 km">Within 5 km</option>
                      <option value="10 km">Within 10 km</option>
                      <option value="15 km">Within 15 km</option>
                      <option value="25 km+">25 km+</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: QUALIFICATION & EXPERIENCE */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="tr-form-step-pane">
              <div className="tr-step-heading">
                <h3>Qualification & Teaching Experience</h3>
                <p>Provide details of your educational degree and past teaching experience.</p>
              </div>

              {/* Educational Qualification */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Educational Qualification</h4>
                <div className="tr-grid-2col">
                  <div className="tr-field-group">
                    <label className="tr-field-label">Highest Qualification <span className="req">*</span></label>
                    <input
                      type="text"
                      name="highestQualification"
                      className="tr-input"
                      placeholder="e.g. M.Sc. Mathematics / B.Tech / M.A."
                      value={formData.highestQualification}
                      onChange={handleChange}
                      style={getFieldStyle('highestQualification')}
                      required
                    />
                    {renderInlineError('highestQualification')}
                    <small className="tr-field-hint">Example: B.Sc. Mathematics | HNB Garhwal University | 2023</small>
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Degree / Course Name</label>
                    <input
                      type="text"
                      name="degreeName"
                      className="tr-input"
                      placeholder="e.g. Bachelor of Science in Mathematics"
                      value={formData.degreeName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">College / University</label>
                    <input
                      type="text"
                      name="collegeUniversity"
                      className="tr-input"
                      placeholder="e.g. Delhi University"
                      value={formData.collegeUniversity}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Passing Year</label>
                    <input
                      type="text"
                      name="passingYear"
                      className="tr-input"
                      placeholder="e.g. 2022"
                      value={formData.passingYear}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Specialization / Stream</label>
                    <input
                      type="text"
                      name="specialization"
                      className="tr-input"
                      placeholder="e.g. Pure Mathematics & Statistics"
                      value={formData.specialization}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Additional Qualifications</label>
                    <input
                      type="text"
                      name="additionalQualifications"
                      className="tr-input"
                      placeholder="e.g. B.Ed, CTET Qualified"
                      value={formData.additionalQualifications}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Teaching Experience */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Teaching Experience</h4>

                <div className="tr-grid-2col" style={{ marginBottom: '16px' }}>
                  <div className="tr-field-group">
                    <label className="tr-field-label">Experience Status <span className="req">*</span></label>
                    <div className="tr-radio-toggle-group">
                      <label className={`tr-radio-card ${formData.experienceType === 'Fresher' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="experienceType"
                          value="Fresher"
                          checked={formData.experienceType === 'Fresher'}
                          onChange={handleChange}
                        />
                        <span><i className="fa-solid fa-seedling"></i> Fresher</span>
                      </label>
                      <label className={`tr-radio-card ${formData.experienceType === 'Experienced' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="experienceType"
                          value="Experienced"
                          checked={formData.experienceType === 'Experienced'}
                          onChange={handleChange}
                        />
                        <span><i className="fa-solid fa-award"></i> Experienced</span>
                      </label>
                    </div>
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Total Teaching Experience <span className="req">*</span></label>
                    <input
                      type="text"
                      name="totalExperience"
                      className="tr-input"
                      placeholder="e.g. 4 Years / Fresher"
                      value={formData.totalExperience}
                      onChange={handleChange}
                      style={getFieldStyle('totalExperience')}
                      required
                    />
                    {renderInlineError('totalExperience')}
                  </div>
                </div>

                {/* Conditional Fields for Experienced Tutors */}
                {formData.experienceType === 'Experienced' && (
                  <div className="tr-grid-2col tr-conditional-block">
                    <div className="tr-field-group">
                      <label className="tr-field-label">Previous School / Institute / Coaching Name <span className="req">*</span></label>
                      <input
                        type="text"
                        name="previousInstitute"
                        className="tr-input"
                        placeholder="e.g. Allen Career Institute / DPS School"
                        value={formData.previousInstitute}
                        onChange={handleChange}
                        style={getFieldStyle('previousInstitute')}
                        required
                      />
                      {renderInlineError('previousInstitute')}
                    </div>

                    <div className="tr-field-group">
                      <label className="tr-field-label">Experience Duration</label>
                      <input
                        type="text"
                        name="experienceDuration"
                        className="tr-input"
                        placeholder="e.g. 2020 to Present"
                        value={formData.experienceDuration}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: TEACHING DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="tr-form-step-pane">
              <div className="tr-step-heading">
                <h3>Teaching Details & Preferences</h3>
                <p>Select the classes, academic boards, subjects, and teaching modes you offer.</p>
              </div>

              {/* Classes You Teach */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Classes You Teach <span className="req">*</span></h4>
                <div className="tr-pill-grid">
                  {['Class 1–5', 'Class 6–8', 'Class 9–10', 'Class 11–12'].map((cls) => {
                    const selected = formData.classesYouTeach.includes(cls);
                    return (
                      <button
                        type="button"
                        key={cls}
                        className={`tr-pill-btn ${selected ? 'active' : ''}`}
                        onClick={() => handleArrayToggle('classesYouTeach', cls)}
                      >
                        <i className={`fa-solid ${selected ? 'fa-square-check' : 'fa-square'}`}></i> {cls}
                      </button>
                    );
                  })}
                </div>
                {renderInlineError('classesYouTeach')}
              </div>

              {/* Academic Board */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Academic Board <span className="req">*</span></h4>
                <div className="tr-pill-grid">
                  {['CBSE', 'ICSE', 'State Board', 'IB', 'Other'].map((b) => {
                    const selected = formData.board.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        className={`tr-pill-btn ${selected ? 'active' : ''}`}
                        onClick={() => handleArrayToggle('board', b)}
                      >
                        <i className={`fa-solid ${selected ? 'fa-circle-check' : 'fa-circle'}`}></i> {b} Board
                      </button>
                    );
                  })}
                </div>
                {renderInlineError('board')}
              </div>

              {/* Subjects You Teach */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Subjects You Teach <span className="req">*</span></h4>
                
                <div className="tr-chips-wrapper" style={{ marginBottom: '14px' }}>
                  {formData.subjectsYouTeach.map((sub) => (
                    <span key={sub} className="tr-subject-chip">
                      #{sub}
                      <i className="fa-solid fa-xmark" onClick={() => handleRemoveSubject(sub)}></i>
                    </span>
                  ))}
                </div>
                {renderInlineError('subjectsYouTeach')}

                <div className="tr-preset-subjects">
                  <label className="tr-field-hint" style={{ display: 'block', marginBottom: '8px' }}>Select from popular subjects or add custom below:</label>
                  <div className="tr-pill-grid">
                    {availableSubjectOptions.map((sub) => {
                      const selected = formData.subjectsYouTeach.includes(sub);
                      return (
                        <button
                          type="button"
                          key={sub}
                          className={`tr-pill-btn sm ${selected ? 'active' : ''}`}
                          onClick={() => handleArrayToggle('subjectsYouTeach', sub)}
                        >
                          {selected ? <FiCheck size={14} style={{ marginRight: '4px' }} /> : <FiPlus size={14} style={{ marginRight: '4px' }} />}{sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="tr-add-custom-subject-row" style={{ marginTop: '14px' }}>
                  <input
                    type="text"
                    className="tr-input"
                    placeholder="Add another subject (e.g. Sanskrit, French, Coding)"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubject();
                      }
                    }}
                  />
                  <button type="button" className="tr-btn tr-btn-outline" onClick={handleAddSubject}>
                    + Add Subject
                  </button>
                </div>
              </div>

              {/* Class Type */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Class Type <span className="req">*</span></h4>
                <div className="tr-pill-grid">
                  {['One-to-One', 'Group Class'].map((ct) => {
                    const selected = (formData.classType || []).includes(ct);
                    return (
                      <button
                        type="button"
                        key={ct}
                        className={`tr-pill-btn ${selected ? 'active' : ''}`}
                        onClick={() => handleArrayToggle('classType', ct)}
                      >
                        <i className={`fa-solid ${selected ? 'fa-check-circle' : 'fa-circle'}`}></i> {ct}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specialization */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Specialization <span className="req">*</span></h4>
                <div className="tr-pill-grid">
                  {['Subject Specialization', 'Competitive Exam Preparation', 'Other Teaching Expertise'].map((spec) => {
                    const selected = (formData.specialization || []).includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        className={`tr-pill-btn ${selected ? 'active' : ''}`}
                        onClick={() => handleArrayToggle('specialization', spec)}
                      >
                        <i className={`fa-solid ${selected ? 'fa-check-circle' : 'fa-circle'}`}></i> {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Teaching Approach */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Teaching Approach</h4>
                <div className="tr-field-group full-width">
                  <label className="tr-field-label">Teaching Method / Short Introduction</label>
                  <textarea
                    name="teachingMethod"
                    className="tr-textarea"
                    rows="3"
                    placeholder="Briefly describe your teaching style, interactive methods, exam strategies, or a short introduction for students..."
                    value={formData.teachingMethod}
                    onChange={handleChange}
                  ></textarea>
                </div>
                <div className="tr-field-group" style={{ marginTop: '14px' }}>
                  <label className="tr-field-label">Student Level Catered To</label>
                  <div className="tr-pill-grid">
                    {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => {
                      const isSelected = formData.studentLevel === lvl;
                      return (
                        <button
                          type="button"
                          key={lvl}
                          className={`tr-pill-btn sm ${isSelected ? 'active' : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, studentLevel: lvl }))}
                        >
                          {isSelected ? <FiCheck size={14} style={{ marginRight: '4px' }} /> : null}{lvl} Level
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Teaching Mode */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Teaching Mode <span className="req">*</span></h4>
                <div className="tr-mode-cards-grid">
                  {[
                    { mode: 'Home Tuition', icon: 'fa-house-user', label: 'Home Tuition', desc: 'Travel to student residence for in-person classes.' },
                    { mode: 'Online Tuition', icon: 'fa-display', label: 'Online Tuition', desc: 'Conduct classes remotely via video calling software.' },
                    { mode: 'Both', icon: 'fa-arrows-split-up-and-left', label: 'Both Home & Online', desc: 'Flexible to offer both home tuition and online classes.' },
                  ].map((m) => {
                    const selected = formData.teachingMode === m.mode;
                    return (
                      <div
                        key={m.mode}
                        className={`tr-mode-card ${selected ? 'active' : ''}`}
                        onClick={() => setFormData((prev) => ({ ...prev, teachingMode: m.mode }))}
                      >
                        <i className={`fa-solid ${m.icon} tr-mode-icon`}></i>
                        <h4>{m.label}</h4>
                        <p>{m.desc}</p>
                        <div className="tr-mode-check">
                          <i className={`fa-solid ${selected ? 'fa-circle-check' : 'fa-circle-notch'}`}></i>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conditional Home Tuition Fields */}
                {(formData.teachingMode === 'Home Tuition' || formData.teachingMode === 'Both') && (
                  <div className="tr-conditional-section">
                    <h5 className="tr-subheading">Home Tuition Preferences</h5>
                    <div className="tr-grid-2col">
                      <div className="tr-field-group">
                        <label className="tr-field-label">Preferred Teaching Areas</label>
                        <input
                          type="text"
                          name="preferredTeachingAreas"
                          className="tr-input"
                          placeholder="e.g. Saket, Malviya Nagar, Hauz Khas"
                          value={formData.preferredTeachingAreas}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="tr-field-group">
                        <label className="tr-field-label">Maximum Travel Distance</label>
                        <select name="maxTravelDistance" className="tr-select" value={formData.maxTravelDistance} onChange={handleChange}>
                          <option value="5 km">Within 5 km</option>
                          <option value="10 km">Within 10 km</option>
                          <option value="15 km">Within 15 km</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Online Tuition Fields */}
                {(formData.teachingMode === 'Online Tuition' || formData.teachingMode === 'Both') && (
                  <div className="tr-conditional-section">
                    <h5 className="tr-subheading">Online Tuition Setup</h5>
                    <div className="tr-grid-2col">
                      <div className="tr-field-group">
                        <label className="tr-field-label">Preferred Online Platform</label>
                        <input
                          type="text"
                          name="onlinePlatform"
                          className="tr-input"
                          placeholder="e.g. Zoom, Google Meet, MS Teams"
                          value={formData.onlinePlatform}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="tr-field-group">
                        <label className="tr-field-label">Laptop / Desktop Available?</label>
                        <select name="laptopAvailable" className="tr-select" value={formData.laptopAvailable} onChange={handleChange}>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="tr-field-group">
                        <label className="tr-field-label">Stable High-Speed Internet?</label>
                        <select name="stableInternet" className="tr-select" value={formData.stableInternet} onChange={handleChange}>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="tr-field-group">
                        <label className="tr-field-label">Digital Writing Tablet / Pen Available?</label>
                        <select name="digitalTabletAvailable" className="tr-select" value={formData.digitalTabletAvailable} onChange={handleChange}>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: AVAILABILITY & FEES */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="tr-form-step-pane">
              <div className="tr-step-heading">
                <h3>Availability & Hourly / Monthly Pricing</h3>
                <p>Specify your preferred teaching days, working hours, and fee expectations.</p>
              </div>

              {/* Availability Section */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Days Available</h4>
                <div className="tr-pill-grid">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const selected = formData.availableDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        className={`tr-pill-btn ${selected ? 'active' : ''}`}
                        onClick={() => handleArrayToggle('availableDays', day)}
                      >
                        <i className={`fa-solid ${selected ? 'fa-circle-check' : 'fa-circle'}`}></i> {day}
                      </button>
                    );
                  })}
                </div>

                <div className="tr-grid-2col" style={{ marginTop: '16px' }}>
                  <div className="tr-field-group">
                    <label className="tr-field-label">Preferred Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      className="tr-input"
                      value={formData.startTime}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Preferred End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      className="tr-input"
                      value={formData.endTime}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Fees Section */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Pricing & Fee Structure</h4>
                
                <div className="tr-grid-2col">
                  <div className="tr-field-group">
                    <label className="tr-field-label">Expected Fee (₹) <span className="req">*</span></label>
                    <input
                      type="number"
                      name="expectedFee"
                      className="tr-input"
                      placeholder="e.g. 500 *"
                      value={formData.expectedFee}
                      onChange={handleChange}
                      style={getFieldStyle('expectedFee')}
                      required
                    />
                    {renderInlineError('expectedFee')}
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Fee Type <span className="req">*</span></label>
                    <select name="feeType" className="tr-select" value={formData.feeType} onChange={handleChange} required>
                      <option value="Per Hour">Per Hour (₹/hr)</option>
                      <option value="Per Class">Per Class</option>
                      <option value="Monthly">Monthly Package</option>
                    </select>
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Are fees negotiable?</label>
                    <select name="negotiable" className="tr-select" value={formData.negotiable} onChange={handleChange}>
                      <option value="Yes">Yes, Negotiable</option>
                      <option value="No">No, Fixed Rate</option>
                    </select>
                  </div>
                </div>

                <div className="tr-field-group full-width" style={{ marginTop: '14px' }}>
                  <label className="tr-field-label">Additional Fee Notes / Package Discounts</label>
                  <textarea
                    name="additionalFeeNotes"
                    className="tr-textarea"
                    rows="3"
                    placeholder="e.g. Discount available for 3+ classes per week or group sessions..."
                    value={formData.additionalFeeNotes}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: DOCUMENTS & SUBMIT */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="tr-form-step-pane">
              <div className="tr-step-heading">
                <h3>Document Upload & Final Review</h3>
                <p>Upload required verification documents and accept the declaration to submit.</p>
              </div>

              {/* Uploads Grid */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">Verification Documents</h4>
                
                <div className="tr-doc-uploads-grid">
                  {/* Profile Photo */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Profile Photo <span className="req">*</span></h5>
                      <small>Professional headshot photo (JPG/PNG max 5MB)</small>
                    </div>
                    {files.profilePhoto ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-image"></i>
                        <span className="file-name">{files.profilePhoto.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('profilePhoto')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload Profile Photo</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'profilePhoto')}
                        />
                      </label>
                    )}
                  </div>

                  {/* Qualification Document */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Qualification Certificate <span className="req">*</span></h5>
                      <small>Degree / Marksheet (PDF/JPG/PNG max 10MB)</small>
                    </div>
                    {files.qualificationDoc ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-file-pdf"></i>
                        <span className="file-name">{files.qualificationDoc.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('qualificationDoc')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload Degree Certificate</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'qualificationDoc')}
                        />
                      </label>
                    )}
                    {renderInlineError('qualificationDoc')}
                  </div>

                  {/* ID Proof Document */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Government ID Proof <span className="req">*</span></h5>
                      <small>Aadhaar / Passport / Driving License / PAN</small>
                    </div>
                    {files.idProofDoc ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-file-image"></i>
                        <span className="file-name">{files.idProofDoc.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('idProofDoc')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload ID Proof Document</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'idProofDoc')}
                        />
                      </label>
                    )}
                    {renderInlineError('idProofDoc')}
                  </div>

                  {/* Experience Certificate (Optional) */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Experience Certificate</h5>
                      <small>Relieving letter / Experience proof (Optional)</small>
                    </div>
                    {files.experienceDoc ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-file-lines"></i>
                        <span className="file-name">{files.experienceDoc.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('experienceDoc')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload Experience Document</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'experienceDoc')}
                        />
                      </label>
                    )}
                  </div>

                  {/* Resume / CV (Optional) */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Resume / CV</h5>
                      <small>Updated Curriculum Vitae (Optional)</small>
                    </div>
                    {files.resumeDoc ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-file-pdf"></i>
                        <span className="file-name">{files.resumeDoc.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('resumeDoc')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload Resume / CV</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => handleFileChange(e, 'resumeDoc')}
                        />
                      </label>
                    )}
                  </div>

                  {/* Address Proof (Optional) */}
                  <div className="tr-doc-upload-box">
                    <div className="tr-doc-header">
                      <h5>Address Proof</h5>
                      <small>Electricity bill / Rent agreement (Optional)</small>
                    </div>
                    {files.addressProofDoc ? (
                      <div className="tr-file-preview-strip">
                        <i className="fa-solid fa-file-image"></i>
                        <span className="file-name">{files.addressProofDoc.name}</span>
                        <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile('addressProofDoc')}>&times;</button>
                      </div>
                    ) : (
                      <label className="tr-file-dropzone">
                        <i className="fa-solid fa-cloud-arrow-up"></i>
                        <span>Upload Address Proof</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange(e, 'addressProofDoc')}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Payment Details Subsection (Optional) */}
              <div className="tr-form-card">
                <h4 className="tr-card-title">
                  Payment Details <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b' }}>(Optional)</span>
                </h4>
                <p className="tr-field-hint" style={{ marginBottom: '14px' }}>Add your bank account or UPI details for direct payout transfers upon session completions.</p>
                
                <div className="tr-grid-2col">
                  <div className="tr-field-group">
                    <label className="tr-field-label">Account Holder Name</label>
                    <input
                      type="text"
                      name="accountHolderName"
                      className="tr-input"
                      placeholder="Name as per Bank Account"
                      value={formData.accountHolderName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      className="tr-input"
                      placeholder="e.g. State Bank of India / HDFC"
                      value={formData.bankName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      className="tr-input"
                      placeholder="Bank Account Number"
                      value={formData.accountNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group">
                    <label className="tr-field-label">IFSC Code</label>
                    <input
                      type="text"
                      name="ifscCode"
                      className="tr-input"
                      placeholder="e.g. SBIN0001234"
                      value={formData.ifscCode}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="tr-field-group full-width">
                    <label className="tr-field-label">UPI ID</label>
                    <input
                      type="text"
                      name="upiId"
                      className="tr-input"
                      placeholder="e.g. yourname@upi / 9876543210@paytm"
                      value={formData.upiId}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Declaration Checkbox */}
              <div className="tr-form-card">
                <label className="tr-declaration-checkbox-label">
                  <input
                    type="checkbox"
                    name="declarationAccepted"
                    checked={formData.declarationAccepted}
                    onChange={handleChange}
                    required
                  />
                  <span>
                    I confirm that the information provided by me is accurate and complete. I agree to abide by Smart HomeTutor terms of service and tutor conduct guidelines. <span className="req">*</span>
                  </span>
                </label>
                {renderInlineError('declarationAccepted')}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* NAVIGATION BUTTONS BAR */}
          {/* ========================================================================= */}
          <div className="tr-step-actions-bar">
            {currentStep > 1 && (
              <button type="button" className="tr-btn tr-btn-outline" onClick={handlePrev} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FiArrowLeft /> Previous
              </button>
            )}

            {currentStep < 5 ? (
              <button type="button" className="tr-btn tr-btn-primary" onClick={handleNext} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Next Step <FiArrowRight />
              </button>
            ) : (
              <button
                type="submit"
                className="tr-btn tr-btn-primary"
                disabled={isSubmitting || !formData.declarationAccepted}
                style={{ marginLeft: 'auto' }}
              >
                {isSubmitting ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> Submitting...</span>
                ) : (
                  'Submit Registration'
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
