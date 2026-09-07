import React from 'react';
import {
  GraduationCapIcon,
  BriefcaseIcon,
  BookOpenIcon,
  SchoolIcon,
  MapPinIcon,
  CompassIcon,
  MonitorIcon,
  HouseIcon,
  IndianRupeeIcon,
  StarIcon,
  MapPinnedIcon,
  UserIcon,
  CalendarDaysIcon
} from '../common/ReactIcons';

export const TutorAbout = ({ tutor = {}, onBookClick, onRegularClick, isDemoUsed = false }) => {
  const lat = tutor.coordinates && tutor.coordinates.lat ? tutor.coordinates.lat : 28.6139;
  const lng = tutor.coordinates && tutor.coordinates.lng ? tutor.coordinates.lng : 77.2090;
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const subjectsStr = Array.isArray(tutor.subjects) ? tutor.subjects.join(', ') : tutor.subjects || 'General';
  const classesStr = Array.isArray(tutor.classes) ? tutor.classes.join(', ') : tutor.classes || 'All Grades';
  const rating = tutor.rating || 5.0;
  const totalReviews = tutor.totalReviews || 0;

  return (
    <div>
      {/* 2-COLUMN ATTRIBUTE GRID CARDS */}
      <div className="tutor-grid-container">
        
        {/* QUALIFICATION */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble blue">
            <GraduationCapIcon size={20} color="#0284c7" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Qualification</span>
            <span className="tutor-info-value">
              {tutor.qualification || tutor.highestQualification || 'N/A'}
            </span>
          </div>
        </div>

        {/* EXPERIENCE */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble purple">
            <BriefcaseIcon size={20} color="#9333ea" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Experience</span>
            <span className="tutor-info-value">
              {tutor.experience || tutor.totalExperience || 0} Years
            </span>
          </div>
        </div>

        {/* SUBJECTS */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble emerald">
            <BookOpenIcon size={20} color="#059669" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Subjects</span>
            <span className="tutor-info-value">{subjectsStr}</span>
          </div>
        </div>

        {/* CLASSES */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble amber">
            <SchoolIcon size={20} color="#d97706" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Classes</span>
            <span className="tutor-info-value">{classesStr}</span>
          </div>
        </div>

        {/* LOCATION / CITY */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble red">
            <MapPinIcon size={20} color="#dc2626" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Location / City</span>
            <span className="tutor-info-value">
              {tutor.location || tutor.city || 'N/A'}
            </span>
          </div>
        </div>

        {/* SERVICE RADIUS */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble teal">
            <CompassIcon size={20} color="#0d9488" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Service Radius</span>
            <span className="tutor-info-value">
              {tutor.serviceAreaRadius || 10} km
            </span>
          </div>
        </div>

        {/* TEACHING MODE */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble indigo">
            <MonitorIcon size={20} color="#4f46e5" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Teaching Mode</span>
            <span className="tutor-info-value">
              {tutor.mode || 'Online / Offline'}
            </span>
          </div>
        </div>

        {/* HOME VISITS */}
        <div className="tutor-info-card-item">
          <div className="tutor-icon-bubble cyan">
            <HouseIcon size={20} color="#0891b2" />
          </div>
          <div className="tutor-info-content">
            <span className="tutor-info-label">Home Visits</span>
            <span className="tutor-info-value">
              {tutor.homeVisitsEnabled ? 'Available for Home Tuition & Online' : 'Online Only'}
            </span>
          </div>
        </div>

      </div>

      {/* HIGHLIGHT BANNER: FEE, RATING & GOOGLE MAPS LINK */}
      <div className="tutor-summary-banner">
        <div className="tutor-summary-left">
          <div className="tutor-summary-badge">
            <IndianRupeeIcon size={16} color="#059669" />
            <span>Fee: ₹{tutor.fee || 0}/hr</span>
          </div>
          <div className="tutor-summary-badge">
            <StarIcon size={16} color="#f59e0b" fill="#f59e0b" />
            <span>{rating} Rating ({totalReviews} Reviews)</span>
          </div>
        </div>

        <a
          href={mapUrl}
          className="tutor-gmaps-link"
        >
          <MapPinnedIcon size={16} color="currentColor" /> View Location on Google Maps
        </a>
      </div>

      {/* ABOUT BIOGRAPHY CARD */}
      <div className="tutor-about-card">
        <h3 className="tutor-about-title">
          <UserIcon size={18} color="var(--accent, #f59e0b)" /> About:
        </h3>
        <p className="tutor-about-text">
          {tutor.about || 'No detailed biography provided.'}
        </p>
      </div>

      {/* BOOKING CTA BUTTONS */}
      <div className="tutor-booking-cta-area" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="tutor-book-btn"
          onClick={onRegularClick}
          style={{ flex: 1, background: '#0284c7', borderColor: '#0284c7' }}
        >
          <GraduationCapIcon size={18} color="#ffffff" /> Book Regular Class (Payment First)
        </button>

        {isDemoUsed ? (
          <button
            type="button"
            id="bookTutorBtn"
            className="tutor-book-btn"
            disabled
            style={{ flex: 1, opacity: 0.65, cursor: 'not-allowed', background: '#f1f5f9', color: '#64748b', borderColor: '#cbd5e1' }}
            title="You have already attended a demo class with this tutor. You can book Regular Classes instead."
          >
            <CalendarDaysIcon size={18} color="#64748b" /> Demo Completed
          </button>
        ) : (
          <button
            type="button"
            id="bookTutorBtn"
            className="tutor-book-btn"
            onClick={onBookClick}
            style={{ flex: 1 }}
          >
            <CalendarDaysIcon size={18} color="#f59e0b" /> Book Demo Class
          </button>
        )}
      </div>
    </div>
  );
};
