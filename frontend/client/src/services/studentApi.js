/**
 * Centralized API Service for Student Dashboard Operations
 */

export const studentApi = {
  // Fetch Authenticated Student User Profile
  getProfile: async () => {
    const res = await fetch('/api/student/profile');
    return await res.json();
  },

  // Fetch Dashboard Stats & Aggregates
  getDashboardStats: async () => {
    const res = await fetch('/api/student/dashboard-stats');
    return await res.json();
  },

  // Fetch All Tutors with Filters & GPS coordinates
  getTutors: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.subject && filters.subject !== 'all') queryParams.append('subject', filters.subject);
    if (filters.board && filters.board !== 'all') queryParams.append('board', filters.board);
    if (filters.grade && filters.grade !== 'all') queryParams.append('class', filters.grade);
    if (filters.feeMax) queryParams.append('fee', filters.feeMax);
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.location) queryParams.append('location', filters.location);
    if (filters.lat !== null && filters.lat !== undefined && filters.lat !== '') queryParams.append('lat', filters.lat);
    if (filters.lng !== null && filters.lng !== undefined && filters.lng !== '') queryParams.append('lng', filters.lng);
    if (filters.radius && filters.radius !== 'all') queryParams.append('radius', filters.radius);

    const res = await fetch(`/api/tutor/all?${queryParams.toString()}`);
    return await res.json();
  },

  // Book Demo Class or Tuition
  bookTutor: async (payload) => {
    const res = await fetch('/api/student/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Fetch Student Bookings
  getBookings: async () => {
    const res = await fetch('/api/student/bookings');
    return await res.json();
  },

  // Cancel Booking
  cancelBooking: async (bookingId) => {
    const res = await fetch(`/api/student/booking/${bookingId}/cancel`, {
      method: 'PUT',
    });
    return await res.json();
  },

  // Toggle Favorite Tutor
  toggleFavorite: async (tutorProfileId) => {
    const res = await fetch(`/api/student/favorite/${tutorProfileId}`, {
      method: 'POST',
    });
    return await res.json();
  },

  // Wallet Top-up
  topupWallet: async (amount) => {
    const res = await fetch('/api/student/wallet/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    return await res.json();
  },

  // Submit Review & Rating
  addReview: async (payload) => {
    const res = await fetch('/api/student/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Get Existing Review for a Tutor
  getReviewForTutor: async (tutorProfileId) => {
    const res = await fetch(`/api/student/review/${tutorProfileId}`);
    return await res.json();
  },

  // Fetch Study Materials & Notes
  getStudyMaterials: async () => {
    const res = await fetch('/api/student/study-materials');
    return await res.json();
  },

  // Get Assigned Tutors
  getMyTutors: async () => {
    const res = await fetch('/api/student/my-tutors');
    return await res.json();
  },

  // Get Completed Demo Tutor IDs
  getCompletedDemoTutors: async () => {
    try {
      const res = await fetch('/api/student/completed-demo-tutors');
      return await res.json();
    } catch (err) {
      console.error('getCompletedDemoTutors error:', err);
      return { success: false, completedDemoTutorIds: [] };
    }
  },

  // Get Pending Demo Tutor IDs
  getPendingDemoTutors: async () => {
    try {
      const res = await fetch('/api/student/pending-demo-tutors');
      return await res.json();
    } catch (err) {
      console.error('getPendingDemoTutors error:', err);
      return { success: false, pendingDemoTutorIds: [] };
    }
  },

  // Get Demo Statuses Map for Tutors
  getDemoStatuses: async () => {
    try {
      const res = await fetch('/api/student/demo-statuses');
      return await res.json();
    } catch (err) {
      console.error('getDemoStatuses error:', err);
      return { success: false, demoStatusMap: {} };
    }
  },

  // Get Tutor Fee Summary
  getTutorFeeSummary: async (tutorId) => {
    const res = await fetch(`/api/student/tutor-fee-summary?tutorId=${tutorId}`);
    return await res.json();
  },

  // Submit Recipient-Specific Homework
  submitHomework: async (formData) => {
    const res = await fetch('/api/student/submit-homework', {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  },

  // Get Submitted Homework History
  getSubmittedHomework: async () => {
    const res = await fetch('/api/student/submitted-homework');
    return await res.json();
  },

  // Fetch Certificates
  getCertificates: async () => {
    const res = await fetch('/api/student/certificates');
    return await res.json();
  },

  // Fetch Referrals History
  getReferrals: async () => {
    const res = await fetch('/api/student/referrals');
    return await res.json();
  },

  // Fetch Class Schedule
  getClassSchedule: async () => {
    const res = await fetch('/api/student/class-schedule');
    return await res.json();
  },

  // Payment Methods
  createPaymentOrder: async (payload) => {
    const res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  verifyPayment: async (payload) => {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  payWithWallet: async (payload) => {
    const res = await fetch('/api/payment/pay-with-wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  recordPaymentFail: async (payload) => {
    const res = await fetch('/api/payment/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  recordPaymentCancel: async (payload) => {
    const res = await fetch('/api/payment/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  getPaymentHistory: async () => {
    const res = await fetch('/api/payment/history');
    return await res.json();
  },

  // Update Profile
  updateProfile: async (payload) => {
    const res = await fetch('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Change Password
  changePassword: async (payload) => {
    const res = await fetch('/api/student/change-password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Get Discontinue Class Preview & Fee/Refund Calculation
  getDiscontinuePreview: async (tutorId) => {
    const res = await fetch(`/api/student/discontinue-preview?tutorId=${tutorId}`);
    return await res.json();
  },

  // Discontinue Regular Classes with Selected Tutor
  discontinueClass: async (payload) => {
    const res = await fetch('/api/student/discontinue-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  // Discontinue Account / Legacy support
  discontinueAccount: async (payload) => {
    const res = await fetch('/api/student/discontinue-class', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },
};
