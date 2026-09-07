import React, { useState } from 'react';
import { CreateScheduleModal } from '../../common/CreateScheduleModal';
import { MarkAttendanceModal } from '../modals/MarkAttendanceModal';
import { tutorApi } from '../../../services/tutorApi';

export const TutorSessionsTab = ({ sessions = [], onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  const handleOpenAttendance = (item) => {
    setSelectedSchedule(item);
    setAttendanceModalOpen(true);
  };

  const handleRequestCert = async (item) => {
    const studentId = item.student?._id || item.student;
    const courseName = item.subject || 'Tuition Course';

    if (!studentId) {
      alert('Unable to identify student ID for this session.');
      return;
    }

    const confirmed = window.showCustomConfirm
      ? await window.showCustomConfirm(`Submit a completion certificate request to Admin for ${item.student?.name || 'Student'} (${courseName})?`, 'Certificate Request', 'Submit Request', 'Cancel')
      : window.confirm(`Submit a completion certificate request to Admin for ${item.student?.name || 'Student'} (${courseName})?`);
    if (!confirmed) return;

    try {
      const res = await tutorApi.requestCertificate({
        studentId,
        courseName,
        attendancePercentage: 100,
        completedClasses: 12,
        tutorRemarks: 'Course completed with distinction.',
      });

      if (res.success) {
        alert(res.message || 'Certificate request submitted for Admin approval!');
        if (onRefresh) onRefresh();
      } else {
        alert(res.message || 'Failed to submit certificate request.');
      }
    } catch (err) {
      console.error('Request cert error:', err);
      alert('Error submitting certificate request.');
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chalkboard-user" style={{ color: '#0f2a4a' }}></i> Teaching Sessions & Class Schedule
          </h3>
          <button
            type="button"
            className="dash-btn dash-btn-accent"
            onClick={() => setIsModalOpen(true)}
            style={{ fontSize: '13px', padding: '6px 14px' }}
          >
            <i className="fa-solid fa-calendar-plus" style={{ marginRight: '6px' }}></i> Schedule Class
          </button>
        </div>
        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Subject & Grade</th>
                <th>Schedule & Frequency</th>
                <th>Attendance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No student teaching sessions found. Click "Schedule Class" above to create one.
                  </td>
                </tr>
              ) : (
                sessions.map((item, idx) => {
                  const isInactiveStatus = ['Completed', 'Cancelled', 'Discontinued', 'Missed', 'Rejected'].includes(item.status);
                  const isOnline = (!item.mode || item.mode.toLowerCase() === 'online') && !isInactiveStatus;
                  const attStatus = item.attendance || 'Pending';
                  let attBadgeColor = '#64748b';
                  let attBadgeBg = '#f1f5f9';
                  if (attStatus === 'Present') { attBadgeColor = '#15803d'; attBadgeBg = '#dcfce7'; }
                  else if (attStatus === 'Absent') { attBadgeColor = '#b91c1c'; attBadgeBg = '#fee2e2'; }
                  else if (attStatus === 'Late') { attBadgeColor = '#b45309'; attBadgeBg = '#fef3c7'; }

                  return (
                    <tr key={item._id || idx}>
                      <td style={{ fontWeight: '700', color: '#0f2a4a' }}>
                        {item.student?.name || item.studentName || 'Student Enrolment'}
                      </td>
                      <td>{item.subject || 'Tuition'}</td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#334155' }}>{item.startTime || item.time || 'Mon, Wed (05:00 PM)'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.frequency || 'Weekly'} ({item.days || 'Mon, Wed'})</div>
                      </td>
                      <td>
                        <span style={{ background: attBadgeBg, color: attBadgeColor, padding: '3px 10px', borderRadius: '10px', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-clipboard-user"></i> {attStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                          {isOnline && (
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ padding: '6px 12px', fontSize: '11.5px', whiteSpace: 'nowrap' }}
                              onClick={() => {
                                if (window.socket) {
                                  window.socket.emit('initiate-video-call', {
                                    bookingId: item._id,
                                    callerName: item.tutor?.name || 'Tutor',
                                    callerRole: 'Tutor',
                                  });
                                } else {
                                  window.location.href = `/video-call/${item._id}`;
                                }
                              }}
                            >
                              <i className="fa-solid fa-video"></i> Start Class
                            </button>
                          )}
                          <button
                            type="button"
                            className="dash-btn dash-btn-outline"
                            style={{ padding: '6px 12px', fontSize: '11.5px', borderColor: '#10b981', color: '#047857', whiteSpace: 'nowrap' }}
                            onClick={() => handleOpenAttendance(item)}
                          >
                            <i className="fa-solid fa-clipboard-check"></i> Mark Attendance
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn-outline"
                            style={{ padding: '6px 12px', fontSize: '11.5px', borderColor: '#0284c7', color: '#0284c7', whiteSpace: 'nowrap' }}
                            onClick={() => handleRequestCert(item)}
                          >
                            <i className="fa-solid fa-award"></i> Request Cert
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        userRole="tutor"
      />

      <MarkAttendanceModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        schedule={selectedSchedule}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
