import React, { useState } from 'react';
import { CreateScheduleModal } from '../../common/CreateScheduleModal';
import { MarkAttendanceModal } from '../modals/MarkAttendanceModal';
import { tutorApi } from '../../../services/tutorApi';
import { getSocket } from '../../../services/socket';
import { checkClassJoinable } from '../../../utils/classTimeHelper';

export const TutorSessionsTab = ({ sessions = [], demoSessions = [], demoRequests = [], onRefresh }) => {
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

  // 1. Regular Sessions: strictly recurring regular enrolled classes
  const regularSessions = sessions.filter(
    (s) => s.classType === 'regular' || (!s.isTrial && s.frequency !== 'One-Time' && s.classType !== 'demo')
  );

  // 2. One-Time Demo Sessions: merged list of scheduled demo sessions & demo booking requests
  const combinedDemoSessions = (() => {
    const map = new Map();

    // Add demo schedules from ClassSchedule
    (demoSessions || []).forEach((ds) => {
      const key = ds.booking ? ds.booking.toString() : ds._id.toString();
      const dateObj = ds.date ? new Date(ds.date) : null;
      const formattedDate = dateObj && !isNaN(dateObj)
        ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Scheduled Date';
      const formattedTime = ds.startTime
        ? (ds.endTime ? `${ds.startTime} - ${ds.endTime}` : ds.startTime)
        : (ds.time || '06:00 PM');

      map.set(key, {
        _id: ds._id,
        scheduleId: ds._id,
        bookingId: ds.booking,
        studentName: ds.student?.name || 'Student',
        studentEmail: ds.student?.email || '',
        studentPhone: ds.student?.phone || '',
        subject: ds.subject || 'Tuition',
        grade: ds.grade || ds.student?.grade || 'General',
        mode: ds.mode || 'Online',
        date: formattedDate,
        rawDate: ds.date,
        time: formattedTime,
        startTime: ds.startTime,
        endTime: ds.endTime,
        frequency: 'One-Time',
        classType: 'Demo Class',
        status: ds.status || 'Scheduled',
        isTrial: true,
        tutor: ds.tutor,
      });
    });

    // Add demo requests from BookingRequest (if not already mapped by schedule)
    (demoRequests || []).forEach((dr) => {
      const key = dr._id ? dr._id.toString() : '';
      if (!map.has(key)) {
        const dateObj = dr.scheduledDate ? new Date(dr.scheduledDate) : (dr.date ? new Date(dr.date) : (dr.createdAt ? new Date(dr.createdAt) : null));
        const formattedDate = dateObj && !isNaN(dateObj)
          ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : (dr.date || 'Pending Schedule');
        const formattedTime = dr.scheduledStartTime || dr.scheduledTime || dr.time || '06:00 PM';

        let computedStatus = dr.status || 'Pending';
        if (computedStatus === 'Accepted' || computedStatus === 'Confirmed') computedStatus = 'Scheduled';

        map.set(key, {
          _id: dr.scheduleId || dr._id,
          scheduleId: dr.scheduleId || dr._id,
          bookingId: dr._id,
          studentName: dr.student?.name || dr.studentName || 'Student',
          studentEmail: dr.student?.email || '',
          studentPhone: dr.student?.phone || '',
          subject: dr.subject || 'Tuition',
          grade: dr.grade || dr.class || 'General',
          mode: dr.isHomeVisit ? 'Offline' : 'Online',
          date: formattedDate,
          rawDate: dr.scheduledDate || dr.date || dr.createdAt,
          time: formattedTime,
          startTime: dr.scheduledStartTime,
          endTime: dr.scheduledEndTime,
          frequency: 'One-Time',
          classType: 'Demo Class',
          status: computedStatus,
          isTrial: true,
          tutor: dr.tutor,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const da = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const db = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      return db - da;
    });
  })();

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>

      {/* ========================================================================= */}
      {/* SECTION 1: ONE-TIME DEMO CLASSES & TRIAL SESSIONS                         */}
      {/* ========================================================================= */}
      <div className="dash-card" style={{ marginBottom: '24px', borderTop: '4px solid #0284c7' }}>
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f2a4a' }}>
              <i className="fa-solid fa-graduation-cap" style={{ color: '#0284c7' }}></i> One-Time Demo Classes (Trial Sessions)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Student trial demo sessions booked for specific dates & times. These are strictly single one-time sessions.
            </p>
          </div>
          <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
            {combinedDemoSessions.length} {combinedDemoSessions.length === 1 ? 'Demo Session' : 'Demo Sessions'}
          </span>
        </div>

        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Subject & Grade</th>
                <th>Exact Demo Date & Time</th>
                <th>Frequency</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {combinedDemoSessions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '32px 20px' }}>
                    <i className="fa-solid fa-calendar-check" style={{ fontSize: '28px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}></i>
                    <div style={{ fontWeight: '700', color: '#334155', fontSize: '14px', marginBottom: '4px' }}>No Demo Classes Scheduled</div>
                    <p style={{ margin: '0 auto', fontSize: '12.5px', color: '#64748b', maxWidth: '460px' }}>
                      When a student books a trial demo session, it will appear here as a one-time class with its exact scheduled date and time.
                    </p>
                  </td>
                </tr>
              ) : (
                combinedDemoSessions.map((demo, idx) => {
                  const isCompleted = demo.status === 'Completed';
                  const isOnline = (!demo.mode || demo.mode.toLowerCase() === 'online') && !isCompleted;
                  const isScheduledOrActive = demo.status === 'Scheduled' || demo.status === 'Confirmed' || demo.status === 'Approved' || demo.status === 'Rescheduled';

                  const timingStatus = checkClassJoinable(
                    demo.rawDate,
                    demo.startTime || (demo.time ? demo.time.split(/[-–—]/)[0]?.trim() : '18:00'),
                    demo.endTime || (demo.time ? demo.time.split(/[-–—]/)[1]?.trim() : '19:00'),
                    demo.status
                  );

                  let statusBadgeBg = '#fef3c7';
                  let statusBadgeColor = '#b45309';
                  if (demo.status === 'Scheduled' || demo.status === 'Confirmed') {
                    statusBadgeBg = '#e0f2fe';
                    statusBadgeColor = '#0284c7';
                  } else if (demo.status === 'Completed') {
                    statusBadgeBg = '#dcfce7';
                    statusBadgeColor = '#15803d';
                  } else if (demo.status === 'Cancelled' || demo.status === 'Declined') {
                    statusBadgeBg = '#fee2e2';
                    statusBadgeColor = '#b91c1c';
                  }

                  return (
                    <tr key={demo._id || idx}>
                      <td style={{ fontWeight: '700', color: '#0f2a4a' }}>
                        {demo.studentName}
                        {demo.studentEmail && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{demo.studentEmail}</div>
                        )}
                        {demo.studentPhone && demo.studentPhone !== 'N/A' && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{demo.studentPhone}</div>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{demo.subject}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Grade: {demo.grade} &bull; Mode: {demo.mode}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0f2a4a', fontSize: '13px' }}>
                          {demo.date}
                        </div>
                        <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: '600' }}>
                          <i className="fa-regular fa-clock"></i> {demo.time}
                        </div>
                      </td>
                      <td>
                        <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                          One-Time
                        </span>
                      </td>
                      <td>
                        <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #bbf7d0' }}>
                          Demo Class
                        </span>
                      </td>
                      <td>
                        <span style={{ background: statusBadgeBg, color: statusBadgeColor, padding: '3px 10px', borderRadius: '10px', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-circle-dot" style={{ fontSize: '8px' }}></i> {demo.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {isOnline && isScheduledOrActive ? (
                          timingStatus.canJoin ? (
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ padding: '6px 14px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                              onClick={() => {
                                const socket = getSocket();
                                if (socket) {
                                  socket.emit('initiate-video-call', {
                                    bookingId: demo.scheduleId || demo._id,
                                    callerName: demo.tutor?.name || 'Tutor',
                                    callerRole: 'Tutor',
                                  });
                                }
                                window.location.href = `/video-call/${demo.scheduleId || demo._id}`;
                              }}
                            >
                              <i className="fa-solid fa-video"></i> Start Demo
                            </button>
                          ) : (
                            <span
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid #e2e8f0',
                              }}
                              title={timingStatus.actionNote}
                            >
                              <i className="fa-regular fa-clock" style={{ color: '#0284c7' }}></i>
                              {timingStatus.actionNote}
                            </span>
                          )
                        ) : isCompleted ? (
                          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>
                            <i className="fa-solid fa-circle-check"></i> Demo Completed
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {demo.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: REGULAR RECURRING TEACHING SESSIONS                            */}
      {/* ========================================================================= */}
      <div className="dash-card" style={{ borderTop: '4px solid #4338ca' }}>
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f2a4a' }}>
              <i className="fa-solid fa-chalkboard-user" style={{ color: '#4338ca' }}></i> Regular Teaching Sessions & Schedule
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Your enrolled regular students with active recurring class schedules and attendance records.
            </p>
          </div>
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
                <th>Type</th>
                <th>Attendance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {regularSessions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '36px 20px' }}>
                    <i className="fa-solid fa-calendar-days" style={{ fontSize: '28px', color: '#94a3b8', display: 'block', marginBottom: '10px' }}></i>
                    <div style={{ fontWeight: '700', color: '#334155', fontSize: '14px', marginBottom: '4px' }}>No Regular Teaching Sessions Yet</div>
                    <p style={{ margin: '0 auto', fontSize: '12.5px', color: '#64748b', maxWidth: '480px' }}>
                      Regular recurring classes appear here once a student completes their trial demo and explicitly subscribes to regular classes. You can also click "+ Schedule Class" above to set up a regular class schedule.
                    </p>
                  </td>
                </tr>
              ) : (
                regularSessions.map((item, idx) => {
                  const isInactiveStatus = ['Completed', 'Cancelled', 'Discontinued', 'Missed', 'Rejected'].includes(item.status);
                  const isOnline = (!item.mode || item.mode.toLowerCase() === 'online') && !isInactiveStatus;
                  const attStatus = item.attendance || 'Pending';
                  let attBadgeColor = '#64748b';
                  let attBadgeBg = '#f1f5f9';
                  if (attStatus === 'Present') { attBadgeColor = '#15803d'; attBadgeBg = '#dcfce7'; }
                  else if (attStatus === 'Absent') { attBadgeColor = '#b91c1c'; attBadgeBg = '#fee2e2'; }
                  else if (attStatus === 'Late') { attBadgeColor = '#b45309'; attBadgeBg = '#fef3c7'; }

                  const timeDisplay = item.startTime ? (item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime) : (item.time || 'Schedule Configured');
                  const freqDisplay = item.frequency || 'Weekly';
                  const daysDisplay = item.days ? `(${item.days})` : '';

                  return (
                    <tr key={item._id || idx}>
                      <td style={{ fontWeight: '700', color: '#0f2a4a' }}>
                        {item.student?.name || item.studentName || 'Student Enrolment'}
                        {item.student?.email && (
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{item.student.email}</div>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{item.subject || 'Tuition'}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Mode: {item.mode || 'Online'} &bull; Grade: {item.grade || 'General'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#334155' }}>{timeDisplay}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{freqDisplay} {daysDisplay}</div>
                      </td>
                      <td>
                        <span style={{ background: '#eef2ff', color: '#4338ca', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', border: '1px solid #c7d2fe' }}>
                          Regular Class
                        </span>
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
                                const socket = getSocket();
                                if (socket) {
                                  socket.emit('initiate-video-call', {
                                    bookingId: item._id,
                                    callerName: item.tutor?.name || 'Tutor',
                                    callerRole: 'Tutor',
                                  });
                                }
                                window.location.href = `/video-call/${item._id}`;
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

