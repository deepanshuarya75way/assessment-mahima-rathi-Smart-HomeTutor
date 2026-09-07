import React from 'react';
import { isDemoCompletedForTutor } from '../../../utils/demoEligibility';

export const AIRecommendationsModal = ({ isOpen, onClose, tutors, onBookTutor, completedDemoTutorIds = [] }) => {
  if (!isOpen) return null;

  const topMatches = (tutors || []).slice(0, 3);

  return (
    <div className="tr-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div className="tr-modal-card" style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '28px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '22px', color: '#64748b', cursor: 'pointer' }}
        >
          &times;
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <i className="fa-solid fa-robot" style={{ fontSize: '22px', color: '#0284c7' }}></i>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f2a4a' }}>AI Tutor Recommendations</h3>
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Our AI algorithm analyzed your grade goals, location, and syllabus pace to find your top verified educator matches.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
          {topMatches.length > 0 ? (
            topMatches.map((t, idx) => {
              const isDemoUsed = isDemoCompletedForTutor(t, completedDemoTutorIds);
              return (
                <div key={t._id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                      {t.user && t.user.name ? t.user.name.substring(0, 2).toUpperCase() : 'TU'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', color: '#0f2a4a' }}>{t.user ? t.user.name || 'Verified Tutor' : 'Verified Tutor'}</h4>
                        <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>{98 - idx * 3}% Match</span>
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                        {t.qualification || 'Degree'} &bull; {t.subjects ? t.subjects.slice(0, 3).join(', ') : 'All Subjects'}
                      </p>
                    </div>
                  </div>
                  {isDemoUsed ? (
                    <button
                      type="button"
                      className="dash-btn dash-btn-outline"
                      disabled
                      style={{ fontSize: '12px', padding: '6px 14px', opacity: 0.7, cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b', borderColor: '#cbd5e1' }}
                      title="You have already attended a demo class with this tutor. You can book Regular Classes instead."
                    >
                      Demo Completed
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dash-btn dash-btn-primary"
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => {
                        onClose();
                        if (onBookTutor) onBookTutor(t);
                      }}
                    >
                      Book Demo
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
              No AI tutor recommendations calculated yet. Search tutors in Tab 2 to view all matches!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
