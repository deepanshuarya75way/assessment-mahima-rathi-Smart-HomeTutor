import React from 'react';
import { Link } from 'react-router-dom';

export const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      icon: 'fa-magnifying-glass',
      title: '1. Search Tutors',
      description: 'Filter by subject, grade, location, and fee structure to find matching tutors.',
    },
    {
      number: '02',
      icon: 'fa-id-card',
      title: '2. View Profiles',
      description: 'Check qualifications, reviews, ratings, and experience of verified tutors.',
    },
    {
      number: '03',
      icon: 'fa-calendar-check',
      title: '3. Book Free Trial',
      description: 'Schedule a trial session at your preferred date and time to find the perfect match.',
    },
    {
      number: '04',
      icon: 'fa-graduation-cap',
      title: '4. Start Learning',
      description: 'Begin home or online classes with expert 1-on-1 personalized guidance.',
    },
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="container">
        <div className="section-title">
          <span className="section-tag">HOW IT WORKS</span>
          <h2>Simple Steps to Start Learning</h2>
          <p>
            Finding the right tutor is quick and easy. Follow these simple steps to begin your personalized learning journey.
          </p>
        </div>

        <div className="work-container">
          {steps.map((step, idx) => (
            <div key={idx} className="work-card">
              <div className="step-number">{step.number}</div>
              <div className="icon">
                <i className={`fa-solid ${step.icon}`}></i>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>

        <div className="work-btn">
          <Link to="/find" className="start-btn">
            Find Your Tutor <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>
      </div>
    </section>
  );
};
