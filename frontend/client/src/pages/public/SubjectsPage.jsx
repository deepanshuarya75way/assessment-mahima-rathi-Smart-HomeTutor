import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/common/Header';
import { Footer } from '../../components/common/Footer';
import { SubjectGrid } from '../../components/subjects/SubjectGrid';

import { adminApi } from '../../services/adminApi';

export const SubjectsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dbSubjects, setDbSubjects] = useState([]);

  useEffect(() => {
    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sb-revealed');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.sb-reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    // Fetch subjects from public API endpoint
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.subjects)) {
          setDbSubjects(data.subjects);
        }
      })
      .catch((err) => console.error('Error fetching public subjects:', err));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const baseSubjects = [
    {
      id: 'c1-5',
      title: 'Classes 1–5',
      badge: 'Primary',
      icon: 'fa-shapes',
      topics: ['English', 'Hindi', 'Mathematics', 'EVS', 'Computer'],
      link: '/find?grade=Class+1-5',
    },
    {
      id: 'c6-8',
      title: 'Classes 6–8',
      badge: 'Middle',
      icon: 'fa-atom',
      topics: ['Mathematics', 'Science', 'Social Science', 'English', 'Hindi'],
      link: '/find?grade=Class+6-8',
    },
    {
      id: 'c9-10',
      title: 'Classes 9–10',
      badge: 'Secondary',
      icon: 'fa-book-bookmark',
      topics: ['Mathematics', 'Science', 'Social Science', 'English', 'Computer'],
      link: '/find?grade=Class+9-10',
    },
    {
      id: 'c11-12-sci',
      title: 'Class 11–12',
      badge: 'Science',
      icon: 'fa-flask',
      topics: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'English'],
      link: '/find?grade=Class+11-12&subject=Physics',
    },
    {
      id: 'c11-12-com',
      title: 'Class 11–12',
      badge: 'Commerce',
      icon: 'fa-briefcase',
      topics: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'Entrepreneurship', 'Informatics Prac.', 'English'],
      link: '/find?grade=Class+11-12&subject=Accounts',
    },
    {
      id: 'c11-12-hum',
      title: 'Class 11–12',
      badge: 'Humanities',
      icon: 'fa-palette',
      topics: ['History', 'Political Science', 'Geography', 'Sociology', 'Psychology', 'Economics', 'English'],
      link: '/find?grade=Class+11-12&subject=History',
    },
  ];

  // Map subjects dynamically added from Admin Catalog & Boards to their class cards
  const matchedDbSubjectIds = new Set();

  const baseWithDynamicSubjects = baseSubjects.map((card) => {
    const matched = dbSubjects.filter((s) => {
      const g = (s.grade || '').toLowerCase();
      const c = (s.category || '').toLowerCase();
      const n = (s.name || '').toLowerCase();

      let isMatch = false;

      if (card.id === 'c1-5') {
        isMatch = g.includes('1-5') || g.includes('1–5') || g.includes('primary') ||
                  ['class 1', 'class 2', 'class 3', 'class 4', 'class 5', 'grade 1', 'grade 2', 'grade 3', 'grade 4', 'grade 5'].some(k => g.includes(k));
      } else if (card.id === 'c6-8') {
        isMatch = g.includes('6-8') || g.includes('6–8') || g.includes('middle') ||
                  ['class 6', 'class 7', 'class 8', 'grade 6', 'grade 7', 'grade 8'].some(k => g.includes(k));
      } else if (card.id === 'c9-10') {
        isMatch = g.includes('9-10') || g.includes('9–10') || g.includes('secondary') ||
                  ['class 9', 'class 10', 'grade 9', 'grade 10'].some(k => g.includes(k));
      } else if (card.id === 'c11-12-sci') {
        isMatch = (g.includes('11') || g.includes('12')) && (c.includes('science') || g.includes('science') || c.includes('cbse') || c.includes('icse'));
      } else if (card.id === 'c11-12-com') {
        isMatch = (g.includes('11') || g.includes('12')) && (c.includes('commerce') || g.includes('commerce') || n.includes('account'));
      } else if (card.id === 'c11-12-hum') {
        isMatch = (g.includes('11') || g.includes('12')) && (c.includes('humanities') || c.includes('arts') || g.includes('humanities'));
      }

      if (isMatch) {
        matchedDbSubjectIds.add(s._id);
      }
      return isMatch;
    });

    const dbTopicObjects = matched.map((s) => ({
      name: s.name,
      category: s.category
    }));

    const existingNames = new Set(card.topics.map(t => typeof t === 'string' ? t.toLowerCase() : t.name.toLowerCase()));
    const newTopics = dbTopicObjects.filter(t => !existingNames.has(t.name.toLowerCase()));

    return {
      ...card,
      topics: [...card.topics, ...newTopics]
    };
  });

  // Include any custom class subjects that don't match the 6 standard cards
  const unassigned = dbSubjects.filter((s) => !matchedDbSubjectIds.has(s._id));
  if (unassigned.length > 0) {
    baseWithDynamicSubjects.push({
      id: 'custom-catalog-subjects',
      title: 'Specialized & Test Prep',
      badge: 'Advanced',
      icon: 'fa-award',
      topics: unassigned.map((s) => ({ name: s.name, category: s.category })),
      link: '/find'
    });
  }

  const allSubjects = baseWithDynamicSubjects;

  // Controlled live search filter
  const filteredSubjects = allSubjects.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const titleMatch = item.title.toLowerCase().includes(q);
    const badgeMatch = item.badge.toLowerCase().includes(q);
    const topicsMatch = item.topics.some((t) => {
      const topicName = typeof t === 'string' ? t : t.name;
      const topicCat = typeof t === 'object' && t.category ? t.category : '';
      return topicName.toLowerCase().includes(q) || topicCat.toLowerCase().includes(q);
    });
    return titleMatch || badgeMatch || topicsMatch;
  });

  const whyFeatures = [
    {
      icon: 'fa-circle-check',
      title: 'Verified Tutors',
      desc: 'Every tutor is background-verified to ensure a safe and reliable learning experience.',
    },
    {
      icon: 'fa-clock',
      title: 'Flexible Timings',
      desc: 'Schedule classes according to your preferred time and convenience.',
    },
    {
      icon: 'fa-wallet',
      title: 'Affordable Fees',
      desc: 'High-quality personalized education at budget-friendly hourly rates.',
    },
    {
      icon: 'fa-user-graduate',
      title: '1-on-1 Learning',
      desc: 'Personalized sessions focused 100% on individual student growth and progress.',
    },
    {
      icon: 'fa-laptop',
      title: 'Online & In-Home',
      desc: 'Learn from anywhere with flexible online or home tutoring sessions.',
    },
  ];

  return (
    <div className="sb-page-root">
      <Header activePage="subjects" />

      {/* HERO / PAGE HEADER */}
      <section className="sb-hero-header-section sb-reveal-on-scroll">
        <div className="container text-center">
          <span className="sb-hero-badge">
            <i className="fa-solid fa-graduation-cap"></i> CLASS 1 TO CLASS 12 LEARNING PATHS
          </span>
          <h1>Explore Our Classes & Subjects</h1>
          <p className="sb-hero-subtitle">
            Discover verified home and online tutors across primary, middle, secondary, and stream-specialized senior secondary subjects.
          </p>
        </div>
      </section>

      {/* SEARCH SECTION */}
      <section className="sb-search-section sb-reveal-on-scroll">
        <div className="container">
          <div className="sb-subject-search-wrapper">
            <i className="fa-solid fa-magnifying-glass sb-search-icon"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject or class (e.g. Physics, Accountancy, History, Class 10)..."
            />
          </div>
        </div>
      </section>

      {/* SUBJECTS & CLASSES GRID SECTION */}
      <section className="sb-subjects sb-reveal-on-scroll">
        <div className="container">
          <div className="sb-section-title-wrapper text-center">
            <h2>Explore Our Classes</h2>
            <p>Select your class group to view available subjects and find specialized tutors for Class 1 to Class 12</p>
          </div>

          <SubjectGrid subjects={filteredSubjects} />
        </div>
      </section>

      {/* WHY CHOOSE OUR TUTORS SECTION */}
      <section className="sb-why sb-reveal-on-scroll">
        <div className="container">
          <div className="sb-section-title text-center">
            <h2>Why Choose Our Tutors?</h2>
            <p>Experience quality education with trusted tutors and personalized learning.</p>
          </div>

          <div className="sb-features">
            {whyFeatures.map((feat, idx) => (
              <div key={idx} className="sb-feature-card">
                <div className="sb-feature-icon">
                  <i className={`fa-solid ${feat.icon}`}></i>
                </div>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="sb-cta sb-reveal-on-scroll">
        <div className="container text-center">
          <h2>Can't Find Your Subject?</h2>
          <p>
            We have expert tutors available for more than <b>100+ subjects & grade levels.</b>
          </p>
          <Link to="/find" className="btn sb-cta-btn">
            Find Your Tutor <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};
