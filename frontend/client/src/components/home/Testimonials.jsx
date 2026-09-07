import React, { useRef, useEffect } from 'react';

export const Testimonials = () => {
  const trackRef = useRef(null);
  const posRef = useRef(0);
  const isPausedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const animFrameRef = useRef(null);
  const resumeTimeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Parent',
      text: '"Smart HomeTutor helped my daughter find the right tutor within days. Her confidence and performance have improved so much."',
      img: '/images/parent1.jpg',
      fallbackColor: 'D97706',
      fallbackBg: 'FEF3C7',
    },
    {
      name: 'Aarav Mehta',
      role: 'Student',
      text: '"The tutor matching process was simple, and the classes are well structured. I finally enjoy studying Mathematics."',
      img: '/images/parent2.jpg',
      fallbackColor: '213547',
      fallbackBg: 'E8EEF5',
    },
    {
      name: 'Dr. Sunita Rao',
      role: 'School Coordinator',
      text: '"As an educator, I highly recommend Smart HomeTutor. Their verified tutors are thoroughly background-checked, punctual, and skilled."',
      img: '/images/Rosy.jpg',
      fallbackColor: 'D97706',
      fallbackBg: 'FEF3C7',
    },
    {
      name: 'Rajesh Varma',
      role: 'Parent',
      text: '"We needed an urgent JEE Advanced tutor for our son. The platform connected us with an IITian tutor who made complex concepts intuitive."',
      img: '/images/tutor2.jpg',
      fallbackColor: '213547',
      fallbackBg: 'E8EEF5',
    },
    {
      name: 'Ananya Gupta',
      role: 'Student',
      text: '"My English tutor helped me speak fluently and improve my creative writing skills. The 1-on-1 personalized attention made all the difference."',
      img: '/images/female.jpeg',
      fallbackColor: 'D97706',
      fallbackBg: 'FEF3C7',
    },
    {
      name: 'Vikramaditya Sen',
      role: 'Teacher',
      text: '"Teaching through Smart HomeTutor has been a smooth and rewarding experience. The platform handles scheduling and communication effortlessly."',
      img: '/images/tutor3.jpeg',
      fallbackColor: '213547',
      fallbackBg: 'E8EEF5',
    },
  ];

  // Tripled array for seamless infinite looping in both left & right directions
  const allCards = [...testimonials, ...testimonials, ...testimonials];

  const ITEM_STEP = 384; // 360px card width + 24px gap
  const SINGLE_SET_WIDTH = testimonials.length * ITEM_STEP; // 2304px
  const BASE_OFFSET = SINGLE_SET_WIDTH; // Start at middle set offset (2304px)

  useEffect(() => {
    posRef.current = BASE_OFFSET;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${posRef.current}px)`;
    }

    let lastTime = performance.now();

    const animate = (now) => {
      const delta = now - lastTime;
      lastTime = now;

      if (!isPausedRef.current && !isTransitioningRef.current && trackRef.current) {
        const speed = (35 * delta) / 1000; // ~35px/s continuous scroll
        posRef.current += speed;

        if (posRef.current >= SINGLE_SET_WIDTH * 2) {
          posRef.current -= SINGLE_SET_WIDTH;
        } else if (posRef.current < SINGLE_SET_WIDTH) {
          posRef.current += SINGLE_SET_WIDTH;
        }

        trackRef.current.style.transform = `translateX(-${posRef.current}px)`;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [SINGLE_SET_WIDTH, BASE_OFFSET]);

  const shiftTrack = (direction) => {
    if (!trackRef.current) return;

    isPausedRef.current = true;
    isTransitioningRef.current = true;

    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    // 'left' -> move towards left card (show previous card) => offset decreases
    // 'right' -> move towards right card (show next card) => offset increases
    const delta = direction === 'left' ? -ITEM_STEP : ITEM_STEP;
    posRef.current += delta;

    trackRef.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
    trackRef.current.style.transform = `translateX(-${posRef.current}px)`;

    transitionTimeoutRef.current = setTimeout(() => {
      if (!trackRef.current) return;

      trackRef.current.style.transition = 'none';

      // Keep posRef cleanly within [SINGLE_SET_WIDTH, SINGLE_SET_WIDTH * 2]
      while (posRef.current >= SINGLE_SET_WIDTH * 2) {
        posRef.current -= SINGLE_SET_WIDTH;
      }
      while (posRef.current < SINGLE_SET_WIDTH) {
        posRef.current += SINGLE_SET_WIDTH;
      }
      trackRef.current.style.transform = `translateX(-${posRef.current}px)`;

      isTransitioningRef.current = false;

      // Resume auto marquee after 3 seconds if not hovered
      resumeTimeoutRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 3000);
    }, 400);
  };

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    if (!isTransitioningRef.current) {
      isPausedRef.current = false;
    }
  };

  return (
    <section className="trusted-section" id="reviews">
      <div className="container">
        <div className="trusted-header">
          <span className="section-tag">TESTIMONIALS</span>
          <h2 className="trusted-title">Trusted by Families and Schools Everywhere</h2>
          <p className="trusted-subtitle">Hear from students, parents, and educators who trust Smart HomeTutor.</p>
        </div>
      </div>

      <div
        className="testimonial-marquee-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="testimonial-marquee-track" ref={trackRef} id="testimonialMarqueeTrack">
          {allCards.map((item, idx) => (
            <div key={idx} className="testimonial-marquee-card">
              <div className="card-header-row">
                <div className="stars">
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                  <i className="fa-solid fa-star"></i>
                </div>
                <i className="fa-solid fa-quote-right quote-mark"></i>
              </div>

              <p className="card-review-text">{item.text}</p>

              <div className="card-profile-row">
                <img
                  src={item.img}
                  alt={item.name}
                  className="card-avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=${item.fallbackBg}&color=${item.fallbackColor}`;
                  }}
                />
                <div className="card-profile-info">
                  <h4>{item.name}</h4>
                  <span>{item.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="marquee-controls">
        <button
          type="button"
          className="marquee-ctrl-btn"
          onClick={() => shiftTrack('left')}
          aria-label="Previous Testimonial"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <button
          type="button"
          className="marquee-ctrl-btn"
          onClick={() => shiftTrack('right')}
          aria-label="Next Testimonial"
        >
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </section>
  );
};
