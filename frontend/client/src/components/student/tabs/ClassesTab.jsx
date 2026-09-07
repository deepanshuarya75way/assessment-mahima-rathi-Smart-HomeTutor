import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';

export const ClassesTab = ({ onStartVideoCall }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'online' | 'offline'

  useEffect(() => {
    studentApi.getClassSchedule().then((res) => {
      if (res.success && Array.isArray(res.schedules)) {
        setSchedule(res.schedules);
      } else {
        setSchedule([]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredSchedule = schedule.filter((item) => {
    if (filterMode === 'online') return !item.mode || item.mode.toLowerCase() === 'online';
    if (filterMode === 'offline') return item.mode && item.mode.toLowerCase() === 'offline';
    return true;
  });

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f2a4a', fontWeight: 800 }}>
            <i className="fa-solid fa-calendar-days" style={{ color: '#0284c7' }}></i> Scheduled Classes & Sessions
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={`dash-btn ${filterMode === 'all' ? 'dash-btn-primary' : 'dash-btn-outline'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', height: '30px' }}
              onClick={() => setFilterMode('all')}
            >
              All ({schedule.length})
            </button>
            <button
              type="button"
              className={`dash-btn ${filterMode === 'online' ? 'dash-btn-primary' : 'dash-btn-outline'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', height: '30px' }}
              onClick={() => setFilterMode('online')}
            >
              Online ({schedule.filter((s) => !s.mode || s.mode.toLowerCase() === 'online').length})
            </button>
            <button
              type="button"
              className={`dash-btn ${filterMode === 'offline' ? 'dash-btn-primary' : 'dash-btn-outline'}`}
              style={{ fontSize: '11.5px', padding: '4px 10px', height: '30px' }}
              onClick={() => setFilterMode('offline')}
            >
              Offline ({schedule.filter((s) => s.mode && s.mode.toLowerCase() === 'offline').length})
            </button>
          </div>
        </div>

        <div className="dash-table-wrapper">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Subject & Tutor</th>
                <th>Frequency / Days</th>
                <th>Timing & Date</th>
                <th>Class Mode & Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: '#0284c7', marginRight: '8px' }}></i> Loading class schedule...
                  </td>
                </tr>
              ) : filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                    <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '28px', color: '#cbd5e1', marginBottom: '8px', display: 'block' }}></i>
                    No classes found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSchedule.map((item) => {
                  const isOnline = !item.mode || item.mode.toLowerCase() === 'online';
                  const isInactiveStatus = ['Completed', 'Cancelled', 'Discontinued', 'Missed', 'Rejected'].includes(item.status);
                  
                  // Check if schedule date is in the past
                  const scheduleTime = item.date ? new Date(item.date).getTime() : 0;
                  const isPastDate = scheduleTime > 0 && scheduleTime + (24 * 60 * 60 * 1000) < Date.now();
                  const isExpiredOrEnded = isInactiveStatus || (isPastDate && item.status !== 'Scheduled' && item.status !== 'Rescheduled');

                  const formattedDate = new Date(item.date || Date.now()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={item._id}>
                      <td>
                        <strong style={{ color: '#0f2a4a', fontSize: '14.5px' }}>{item.subject || 'Tuition Class'}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                          Educator: {item.tutor ? (item.tutor.name || 'Verified Tutor') : 'Verified Tutor'}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        <div>{item.frequency || 'Weekly'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.days || 'Mon, Wed'}</div>
                      </td>
                      <td style={{ fontSize: '13px', color: '#334155' }}>
                        <div style={{ fontWeight: '700' }}>{item.startTime || item.time || '05:00 PM'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{formattedDate}</div>
                      </td>
                      <td>
                        {isExpiredOrEnded ? (
                          <span style={{
                            background: item.status === 'Cancelled' || item.status === 'Discontinued' ? '#fee2e2' : '#f1f5f9',
                            color: item.status === 'Cancelled' || item.status === 'Discontinued' ? '#b91c1c' : '#64748b',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}>
                            {item.status || 'Past Class'}
                          </span>
                        ) : isOnline ? (
                          <button
                            type="button"
                            className="dash-btn dash-btn-primary"
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', gap: '6px' }}
                            onClick={() => {
                              window.location.href = `/video-call/${item._id}`;
                            }}
                          >
                            <i className="fa-solid fa-video"></i> Join Class
                          </button>
                        ) : (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-house-user"></i> Offline Class
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
    </div>
  );
};
