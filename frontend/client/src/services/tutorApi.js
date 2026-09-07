/**
 * Tutor Dashboard Centralized API Service
 */

export const tutorApi = {
  // Fetch logged-in tutor profile
  async getTutorProfile() {
    const res = await fetch('/api/tutor/profile', {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Save / Create tutor profile
  async saveTutorProfile(profileData) {
    const res = await fetch('/api/tutor/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // Update existing tutor profile (PUT)
  async updateTutorProfile(profileData) {
    const res = await fetch('/api/tutor/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(profileData)
    });
    return res.json();
  },

  // Fetch tutor dashboard stats, earnings, schedule, requests & reviews
  async getDashboardStats() {
    const res = await fetch('/api/tutor/dashboard-stats', {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Fetch tutor booking requests
  async getBookingRequests() {
    const res = await fetch('/api/tutor/booking-requests', {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Accept a student booking request
  async acceptBookingRequest(requestId) {
    const res = await fetch(`/api/tutor/booking-request/${requestId}/accept`, {
      method: 'PUT',
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Reject a student booking request
  async rejectBookingRequest(requestId) {
    const res = await fetch(`/api/tutor/booking-request/${requestId}/reject`, {
      method: 'PUT',
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Request payout
  async requestPayout(amount, upiId) {
    const res = await fetch('/api/tutor/payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ amount, upiId })
    });
    return res.json();
  },

  // Request course completion certificate
  async requestCertificate(data) {
    const res = await fetch('/api/tutor/request-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Fetch logged-in tutor referral data & history
  async getReferrals() {
    const res = await fetch('/api/tutor/referrals', {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  },

  // Fetch teaching schedules (regular or demo)
  async getSchedules(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `/api/schedule/list${query ? `?${query}` : ''}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    return res.json();
  }
};

