import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { TutorProfileHeader } from '../../components/tutor/TutorProfileHeader';
import { TutorAbout } from '../../components/tutor/TutorAbout';
import { TutorReviews } from '../../components/tutor/TutorReviews';
import { TutorBookingModal } from '../../components/tutor/TutorBookingModal';
import { RegularClassPaymentModal } from '../../components/tutor/RegularClassPaymentModal';
import { ArrowLeftIcon, SpinnerIcon, UserIcon } from '../../components/common/ReactIcons';
import { isDemoCompletedForTutor } from '../../utils/demoEligibility';
import '../../styles/tutor-profile.css';

export const TutorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [completedDemoTutorIds, setCompletedDemoTutorIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isRegularModalOpen, setIsRegularModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (id) {
      fetchTutorDetails(id);
    }
  }, [id]);

  const fetchTutorDetails = async (tutorId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [res, demoRes] = await Promise.all([
        fetch(`/api/tutor/details/${tutorId}`),
        fetch('/api/student/completed-demo-tutors').catch(() => null),
      ]);

      const data = await res.json();

      if (res.ok && data.success && data.tutor) {
        setTutor(data.tutor);
        setReviews(data.reviews || []);
      } else {
        setErrorMsg(data.message || 'Tutor Profile Not Found.');
      }

      if (demoRes && demoRes.ok) {
        const demoData = await demoRes.json();
        if (demoData.success && demoData.completedDemoTutorIds) {
          setCompletedDemoTutorIds(demoData.completedDemoTutorIds);
        }
      }
    } catch (err) {
      console.error('Fetch Tutor Details Error:', err);
      setErrorMsg('Network error. Unable to load tutor profile.');
    } finally {
      setLoading(false);
    }
  };

  const tutorName = tutor ? (tutor.fullName || (tutor.user ? tutor.user.name : 'Tutor Profile')) : 'Tutor Profile';
  const isDemoUsed = isDemoCompletedForTutor(tutor || { _id: id }, completedDemoTutorIds);

  return (
    <div className="tutor-profile-page-bg">
      <Header activePage="tutors" />

      <main style={{ flex: 1 }}>
        <div className="tutor-profile-main-container">
          
          {/* BREADCRUMB / BACK LINK */}
          <Link to="/find" className="tutor-back-link">
            <ArrowLeftIcon size={16} color="currentColor" /> Back to All Tutors
          </Link>

          {loading && (
            <div className="tutor-main-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                <SpinnerIcon size={36} color="var(--primary, #213547)" />
              </div>
              <h3 style={{ margin: 0, color: 'var(--primary, #213547)', fontSize: '18px' }}>Loading Educator Profile...</h3>
            </div>
          )}

          {errorMsg && !loading && (
            <div className="tutor-main-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
                <UserIcon size={48} color="#cbd5e1" />
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary, #213547)', fontSize: '20px', fontWeight: 800 }}>Tutor Profile Not Found</h3>
              <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>{errorMsg}</p>
              <button type="button" onClick={() => navigate('/find')} className="tutor-book-btn" style={{ maxWidth: '280px', margin: '0 auto' }}>
                Browse Active Home Tutors
              </button>
            </div>
          )}

          {!loading && !errorMsg && tutor && (
            <div className="tutor-main-card">
              
              {/* TOP HERO HEADER */}
              <TutorProfileHeader tutor={tutor} />

              {/* DETAILS GRID & ABOUT BIOGRAPHY & CTA */}
              <TutorAbout
                tutor={tutor}
                onBookClick={() => setIsBookingModalOpen(true)}
                onRegularClick={() => setIsRegularModalOpen(true)}
                isDemoUsed={isDemoUsed}
              />

              {/* STUDENT REVIEWS */}
              <TutorReviews reviews={reviews} />

            </div>
          )}

        </div>
      </main>

      {/* DEMO BOOKING MODAL */}
      <TutorBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        tutorId={id}
        tutorName={tutorName}
        tutor={tutor}
      />

      {/* REGULAR CLASS PAYMENT & BOOKING MODAL */}
      <RegularClassPaymentModal
        isOpen={isRegularModalOpen}
        onClose={() => setIsRegularModalOpen(false)}
        tutor={{ ...tutor, _id: id }}
      />

      <Footer />
    </div>
  );
};
