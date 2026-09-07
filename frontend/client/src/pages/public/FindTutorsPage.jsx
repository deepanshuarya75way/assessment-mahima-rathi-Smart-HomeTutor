import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { SubmitRequestModal } from '../../components/common/SubmitRequestModal';
import { RegularClassPaymentModal } from '../../components/tutor/RegularClassPaymentModal';
import { isDemoCompletedForTutor } from '../../utils/demoEligibility';

export const FindTutorsPage = () => {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState([]);
  const [completedDemoTutorIds, setCompletedDemoTutorIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userGeoLocation, setUserGeoLocation] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRegularTutor, setSelectedRegularTutor] = useState(null);
  const [isRegularModalOpen, setIsRegularModalOpen] = useState(false);

  const getInitialParam = (key) => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || 'all';
  };

  const normalizeGradeParam = (g) => {
    if (!g || g === 'all') return 'all';
    const decoded = decodeURIComponent(g).replace(/\+/g, ' ').trim();
    if (decoded === 'Class 1-5' || decoded === 'Class 1–5' || decoded.toLowerCase().includes('1-5') || decoded.toLowerCase().includes('primary')) return 'Class 1-5';
    if (decoded === 'Class 6-8' || decoded === 'Class 6–8' || decoded.toLowerCase().includes('6-8') || decoded.toLowerCase().includes('middle')) return 'Class 6-8';
    if (decoded === 'Class 9-10' || decoded === 'Class 9–10' || decoded.toLowerCase().includes('9-10') || decoded.toLowerCase().includes('secondary')) return 'Class 9-10';
    if (decoded === 'Class 11-12' || decoded === 'Class 11–12' || decoded.toLowerCase().includes('11-12') || decoded.toLowerCase().includes('11–12')) return 'Class 11-12';
    return decoded;
  };

  // Filters state
  const [searchText, setSearchText] = useState('');
  const [location, setLocation] = useState('all');
  const [subject, setSubject] = useState(() => getInitialParam('subject'));
  const [board, setBoard] = useState(() => getInitialParam('board'));
  const [grade, setGrade] = useState(() => normalizeGradeParam(getInitialParam('grade')));
  const [mode, setMode] = useState('all');
  const [distanceRadius, setDistanceRadius] = useState('all');
  const [gender, setGender] = useState('all');
  const [experience, setExperience] = useState('all');
  const [maxFee, setMaxFee] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [language, setLanguage] = useState('all');

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [customCityOption, setCustomCityOption] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gParam = params.get('grade');
    const sParam = params.get('subject');
    const bParam = params.get('board');

    if (gParam) {
      setGrade(normalizeGradeParam(gParam));
    }
    if (sParam) {
      setSubject(decodeURIComponent(sParam).replace(/\+/g, ' ').trim());
    }
    if (bParam) {
      setBoard(decodeURIComponent(bParam).replace(/\+/g, ' ').trim());
    }
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
    } catch (e) {
      // Fallback
    }

    try {
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      if (res2.ok) {
        const data2 = await res2.json();
        const cityName = data2.city || data2.locality;
        if (cityName) return cityName.trim();
      }
    } catch (e) {
      // Ignore
    }

    return null;
  };

  const fetchTutors = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();

      if (searchText.trim()) query.append('search', searchText.trim());
      if (location !== 'all') query.append('location', location);
      if (subject !== 'all') query.append('subject', subject);
      if (board !== 'all') query.append('board', board);
      if (grade !== 'all') query.append('grade', grade);
      if (mode !== 'all') query.append('mode', mode);
      if (gender !== 'all') query.append('gender', gender);
      if (experience !== 'all') query.append('experience', experience);
      if (maxFee) query.append('maxFee', maxFee);
      if (minRating !== '0') query.append('minRating', minRating);
      if (language !== 'all') query.append('language', language);
      if (distanceRadius !== 'all') query.append('distanceRadius', distanceRadius);

      if (userGeoLocation) {
        query.append('lat', userGeoLocation.lat);
        query.append('lng', userGeoLocation.lng);
      }

      const response = await fetch(`/api/tutor/all?${query.toString()}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.tutors)) {
        setTutors(data.tutors);
      } else {
        setTutors([]);
      }

      try {
        const demoRes = await fetch('/api/student/completed-demo-tutors');
        const demoData = await demoRes.json();
        if (demoData.success && demoData.completedDemoTutorIds) {
          setCompletedDemoTutorIds(demoData.completedDemoTutorIds);
        }
      } catch (e) {
        // Non-student or guest user
      }
    } catch (err) {
      console.error('Error fetching tutors:', err);
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, [
    searchText,
    location,
    subject,
    board,
    grade,
    mode,
    distanceRadius,
    gender,
    experience,
    maxFee,
    minRating,
    language,
    userGeoLocation,
  ]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  const useCurrentGPSLocation = () => {
    if (isDetectingLocation) return;

    if (!navigator.geolocation) {
      showToast('Your browser does not support location services.');
      return;
    }

    setIsDetectingLocation(true);
    showToast('Detecting your location...');

    if (distanceRadius === 'all') {
      setDistanceRadius('10km');
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserGeoLocation(coords);

        const detectedCity = await reverseGeocodeCity(coords.lat, coords.lng);
        if (detectedCity) {
          setCustomCityOption(detectedCity);
          setLocation(detectedCity);
          showToast(`Current location acquired (${detectedCity})! Searching nearby tutors...`);
        } else {
          showToast('Location detected, but city name could not be identified.');
        }

        setIsDetectingLocation(false);
      },
      (err) => {
        setIsDetectingLocation(false);
        console.error('GPS Error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          showToast('Location permission was denied. Please allow location access to find nearby tutors.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          showToast('Unable to determine your current location. Please try again.');
        } else if (err.code === err.TIMEOUT) {
          showToast('Location request timed out. Please try again.');
        } else {
          showToast('Unable to retrieve your current location. Please try again.');
        }
      },
      options
    );
  };

  const handleDistanceRadiusChange = (val) => {
    setDistanceRadius(val);
    if (val !== 'all' && !userGeoLocation) {
      useCurrentGPSLocation();
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setLocation('all');
    setCustomCityOption(null);
    setSubject('all');
    setBoard('all');
    setGrade('all');
    setMode('all');
    setDistanceRadius('all');
    setGender('all');
    setExperience('all');
    setMaxFee('');
    setMinRating('0');
    setLanguage('all');
    setUserGeoLocation(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    showToast('Filters reset to defaults.');
  };

  const openGoogleMap = (lat, lng, name) => {
    const targetLat = lat || 28.6139;
    const targetLng = lng || 77.2090;
    const mapsUrl = `https://www.google.com/maps?q=${targetLat},${targetLng}`;
    window.open(mapsUrl, '_blank');
  };

  const handleBookDemo = async (tutorProfileId, tutorName) => {
    const message = window.showCustomPrompt
      ? await window.showCustomPrompt(
          `Request a free trial / demo class with ${tutorName}.\nEnter your message/preferred timing:`,
          'Hi, I would like to schedule a trial class.',
          'Book Demo Class',
          'Submit Request',
          'Cancel'
        )
      : prompt(
          `Request a free trial / demo class with ${tutorName}.\nEnter your message/preferred timing:`,
          'Hi, I would like to schedule a trial class.'
        );
    if (message === null || message.trim() === '') return;

    try {
      const res = await fetch('/api/student/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorProfileId, message, isTrial: true }),
      });
      const data = await res.json();
      if (data.success) {
        if (window.showCustomAlert) {
          window.showCustomAlert(data.message, 'Success', 'success');
        } else {
          alert(data.message);
        }
      } else {
        const errorMsg = data.message || 'Authentication required. Please log in.';
        const isAuthError = res.status === 401 || (data.message && (data.message.toLowerCase().includes('log in') || data.message.toLowerCase().includes('authentication')));
        if (window.showCustomAlert) {
          window.showCustomAlert(
            errorMsg,
            'Attention Needed',
            'warning',
            isAuthError ? () => navigate('/login') : undefined
          );
        } else {
          alert(errorMsg);
          if (isAuthError) navigate('/login');
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg = 'Error sending booking request. Please try again.';
      if (window.showCustomAlert) {
        window.showCustomAlert(errorMsg, 'Attention Needed', 'error');
      } else {
        alert(errorMsg);
      }
    }
  };

  const handleRegularClass = (tutor) => {
    setSelectedRegularTutor(tutor);
    setIsRegularModalOpen(true);
  };

  const openRequestTutorModal = () => {
    setIsRequestModalOpen(true);
  };

  useEffect(() => {
    // Intersection Observer for scroll reveal animations with unique ft- class
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ft-revealed');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elementsToReveal = document.querySelectorAll('.ft-reveal-on-scroll');
    elementsToReveal.forEach((el) => observer.observe(el));

    return () => {
      elementsToReveal.forEach((el) => observer.unobserve(el));
    };
  }, [loading]);

  return (
    <div className="find-tutors-root">
      <Header activePage="find" />

      {toastMessage && (
        <div className="ft-toast-notification">
          <i className="fa-solid fa-circle-info"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HERO SECTION */}
      {/* <section className="ft-hero-section ft-reveal-on-scroll">
        <div className="container">
          <span className="ft-hero-badge">VERIFIED HOME & ONLINE TUTORS</span>
          <h1 className="ft-hero-title">Find Your Perfect Expert Tutor</h1>
          <p className="ft-hero-subtitle">
            Filter top-rated tutors by Subject, Board (CBSE, ICSE, IB), Grade, GPS Distance, Gender, Fees, Ratings, and Language. Book free demo classes or schedule regular tutoring.
          </p>
        </div>
      </section> */}

      {/* MULTI-FILTER SEARCH SECTION */}
      <main className="ft-main-container">
        <div className="container">
          <div className="ft-filter-card ft-reveal-on-scroll">
            <div className="ft-filter-header">
              <h3 className="ft-filter-title">
                <i className="fa-solid fa-sliders"></i> Filter Tutors by All Criteria
              </h3>
              <div className="ft-filter-btn-group">
                <button
                  type="button"
                  className="ft-btn ft-btn-outline ft-btn-gps"
                  onClick={useCurrentGPSLocation}
                  disabled={isDetectingLocation}
                >
                  {isDetectingLocation ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Detecting location...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-location-crosshairs"></i> Use My Current Location
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="ft-btn ft-btn-outline"
                  onClick={resetFilters}
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  className="ft-btn ft-btn-primary"
                  onClick={openRequestTutorModal}
                >
                  <i className="fa-solid fa-paper-plane"></i> Submit Request
                </button>
              </div>
            </div>

            <div className="ft-filter-grid">
              <div className="ft-filter-field">
                <label className="ft-filter-label">Keyword / Name</label>
                <input
                  type="text"
                  className="ft-filter-input"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search tutor or topic..."
                />
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Location / City</label>
                <select className="ft-filter-input" value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="all">All Locations / Cities</option>
                  {customCityOption && !['Delhi', 'New Delhi', 'Mumbai', 'Bangalore', 'Dehradun', 'Kolkata', 'Pune', 'Hyderabad', 'Online'].some((c) => c.toLowerCase() === customCityOption.toLowerCase()) && (
                    <option value={customCityOption}>{customCityOption}</option>
                  )}
                  <option value="Delhi">Delhi / NCR</option>
                  <option value="New Delhi">New Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bangalore">Bangalore</option>
                  <option value="Dehradun">Dehradun</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Pune">Pune</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Online">Online Only</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Subject</label>
                <select className="ft-filter-input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="all">All Subjects</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="English">English</option>
                  <option value="Coding">Coding</option>
                  <option value="Languages">Languages</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Academic Board</label>
                <select className="ft-filter-input" value={board} onChange={(e) => setBoard(e.target.value)}>
                  <option value="all">All Boards (CBSE, ICSE, IB)</option>
                  <option value="CBSE">CBSE Board</option>
                  <option value="ICSE">ICSE Board</option>
                  <option value="State">State Board</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Class / Grade</label>
                <select className="ft-filter-input" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="all">All Grades (Class 1 to 12)</option>
                  <option value="Class 1-5">Class 1 to 5 (Primary)</option>
                  <option value="Class 6-8">Class 6 to 8 (Middle)</option>
                  <option value="Class 9-10">Class 9 & 10 (Secondary)</option>
                  <option value="Class 11-12">Class 11 & 12 (Senior Secondary)</option>
                  <option value="Class 1">Class 1</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Teaching Mode</label>
                <select className="ft-filter-input" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">GPS Distance Radius</label>
                <select className="ft-filter-input" value={distanceRadius} onChange={(e) => handleDistanceRadiusChange(e.target.value)}>
                  <option value="all">Any Distance Radius</option>
                  <option value="5km">Within &lt; 5 km (Nearby)</option>
                  <option value="10km">Within &lt; 10 km</option>
                  <option value="25km">Within &lt; 25 km</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Gender Preference</label>
                <select className="ft-filter-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="all">No Preference</option>
                  <option value="Female">Female Tutors</option>
                  <option value="Male">Male Tutors</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Experience</label>
                <select className="ft-filter-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
                  <option value="all">Any Experience</option>
                  <option value="3-5 yrs">3-5 Years</option>
                  <option value="5-10 yrs">5-10 Years</option>
                  <option value="10+ yrs">10+ Years</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Max Fee (₹/hr)</label>
                <input
                  type="number"
                  className="ft-filter-input"
                  value={maxFee}
                  onChange={(e) => setMaxFee(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Min Rating</label>
                <select className="ft-filter-input" value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                  <option value="0">Any Rating</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.8">4.8+ Stars</option>
                </select>
              </div>

              <div className="ft-filter-field">
                <label className="ft-filter-label">Language</label>
                <select className="ft-filter-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="all">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          {/* TUTORS DIRECTORY RESULTS GRID */}
          <div className="ft-results-wrapper ft-reveal-on-scroll">
            {loading ? (
              <div className="ft-tutor-grid">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="ft-tutor-card ft-skeleton-card">
                    <div className="ft-skeleton-avatar"></div>
                    <div className="ft-skeleton-line full"></div>
                    <div className="ft-skeleton-line half"></div>
                    <div className="ft-skeleton-line full"></div>
                  </div>
                ))}
              </div>
            ) : tutors.length === 0 ? (
              <div className="ft-empty-container">
                <i className="fa-solid fa-user-slash ft-empty-icon"></i>
                <h3>No tutors found matching your criteria</h3>
                <p>Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="ft-tutor-grid">
                {tutors.map((tutor, idx) => {
                  const tutorName = tutor.user ? tutor.user.name : 'Expert Tutor';
                  const initials = tutorName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase();
                  const rating = tutor.rating || 5.0;
                  const reviewsCount = tutor.totalReviews || 0;
                  const lat = tutor.coordinates?.lat || 28.6139;
                  const lng = tutor.coordinates?.lng || 77.2090;

                  let distBadge = null;
                  if (tutor.distanceKm !== undefined && tutor.distanceKm !== null) {
                    distBadge = (
                      <span className="ft-badge ft-badge-gps">
                        <i className="fa-solid fa-location-dot"></i> {tutor.distanceKm} km away
                      </span>
                    );
                  } else if (tutor.serviceAreaRadius) {
                    distBadge = (
                      <span className="ft-badge ft-badge-radius">
                        <i className="fa-solid fa-compass"></i> Within {tutor.serviceAreaRadius} km
                      </span>
                    );
                  }

                  return (
                    <div
                      key={tutor._id}
                      className="ft-tutor-card"
                      style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                      <div className="ft-tutor-header">
                        <div className="ft-tutor-avatar">{initials}</div>
                        <div className="ft-tutor-header-info">
                          <h3 className="ft-tutor-name">{tutorName}</h3>
                          <p className="ft-tutor-title">
                            {tutor.qualification} • {tutor.experience || 1}+ Yrs Exp
                          </p>
                          {distBadge && <div className="ft-badge-wrapper">{distBadge}</div>}
                        </div>
                      </div>

                      <div className="ft-tutor-info-list">
                        <p>
                          <strong>Subjects:</strong>{' '}
                          {tutor.subjects ? tutor.subjects.join(', ') : 'General'}
                        </p>
                        <p>
                          <strong>Classes:</strong>{' '}
                          {tutor.classes ? tutor.classes.join(', ') : 'All Grades'}
                        </p>
                        <p>
                          <strong>Location:</strong> {tutor.location || 'Online'}
                        </p>
                        <p>
                          <strong>Mode:</strong> {tutor.mode || 'Both'}
                        </p>
                      </div>

                      <div className="ft-tutor-meta-bar">
                        <div className="rating">
                          <i className="fa-solid fa-star"></i> {rating} ({reviewsCount})
                        </div>
                        <div className="fee">₹{tutor.fee}/hr</div>
                      </div>

                      <div className="ft-tutor-actions-row">
                        <a
                          href={`/tutor/${tutor._id}`}
                          className="ft-btn ft-btn-outline ft-btn-profile"
                        >
                          View Profile
                        </a>
                        <button
                          type="button"
                          className="ft-btn ft-btn-outline ft-btn-map"
                          onClick={() => handleRegularClass(tutor)}
                          style={{ borderColor: '#0284c7', color: '#0284c7', fontWeight: '800' }}
                        >
                          <i className="fa-solid fa-graduation-cap"></i> Regular Class
                        </button>
                        {isDemoCompletedForTutor(tutor, completedDemoTutorIds) ? (
                          <button
                            type="button"
                            className="ft-btn ft-btn-outline ft-btn-book"
                            disabled
                            style={{ opacity: 0.7, cursor: 'not-allowed', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}
                            title="You have already attended a demo class with this tutor. You can book Regular Classes instead."
                          >
                            <i className="fa-solid fa-circle-check"></i> Demo Completed
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ft-btn ft-btn-primary ft-btn-book"
                            onClick={() => handleBookDemo(tutor._id, tutorName)}
                          >
                            <i className="fa-solid fa-calendar-check"></i> Book Demo Class
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <SubmitRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />

      <RegularClassPaymentModal
        isOpen={isRegularModalOpen}
        onClose={() => setIsRegularModalOpen(false)}
        tutor={selectedRegularTutor}
        onSuccess={(msg) => showToast(msg)}
      />

      <Footer />
    </div>
  );
};

