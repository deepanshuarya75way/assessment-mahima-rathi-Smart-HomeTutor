import React from 'react';
import { Link } from 'react-router-dom';

export const FeaturedTutors = () => {
  const tutors = [
    {
      name: 'Harshit Sharma',
      img: '/images/tutor3.jpeg',
      category: 'Chemistry & Physics',
      rating: '4.8 (120+ reviews)',
      description: 'Turning theories into real-world understanding with clear explanations, practical examples, and engaging lessons.',
      price: '₹500',
    },
    {
      name: 'Anjali Malik',
      img: '/images/female.jpeg',
      category: 'General Science',
      rating: '5.0 (95+ reviews)',
      description: 'Making complex concepts simple, practical, and easy to understand. Helping students build strong fundamentals.',
      price: '₹450',
    },
    {
      name: 'Rosy',
      img: '/images/Rosy.jpg',
      category: 'English Literature',
      rating: '5.0 (150+ reviews)',
      description: 'Making language learning simple, engaging, and effective. Helping students improve grammar and communication.',
      price: '₹600',
    },
    {
      name: 'Ashish',
      img: '/images/tutor2.jpg',
      category: 'Mathematics',
      rating: '4.9 (110+ reviews)',
      description: 'Making numbers and complex concepts simple, clear, and engaging. Helping students strengthen fundamentals.',
      price: '₹550',
    },
  ];

  return (
    <section className="tutors">
      <div className="container">
        <div className="section-title" style={{ marginBottom: '40px' }}>
          <span className="section-tag">EXPERT TUTORS</span>
          <h2>Featured Tutors & Courses</h2>
          <p>Highly rated professionals ready to start immediately.</p>
        </div>

        <div className="tutor-grid">
          {tutors.map((tutor, idx) => (
            <div key={idx} className="featured-tutor-card">
              <div className="hero-image">
                <img src={tutor.img} alt={tutor.name} />
                <div className="tutor-category-pill">{tutor.category}</div>
              </div>
              <div className="content">
                <h3 className="card-title">{tutor.name}</h3>
                <div className="card-metadata">
                  <span><i className="fa-solid fa-star"></i> {tutor.rating}</span>
                </div>
                <p className="card-description">{tutor.description}</p>
                <div className="tutor-card-footer">
                  <div className="tutor-price">
                    <span className="price-val">{tutor.price}</span>
                    <span className="price-unit">/hr</span>
                  </div>
                  <Link to="/find" className="read-more-link">
                    Book Trial <i className="fa-solid fa-chevron-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
