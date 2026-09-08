import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/public/HomePage';
import { About } from './pages/public/About';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsOfService } from './pages/public/TermsOfService';
import { BlogDetailsPage } from './pages/public/BlogDetailsPage';
import { BlogsPage } from './pages/public/BlogsPage';
import { FindTutorsPage } from './pages/public/FindTutorsPage';
import { Contact } from './pages/public/Contact';
import { SubjectsPage } from './pages/public/SubjectsPage';
import { SubjectDetailPage } from './pages/public/SubjectDetailPage';
import { BecomeTutorPage } from './pages/public/BecomeTutorPage';
import { TutorProfile } from './pages/public/TutorProfile';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerifyOtp } from './pages/auth/VerifyOtp';
import { VideoCall } from './pages/video/VideoCall';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { TutorDashboardPage } from './pages/tutor/TutorDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { ParentDashboard } from './pages/dashboards/ParentDashboard';
import { BroadcastAnnouncementListener } from './components/common/BroadcastAnnouncementListener';
import { SocketCallListener } from './components/home/SocketCallListener';
import { CustomPopup } from './components/common/CustomPopup';

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <CustomPopup />
        <BroadcastAnnouncementListener />
        <SocketCallListener />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/find" element={<FindTutorsPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/subjects/:subjectSlug" element={<SubjectDetailPage />} />
          <Route path="/tutor" element={<BecomeTutorPage />} />
          <Route path="/tutor/:id" element={<TutorProfile />} />
          <Route path="/become-a-tutor" element={<BecomeTutorPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin-panel" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/video-call" element={<VideoCall />} />
          <Route path="/video-call/:bookingId" element={<VideoCall />} />
          <Route path="/dashboard/student" element={<StudentDashboardPage />} />
          <Route path="/student-dashboard" element={<StudentDashboardPage />} />
          <Route path="/dashboard/tutor" element={<TutorDashboardPage />} />
          <Route path="/tutor-dashboard" element={<TutorDashboardPage />} />
          <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
          <Route path="/dashboard/parent" element={<ParentDashboard />} />
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
          <Route path="/blogs" element={<BlogsPage />} />
          <Route path="/blog/:idOrSlug" element={<BlogDetailsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
