import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRoutes() {
  const vite = await createServer({
    configFile: path.resolve(__dirname, '../frontend/vite.config.js'),
    server: { middlewareMode: true }
  });

  try {
    global.window = {
      location: { search: '', pathname: '/', href: '' },
      history: { state: null, pushState: () => {}, replaceState: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      scrollTo: () => {},
      __INITIAL_DATA__: { isAuth: false, userRole: null, userName: null }
    };
    global.document = {
      querySelectorAll: () => [],
      getElementById: () => null,
      createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
      head: { appendChild: () => {} }
    };
    global.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    const pages = [
      { name: 'HomePage', path: '../frontend/client/src/pages/public/HomePage.jsx' },
      { name: 'About', path: '../frontend/client/src/pages/public/About.jsx' },
      { name: 'PrivacyPolicy', path: '../frontend/client/src/pages/public/PrivacyPolicy.jsx' },
      { name: 'TermsOfService', path: '../frontend/client/src/pages/public/TermsOfService.jsx' },
      { name: 'BlogDetailsPage', path: '../frontend/client/src/pages/public/BlogDetailsPage.jsx' },
      { name: 'BlogsPage', path: '../frontend/client/src/pages/public/BlogsPage.jsx' },
      { name: 'FindTutorsPage', path: '../frontend/client/src/pages/public/FindTutorsPage.jsx' },
      { name: 'Contact', path: '../frontend/client/src/pages/public/Contact.jsx' },
      { name: 'SubjectsPage', path: '../frontend/client/src/pages/public/SubjectsPage.jsx' },
      { name: 'SubjectDetailPage', path: '../frontend/client/src/pages/public/SubjectDetailPage.jsx' },
      { name: 'BecomeTutorPage', path: '../frontend/client/src/pages/public/BecomeTutorPage.jsx' },
      { name: 'TutorProfile', path: '../frontend/client/src/pages/public/TutorProfile.jsx' },
      { name: 'LoginPage', path: '../frontend/client/src/pages/public/LoginPage.jsx' },
      { name: 'SignupPage', path: '../frontend/client/src/pages/public/SignupPage.jsx' },
      { name: 'ForgotPassword', path: '../frontend/client/src/pages/auth/ForgotPassword.jsx' },
      { name: 'VerifyOtp', path: '../frontend/client/src/pages/auth/VerifyOtp.jsx' },
      { name: 'VideoCall', path: '../frontend/client/src/pages/video/VideoCall.jsx' },
      { name: 'StudentDashboardPage', path: '../frontend/client/src/pages/student/StudentDashboardPage.jsx' },
      { name: 'TutorDashboardPage', path: '../frontend/client/src/pages/tutor/TutorDashboardPage.jsx' },
      { name: 'AdminDashboardPage', path: '../frontend/client/src/pages/admin/AdminDashboardPage.jsx' },
      { name: 'ParentDashboard', path: '../frontend/client/src/pages/dashboards/ParentDashboard.jsx' },
    ];

    console.log('\n--- TESTING INDIVIDUAL PAGE RENDERING ---');
    for (const page of pages) {
      try {
        const mod = await vite.ssrLoadModule(path.resolve(__dirname, page.path));
        const Comp = mod[page.name] || mod.default;
        if (!Comp) {
          console.error(`[FAIL] ${page.name}: Component is undefined! Exports:`, Object.keys(mod));
          continue;
        }
        const html = ReactDOMServer.renderToString(
          React.createElement(MemoryRouter, null, React.createElement(Comp))
        );
        console.log(`[PASS] Page ${page.name} rendered successfully (${html.length} chars)`);
      } catch (err) {
        console.error(`[FAIL] Page ${page.name} CRASHED:`, err.message || err);
      }
    }

  } catch (err) {
    console.error('Fatal error in route rendering test:', err);
  } finally {
    await vite.close();
  }
}

testRoutes();
