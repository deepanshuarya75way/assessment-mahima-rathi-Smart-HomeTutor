import React, { useState, useEffect } from 'react';
import { studentApi } from '../../../services/studentApi';
import { isDemoCompletedForTutor, getDemoStageForTutor } from '../../../utils/demoEligibility';

export const FindTutorsTab = ({ onBookTutor, onRegularClass }) => {
  const [tutors, setTutors] = useState([]);
  const [completedDemoTutorIds, setCompletedDemoTutorIds] = useState([]);
  const [demoStatusMap, setDemoStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    subject: 'all',
    board: 'all',
    grade: 'all',
    location: '',
    radius: 'all',
    feeMax: '',
    lat: null,
    lng: null,
  });

  const loadTutors = async () => {
    setLoading(true);
    try {
      const [data, demoData, statusData] = await Promise.all([
        studentApi.getTutors(filters),
        studentApi.getCompletedDemoTutors(),
        studentApi.getDemoStatuses(),
      ]);

      if (data.success && data.tutors) {
        setTutors(data.tutors);
      } else {
        setTutors([]);
      }

      if (demoData.success && demoData.completedDemoTutorIds) {
        setCompletedDemoTutorIds(demoData.completedDemoTutorIds);
      }

      if (statusData.success && statusData.demoStatusMap) {
        setDemoStatusMap(statusData.demoStatusMap);
      }
    } catch (err) {
      console.error(err);
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTutors();
  }, [filters.subject, filters.board, filters.grade, filters.location, filters.radius, filters.lat, filters.lng]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'location' && prev.lat !== null) {
        updated.lat = null;
        updated.lng = null;
      }
      return updated;
    });
    if (field === 'radius' && value !== 'all' && filters.lat === null) {
      acquireGPS();
    }
  };

  const handleReset = () => {
    setFilters({
      search: '',
      subject: 'all',
      board: 'all',
      grade: 'all',
      location: '',
      radius: 'all',
      feeMax: '',
      lat: null,
      lng: null,
    });
  };

  const reverseGeocodeCity = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district;
        if (cityName) return cityName.trim();
      }
    } catch (e) {}

    try {
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (res2.ok) {
        const data2 = await res2.json();
        const cityName = data2.city || data2.locality;
        if (cityName) return cityName.trim();
      }
    } catch (e) {}

    return '';
  };

  const acquireGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const detectedCity = await reverseGeocodeCity(lat, lng);

          setFilters((prev) => ({
            ...prev,
            lat,
            lng,
            radius: prev.radius && prev.radius !== 'all' ? prev.radius : '10km',
            location: detectedCity || prev.location,
          }));
        },
        (err) => {
          alert('Geolocation error: ' + err.message + '\nPlease check location permissions in your browser.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      {/* FILTER PANEL */}
      <div className="filter-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
            <i className="fa-solid fa-sliders"></i> Multi-Criteria Tutor Search
          </h3>
          <button className="dash-btn dash-btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleReset}>
            Reset Filters
          </button>
        </div>

        <div className="filter-grid">
          <div className="filter-item">
            <label>Keyword Search</label>
            <input
              type="text"
              placeholder="Search by name or topic..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onBlur={loadTutors}
            />
          </div>

          <div className="filter-item">
            <label>Subject</label>
            <select value={filters.subject} onChange={(e) => handleFilterChange('subject', e.target.value)}>
              <option value="all">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="English">English</option>
              <option value="Coding">Coding</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Academic Board</label>
            <select value={filters.board} onChange={(e) => handleFilterChange('board', e.target.value)}>
              <option value="all">All Boards (CBSE, ICSE, IB)</option>
              <option value="CBSE">CBSE Board</option>
              <option value="ICSE">ICSE Board</option>
              <option value="IB">IB International</option>
              <option value="State">State Board</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Grade / Class</label>
            <select value={filters.grade} onChange={(e) => handleFilterChange('grade', e.target.value)}>
              <option value="all">All Grades</option>
              <option value="Class 1-5">Grade 1-5</option>
              <option value="Class 6-8">Grade 6-8</option>
              <option value="Class 9-10">Grade 9-10</option>
              <option value="Class 11-12">Grade 11-12</option>
            </select>
          </div>

          <div className="filter-item">
            <label>City / Location Search</label>
            <input
              type="text"
              placeholder="e.g. Delhi, Mumbai, Saket..."
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              onBlur={loadTutors}
            />
          </div>

          <div className="filter-item">
            <label>GPS Radius Filter</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={filters.radius} onChange={(e) => handleFilterChange('radius', e.target.value)} style={{ flex: 1 }}>
                <option value="all">Any Distance Radius</option>
                <option value="5km">Within 5 km</option>
                <option value="10km">Within 10 km</option>
                <option value="20km">Within 20 km</option>
                <option value="50km">Within 50 km</option>
              </select>
              <button type="button" className="dash-btn dash-btn-primary" style={{ padding: '6px 10px', fontSize: '12px', whiteSpace: 'nowrap' }} onClick={acquireGPS}>
                <i className="fa-solid fa-location-crosshairs"></i> GPS
              </button>
            </div>
          </div>

          <div className="filter-item">
            <label>Max Fee (₹/hr)</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={filters.feeMax}
              onChange={(e) => handleFilterChange('feeMax', e.target.value)}
              onBlur={loadTutors}
            />
          </div>
        </div>
      </div>

      {/* TUTORS RESULTS GRID */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
          <p style={{ marginTop: '10px' }}>Searching verified tutors...</p>
        </div>
      ) : tutors.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <i className="fa-solid fa-graduation-cap" style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '10px', display: 'block' }}></i>
          <h4>No Tutors Found Matching Criteria</h4>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Try resetting your filter parameters or broadening your location search.</p>
          <button className="dash-btn dash-btn-outline" onClick={handleReset}>Reset All Filters</button>
        </div>
      ) : (
        <div className="tutor-card-grid">
          {tutors.map((tutor) => {
            const tutorName = tutor.user ? tutor.user.name || 'Verified Tutor' : 'Verified Tutor';
            const initials = tutorName.substring(0, 2).toUpperCase();

            return (
              <div key={tutor._id} className="dash-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px' }}>
                      {initials}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#0f2a4a' }}>{tutorName}</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{tutor.qualification || 'Educator'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {tutor.subjects && tutor.subjects.map((sub, idx) => (
                      <span key={idx} style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {sub}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    <i className="fa-solid fa-location-dot" style={{ color: '#ef4444' }}></i> {tutor.location || 'Online'}
                    {typeof tutor.distanceKm === 'number' && (
                      <span style={{ marginLeft: '6px', color: '#0284c7', fontWeight: 700 }}>
                        &bull; <i className="fa-solid fa-location-crosshairs"></i> {tutor.distanceKm} km
                      </span>
                    )}{' '}
                    &bull; <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i> {tutor.rating || 5.0} ({tutor.totalReviews || 0} reviews)
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f2a4a',whiteSpace: 'nowrap',flexShrink: 0 }}>
                    ₹{tutor.fee || 500}<small style={{ fontSize: '11px', fontWeight: 400, color: '#64748b' }}>/hr</small>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a href={`/tutor/${tutor._id}`} target="_blank" rel="noopener noreferrer" className="dash-btn dash-btn-outline" style={{ fontSize: '11.5px', padding: '5px 8px', textDecoration: 'none' }}>
                      Profile
                    </a>
                    {(() => {
                      const demoStage = getDemoStageForTutor(tutor, completedDemoTutorIds, demoStatusMap);
                      if (demoStage === 'completed') {
                        return (
                          <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#166534', background: '#dcfce7', border: '1px solid #86efac', padding: '6px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              You have already taken the demo class. Book a regular class to continue.
                            </div>
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ fontSize: '11.5px', padding: '6px 12px', background: '#0284c7', borderColor: '#0284c7', width: '100%', justifyContent: 'center' }}
                              onClick={() => onRegularClass ? onRegularClass(tutor) : onBookTutor(tutor)}
                            >
                              Book Regular Class
                            </button>
                          </div>
                        );
                      }
                      if (demoStage === 'scheduled') {
                        return (
                          <>
                            <button
                              type="button"
                              className="dash-btn dash-btn-outline"
                              disabled
                              style={{ fontSize: '11.5px', padding: '5px 10px', opacity: 0.8, cursor: 'not-allowed', background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                            >
                              Demo Class Scheduled
                            </button>
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ fontSize: '11.5px', padding: '5px 10px', background: '#0284c7', borderColor: '#0284c7' }}
                              onClick={() => onRegularClass ? onRegularClass(tutor) : onBookTutor(tutor)}
                            >
                              Regular Classes
                            </button>
                          </>
                        );
                      }
                      if (demoStage === 'waiting_tutor') {
                        return (
                          <>
                            <button
                              type="button"
                              className="dash-btn dash-btn-outline"
                              disabled
                              style={{ fontSize: '11.5px', padding: '5px 10px', opacity: 0.8, cursor: 'not-allowed', background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}
                            >
                              Waiting for Tutor Approval
                            </button>
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ fontSize: '11.5px', padding: '5px 10px', background: '#0284c7', borderColor: '#0284c7' }}
                              onClick={() => onRegularClass ? onRegularClass(tutor) : onBookTutor(tutor)}
                            >
                              Regular Classes
                            </button>
                          </>
                        );
                      }
                      if (demoStage === 'waiting_admin') {
                        return (
                          <>
                            <button
                              type="button"
                              className="dash-btn dash-btn-outline"
                              disabled
                              style={{ fontSize: '11.5px', padding: '5px 10px', opacity: 0.8, cursor: 'not-allowed', background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                            >
                              Waiting for Admin Approval
                            </button>
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              style={{ fontSize: '11.5px', padding: '5px 10px', background: '#0284c7', borderColor: '#0284c7' }}
                              onClick={() => onRegularClass ? onRegularClass(tutor) : onBookTutor(tutor)}
                            >
                              Regular Classes
                            </button>
                          </>
                        );
                      }
                      return (
                        <>
                          <button type="button" className="dash-btn dash-btn-outline" style={{ fontSize: '11.5px', padding: '5px 10px' }} onClick={() => onBookTutor(tutor)}>
                            Book Demo Class
                          </button>
                          <button
                            type="button"
                            className="dash-btn dash-btn-primary"
                            style={{ fontSize: '11.5px', padding: '5px 10px', background: '#0284c7', borderColor: '#0284c7' }}
                            onClick={() => onRegularClass ? onRegularClass(tutor) : onBookTutor(tutor)}
                          >
                            Regular Classes
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
