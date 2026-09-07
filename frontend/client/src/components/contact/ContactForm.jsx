import React, { useState } from 'react';

export const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    email: '',
    state: '',
    city: '',
    enquiryType: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const indianStates = [
    'Uttarakhand',
    'Delhi',
    'Maharashtra',
    'Karnataka',
    'Uttar Pradesh',
    'Haryana',
    'Punjab',
    'Rajasthan',
    'Gujarat',
    'Madhya Pradesh',
    'West Bengal',
    'Tamil Nadu',
    'Telangana',
    'Other State',
  ];

  const enquiryTypes = [
    'Home Tuition Requirement',
    'Online Tuition Enquiry',
    'Tutor Registration & Onboarding',
    'Parent & Student Mentorship',
    'Fee Structure & Trial Class',
    'Other General Enquiry',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const { name, contactNumber, email, state, city, enquiryType, message } = formData;

    if (!name.trim() || !email.trim() || !contactNumber.trim() || !message.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please fill in all required fields (Name, Contact Number, Email, and Message).',
      });
      return;
    }

    try {
      setLoading(true);

      // Split name into firstName and lastName for backend compatibility
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const subjectText = enquiryType ? `[${enquiryType}] - ${state}` : 'General Inquiry';
      const fullMessage = `Contact Number: ${contactNumber}\nLocation: ${city ? `${city}, ` : ''}${state}\nEnquiry Type: ${enquiryType || 'General'}\n\nMessage:\n${message}`;

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim(),
          subject: subjectText,
          message: fullMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedback({
          type: 'success',
          message: 'Your message has been sent successfully! Our team will get back to you soon.',
        });
        setFormData({
          name: '',
          contactNumber: '',
          email: '',
          state: '',
          city: '',
          enquiryType: '',
          message: '',
        });
      } else {
        setFeedback({
          type: 'error',
          message: (data.message || 'Failed to submit enquiry. Please try again.'),
        });
      }
    } catch (err) {
      console.error('Contact submit error:', err);
      setFeedback({
        type: 'error',
        message: 'An error occurred while sending message. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-form-card">
      <h2 className="ct-form-title">Send Us a Message</h2>

      {feedback && (
        <div className={`ct-feedback-alert ${feedback.type}`}>
          <i className={feedback.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ct-form">
        <div className="ct-form-group">
          <label className="ct-label">
            Name <span className="req">*</span>
          </label>
          <input
            type="text"
            name="name"
            className="ct-input"
            placeholder="Enter Your Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="ct-form-group">
          <label className="ct-label">
            Contact <span className="req">*</span>
          </label>
          <input
            type="tel"
            name="contactNumber"
            className="ct-input"
            placeholder="Enter Your Contact Number"
            value={formData.contactNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="ct-form-group">
          <label className="ct-label">
            Email <span className="req">*</span>
          </label>
          <input
            type="email"
            name="email"
            className="ct-input"
            placeholder="Enter Your Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="ct-form-row">
          <div className="ct-form-group flex-1">
            <label className="ct-label">
              State <span className="req">*</span>
            </label>
            <select
              name="state"
              className="ct-select"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="">Select a state</option>
              {indianStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="ct-form-group flex-1">
            <label className="ct-label">
              City <span className="req">*</span>
            </label>
            <input
              type="text"
              name="city"
              className="ct-input"
              placeholder="Enter Your City"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="ct-form-group">
          <label className="ct-label">
            Enquiry Type <span className="req">*</span>
          </label>
          <select
            name="enquiryType"
            className="ct-select"
            value={formData.enquiryType}
            onChange={handleChange}
            required
          >
            <option value="">Select Enquiry Type</option>
            {enquiryTypes.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>

        <div className="ct-form-group">
          <label className="ct-label">
            Enquiry Details <span className="req">*</span>
          </label>
          <textarea
            name="message"
            className="ct-textarea"
            rows="5"
            placeholder="Your requirement / Write your message..."
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>
        </div>

        <button type="submit" className="ct-submit-btn" disabled={loading}>
          {loading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i> Submitting...
            </>
          ) : (
            'Submit Enquiry'
          )}
        </button>
      </form>
    </div>
  );
};
