import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  isAuth: false,
  userRole: null,
  userName: null,
  userEmail: null,
  userId: null,
});

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuth: false,
    userRole: null,
    userName: null,
    userEmail: null,
    userId: null,
    loading: true,
  });

  const checkAuth = async () => {
    // 1. Check window.__INITIAL_DATA__ if available
    if (window.__INITIAL_DATA__ && window.__INITIAL_DATA__.userId) {
      setAuthState({
        isAuth: Boolean(window.__INITIAL_DATA__.isAuth),
        userRole: window.__INITIAL_DATA__.userRole || null,
        userName: window.__INITIAL_DATA__.userName || null,
        userEmail: window.__INITIAL_DATA__.userEmail || null,
        userId: window.__INITIAL_DATA__.userId || null,
        loading: false,
      });
      return;
    }

    // 2. Fetch /api/auth/me to verify cookie/token session
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.user) {
          setAuthState({
            isAuth: true,
            userRole: data.user.role,
            userName: data.user.name || data.user.email?.split('@')[0],
            userEmail: data.user.email,
            userId: data.user.id || data.user._id,
            loading: false,
          });
          return;
        }
      }
      setAuthState((prev) => ({ ...prev, loading: false }));
    } catch (err) {
      console.warn('Auth check error:', err);
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => useContext(AuthContext);
