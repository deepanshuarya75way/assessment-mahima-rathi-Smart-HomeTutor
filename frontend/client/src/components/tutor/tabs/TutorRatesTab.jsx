import React, { useState, useEffect } from 'react';
import { tutorApi } from '../../../services/tutorApi';

export const TutorRatesTab = () => {
  const [formData, setFormData] = useState({
    qualification: '',
    experience: '',
    subjects: '',
    classes: '',
    fee: '',
    location: '',
    mode: 'Online',
    about: '',
    lat: 28.6139,
    lng: 77.2090
  });

  const [hourlyRate, setHourlyRate] = useState('500');
  const [academicBoard, setAcademicBoard] = useState('CBSE & ICSE Board');
  const [gpsStatus, setGpsStatus] = useState('GPS coordinates ready');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const res = await tutorApi.getTutorProfile();
      if (res.success && res.tutorProfile) {
        const p = res.tutorProfile;
        setFormData({
          qualification: p.qualification || '',
          experience: p.experience || '',
          subjects: p.subjects ? p.subjects.join(', ') : '',
          classes: p.classes ? p.classes.join(', ') : '',
          fee: p.fee || '',
          location: p.location || '',
          mode: p.mode || 'Online',
          about: p.about || '',
          lat: p.coordinates?.lat || 28.6139,
          lng: p.coordinates?.lng || 77.2090
        });

        if (p.fee) setHourlyRate(String(p.fee));
        if (p.coordinates?.lat) {
          setGpsStatus(`Saved Coordinates: (${p.coordinates.lat.toFixed(4)}, ${p.coordinates.lng.toFixed(4)})`);
        }
      }
    } catch (err) {
      console.error('Load Profile Error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const acquireGPSLocation = () => {
    if (!navigator.geolocation) {
      setToastMessage('Geolocation is not supported by your browser.');
      return;
    }
    setGpsStatus('Acquiring GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData((prev) => ({ ...prev, lat, lng }));
        setGpsStatus(`GPS Saved: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setToastMessage(`GPS Coordinates Acquired: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      },
      (err) => {
        console.error('GPS Error:', err);
        setGpsStatus('GPS Permission Denied (using fallback city location)');
        setToastMessage('GPS Permission Denied. Please check browser permissions.');
      }
    );
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToastMessage('');

    try {
      const res = await tutorApi.saveTutorProfile(formData);
      if (res.success) {
        setToastMessage('Tutor Profile & GPS Saved Successfully!');
      } else {
        setToastMessage(res.message || 'Failed to save profile.');
      }
    } catch (err) {
      console.error(err);
      setToastMessage('Server error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-tab-content" style={{ display: 'block' }}>
      <div className="dash-card">
        <div className="dash-card-header">
          <h3><i className="fa-solid fa-sliders"></i> Subjects, Hourly Rate & Academic Boards</h3>
        </div>

        {toastMessage && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', fontSize: '13px', fontWeight: 'bold', marginBottom: '16px' }}>
            {toastMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '24px' }}>
          <div>
            <label style={{ fontWeight: '700', fontSize: '13px', color: '#0f2a4a', display: 'block', marginBottom: '6px' }}>
              Hourly Tutoring Rate (₹/hr)
            </label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => {
                setHourlyRate(e.target.value);
                setFormData((prev) => ({ ...prev, fee: e.target.value }));
              }}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: '700', fontSize: '13px', color: '#0f2a4a', display: 'block', marginBottom: '6px' }}>
              Academic Boards Taught
            </label>
            <select
              value={academicBoard}
              onChange={(e) => setAcademicBoard(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="CBSE & ICSE Board">CBSE & ICSE Board</option>
              <option value="IB International">IB International</option>
              <option value="State Board">State Board</option>
            </select>
          </div>
        </div>

        <hr style={{ margin: '32px 0 24px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

        <div className="profile-form-card">
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2a4a', marginBottom: '16px' }}>
            Complete Professional Tutor Profile
          </h3>

          <form onSubmit={handleSubmitProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Qualification
                </label>
                <input
                  type="text"
                  name="qualification"
                  placeholder="e.g. B.Tech / M.Sc Mathematics"
                  value={formData.qualification}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Experience (Years)
                </label>
                <input
                  type="number"
                  name="experience"
                  placeholder="e.g. 5"
                  value={formData.experience}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Subjects (Comma Separated)
                </label>
                <input
                  type="text"
                  name="subjects"
                  placeholder="e.g. Mathematics, Physics, Chemistry"
                  value={formData.subjects}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Classes / Grades (Comma Separated)
                </label>
                <input
                  type="text"
                  name="classes"
                  placeholder="e.g. 9, 10, 11, 12"
                  value={formData.classes}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Hourly Fee (₹/hr)
                </label>
                <input
                  type="number"
                  name="fee"
                  placeholder="e.g. 500"
                  value={formData.fee}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Primary Location & GPS
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="location"
                    placeholder="e.g. Dehradun / Online"
                    value={formData.location}
                    onChange={handleChange}
                    className="form-control"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    required
                  />
                  <button
                    type="button"
                    className="dash-btn dash-btn-outline"
                    style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    onClick={acquireGPSLocation}
                  >
                    <i className="fa-solid fa-location-crosshairs"></i> Use GPS
                  </button>
                </div>
                <small style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>{gpsStatus}</small>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Teaching Mode
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleChange}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline / Home Tutoring</option>
                  <option value="Both">Both Online & Home</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label className="form-label" style={{ fontWeight: '700', fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                About & Teaching Philosophy
              </label>
              <textarea
                name="about"
                rows="4"
                className="form-control"
                placeholder="Share your teaching style, achievements, and goals for your students..."
                value={formData.about}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              ></textarea>
            </div>

            <button type="submit" className="dash-btn dash-btn-primary" style={{ marginTop: '24px', padding: '12px 24px' }} disabled={saving}>
              {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving Profile...</> : 'Save Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
