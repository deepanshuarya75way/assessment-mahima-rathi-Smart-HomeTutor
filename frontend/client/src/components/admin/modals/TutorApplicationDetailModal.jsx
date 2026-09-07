import React, { useState } from 'react';

export const TutorApplicationDetailModal = ({ application, onClose, onApprove, onReject }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!application) return null;

  const status = application.registrationStatus || application.verificationStatus || 'Pending';

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Approved':
        return <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' }}><i className="fa-solid fa-check-circle"></i> Approved</span>;
      case 'Rejected':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' }}><i className="fa-solid fa-times-circle"></i> Rejected</span>;
      default:
        return <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '12px' }}><i className="fa-solid fa-clock"></i> Pending Review</span>;
    }
  };

  const handleAction = async (actionStatus) => {
    setIsProcessing(true);
    try {
      if (actionStatus === 'Approved' && onApprove) {
        await onApprove(application._id);
      } else if (actionStatus === 'Rejected' && onReject) {
        await onReject(application._id);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatArray = (arr) => {
    if (!arr) return 'N/A';
    if (Array.isArray(arr)) return arr.filter(Boolean).join(', ') || 'N/A';
    return String(arr) || 'N/A';
  };

  const name = application.fullName || application.user?.name || 'Tutor Applicant';
  const email = application.email || application.user?.email || 'N/A';
  const phone = application.mobile || application.phone || application.user?.phone || 'N/A';
  const userId = application.user?._id || application.user || 'N/A';

  // Extract docs map or array
  const docs = Array.isArray(application.documents) ? application.documents : [];
  const getDocUrl = (docType) => {
    const found = docs.find((d) => d.docType === docType || d.name === docType);
    if (found && found.fileUrl) return found.fileUrl;
    if (docType === 'Profile Photo' && application.profileImage) return application.profileImage;
    if (docType === 'Qualification Certificate' && application.qualificationDocUrl) return application.qualificationDocUrl;
    if (docType === 'ID Proof' && application.idProofDocUrl) return application.idProofDocUrl;
    if (docType === 'Experience Certificate' && application.experienceDocUrl) return application.experienceDocUrl;
    if (docType === 'Resume / CV' && application.resumeDocUrl) return application.resumeDocUrl;
    if (docType === 'Address Proof' && application.addressProofDocUrl) return application.addressProofDocUrl;
    return null;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
        onClick={(e) => e.stopPropagation()}
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
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {application.profileImage ? (
              <img
                src={application.profileImage}
                alt={name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
              />
            ) : (
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{name}</h3>
                {getStatusBadge(status)}
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Application ID: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{application._id}</code> &bull; User ID: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{userId}</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* MODAL BODY - CATEGORIZED PROFILE DETAILS */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: PERSONAL & LOCATION */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-user"></i> 1. Personal & Contact Information (Sign Up & Application)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
              <div><strong style={{ color: '#475569' }}>First Name:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.firstName || name.split(' ')[0]}</div></div>
              <div><strong style={{ color: '#475569' }}>Last Name:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.lastName || name.split(' ').slice(1).join(' ')}</div></div>
              <div><strong style={{ color: '#475569' }}>Full Name:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{name}</div></div>
              <div><strong style={{ color: '#475569' }}>Email Address (Sign Up Account):</strong> <div style={{ color: '#0284c7', fontWeight: '700' }}>{email}</div></div>
              <div><strong style={{ color: '#475569' }}>Phone / Mobile (Sign Up Account):</strong> <div style={{ color: '#0f172a', fontWeight: '700' }}>{phone}</div></div>
              <div><strong style={{ color: '#475569' }}>WhatsApp:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.whatsapp || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Gender:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.gender || 'Not Specified'}</div></div>
              <div><strong style={{ color: '#475569' }}>Date of Birth:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.dob || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Alternate Contact:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.alternateContact || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Current Address:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.currentAddress || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>City & State:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.city || 'N/A'}, {application.state || 'N/A'} - {application.pincode || ''}</div></div>
              <div><strong style={{ color: '#475569' }}>Teaching Area:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.teachingArea || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Preferred Travel Radius:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.preferredRadius || '10 km'}</div></div>
            </div>
          </div>

          {/* SECTION 2: QUALIFICATION & EXPERIENCE */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-graduation-cap"></i> 2. Qualification & Teaching Experience
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
              <div><strong style={{ color: '#475569' }}>Highest Qualification:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.highestQualification || application.qualification || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Degree Name:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.degreeName || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>College / University:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.collegeUniversity || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Passing Year:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.passingYear || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Specialization:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatArray(application.specialization)}</div></div>
              <div><strong style={{ color: '#475569' }}>Additional Qualifications:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.additionalQualifications || 'None'}</div></div>
              <div><strong style={{ color: '#475569' }}>Experience Type:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.experienceType || 'Experienced'}</div></div>
              <div><strong style={{ color: '#475569' }}>Total Experience:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.totalExperience || application.experience || '0'} Years</div></div>
              <div><strong style={{ color: '#475569' }}>Previous Institute:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.previousInstitute || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Experience Duration:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.experienceDuration || 'N/A'}</div></div>
            </div>
          </div>

          {/* SECTION 3: TEACHING DETAILS & APPROACH */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-chalkboard-user"></i> 3. Teaching Details & Methodology
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
              <div><strong style={{ color: '#475569' }}>Subjects Taught:</strong> <div style={{ fontWeight: '700', color: '#0284c7' }}>{formatArray(application.subjects)}</div></div>
              <div><strong style={{ color: '#475569' }}>Classes / Grades Taught:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatArray(application.classes)}</div></div>
              <div><strong style={{ color: '#475569' }}>Educational Board:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatArray(application.board)}</div></div>
              <div><strong style={{ color: '#475569' }}>Class Type:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatArray(application.classType)}</div></div>
              <div><strong style={{ color: '#475569' }}>Student Skill Level:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.studentLevel || 'Intermediate'}</div></div>
              <div><strong style={{ color: '#475569' }}>Teaching Mode:</strong> <div style={{ color: '#0f172a', fontWeight: '700' }}>{application.mode || application.teachingMode || 'Both'}</div></div>
              <div><strong style={{ color: '#475569' }}>Online Platform:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.onlinePlatform || 'Zoom / Google Meet'}</div></div>
              <div><strong style={{ color: '#475569' }}>Equipment (Laptop / Tablet / Internet):</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>Laptop: {application.laptopAvailable || 'Yes'} &bull; Tablet: {application.digitalTabletAvailable || 'No'} &bull; Internet: {application.stableInternet || 'Yes'}</div></div>
            </div>
            {application.teachingMethod && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#475569', fontSize: '13px' }}>Teaching Method & Bio:</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>{application.teachingMethod}</p>
              </div>
            )}
          </div>

          {/* SECTION 4: AVAILABILITY & FEES */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-clock"></i> 4. Availability & Tuition Fees
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
              <div><strong style={{ color: '#475569' }}>Available Days:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{formatArray(application.availableDays)}</div></div>
              <div><strong style={{ color: '#475569' }}>Available Hours:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.startTime || '09:00'} to {application.endTime || '19:00'}</div></div>
              <div><strong style={{ color: '#475569' }}>Expected Fee:</strong> <div style={{ color: '#166534', fontWeight: '800', fontSize: '15px' }}>₹{application.expectedFee || application.fee || '0'} ({application.feeType || 'Per Hour'})</div></div>
              <div><strong style={{ color: '#475569' }}>Negotiable:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.negotiable || 'Yes'}</div></div>
            </div>
            {application.additionalFeeNotes && (
              <div style={{ marginTop: '10px', fontSize: '13px' }}>
                <strong style={{ color: '#475569' }}>Fee Notes:</strong> <span style={{ color: '#334155' }}>{application.additionalFeeNotes}</span>
              </div>
            )}
          </div>

          {/* SECTION 5: PAYMENT DETAILS & DECLARATION */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-building-columns"></i> 5. Bank Account & Escrow Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
              <div><strong style={{ color: '#475569' }}>Account Holder:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.paymentDetails?.accountHolderName || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Bank Name:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.paymentDetails?.bankName || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Account Number:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.paymentDetails?.accountNumber || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>IFSC Code:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.paymentDetails?.ifscCode || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>UPI ID:</strong> <div style={{ color: '#0f172a', fontWeight: '600' }}>{application.paymentDetails?.upiId || 'N/A'}</div></div>
              <div><strong style={{ color: '#475569' }}>Declaration Accepted:</strong> <div style={{ color: application.declarationAccepted ? '#166534' : '#991b1b', fontWeight: '700' }}>{application.declarationAccepted ? 'Yes' : 'No'}</div></div>
            </div>
          </div>

          {/* SECTION 6: UPLOADED DOCUMENTS & RESUME */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-file-shield"></i> 6. Uploaded Application Documents & Resume / CV
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                { type: 'Profile Photo', label: 'Profile Photo', icon: 'fa-image' },
                { type: 'Qualification Certificate', label: 'Degree Certificate', icon: 'fa-file-pdf' },
                { type: 'ID Proof', label: 'Govt ID Proof', icon: 'fa-id-badge' },
                { type: 'Experience Certificate', label: 'Experience Certificate', icon: 'fa-briefcase' },
                { type: 'Resume / CV', label: 'Resume / CV', icon: 'fa-file-lines' },
                { type: 'Address Proof', label: 'Address Proof', icon: 'fa-house' },
              ].map((docItem) => {
                const url = getDocUrl(docItem.type);
                return (
                  <div key={docItem.type} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '12px', background: url ? '#f0f9ff' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className={`fa-solid ${docItem.icon}`} style={{ color: url ? '#0284c7' : '#94a3b8' }}></i> {docItem.label}
                    </div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          textAlign: 'center',
                          display: 'block',
                        }}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i> View / Download Document
                      </a>
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>Not Uploaded</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER WITH APPROVE / REJECT ACTIONS */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Close Window
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleAction('Rejected')}
              disabled={isProcessing || status === 'Rejected'}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                background: status === 'Rejected' ? '#fef2f2' : '#dc2626',
                color: status === 'Rejected' ? '#991b1b' : '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: isProcessing || status === 'Rejected' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: status === 'Rejected' ? 0.7 : 1,
              }}
            >
              <i className="fa-solid fa-xmark"></i> Reject Application
            </button>

            <button
              onClick={() => handleAction('Approved')}
              disabled={isProcessing || status === 'Approved'}
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                border: '1px solid #86efac',
                background: status === 'Approved' ? '#f0fdf4' : '#16a34a',
                color: status === 'Approved' ? '#166534' : '#ffffff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: isProcessing || status === 'Approved' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: status === 'Approved' ? 0.7 : 1,
              }}
            >
              <i className="fa-solid fa-check"></i> Approve Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
