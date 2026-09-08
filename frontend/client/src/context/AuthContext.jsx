import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  isAuth: false,
  userRole: null,
  userName: null,
  userEmail: null,
  userId: null,
  isSuperAdmin: false,
  fullAccess: false,
  manageAccess: false,
  permissions: [],
  adminRoleName: null,
});

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuth: false,
    userRole: null,
    userName: null,
    userEmail: null,
    userId: null,
    isSuperAdmin: false,
    fullAccess: false,
    manageAccess: false,
    permissions: [],
    adminRoleName: null,
    loading: true,
  });

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.user) {
          const isSuper = Boolean(data.user.isSuperAdmin || data.user.email === 'useradmin2005@gmail.com');
          setAuthState({
            isAuth: true,
            userRole: data.user.role,
            userName: data.user.name || data.user.email?.split('@')[0],
            userEmail: data.user.email,
            userId: data.user.id || data.user._id,
            isSuperAdmin: isSuper,
            fullAccess: isSuper ? true : Boolean(data.user.fullAccess),
            manageAccess: isSuper,
            permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
            adminRoleName: data.user.adminRoleName || null,
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
