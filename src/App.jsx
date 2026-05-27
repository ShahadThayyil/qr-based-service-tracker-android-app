import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import PullToRefresh from 'react-simple-pull-to-refresh';

// 🔥 FIREBASE AUTH IMPORTS
import { auth } from './firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Components
import AdminLayout from './components/AdminLayout';
import TechLayout from './components/TechLayout';

// Admin Pages
import Login from './pages/app/login';
import AdminDashboard from './pages/app/AdminDashboard';
import AdminServices from './pages/app/AdminServices';
import AdminNewIntake from './pages/app/AdminNewIntake';
import AdminQRGenerator from './pages/app/AdminQRGenerator';
import AdminTechnicians from './pages/app/AdminTechnicians';
import AdminServiceDetail from './pages/app/AdminServiceDetail';

// Technician Pages
import TechDashboard from './pages/tech/TechDashboard';
import TechTasks from './pages/tech/TechTasks';
import TechScanner from './pages/tech/TechScanner';
import TechTaskDetail from './pages/tech/TechTaskDetail';
import TechProfile from './pages/tech/TechProfile';

// --- ANIMATION WRAPPER ---
const PageWrapper = ({ children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="w-full h-full min-h-screen bg-[#FAFAFA]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// --- 🔥 PULL TO REFRESH WRAPPER 🔥 ---
const RefreshWrapper = ({ children }) => {

  const handleRefresh = async () => {
    try {

      // 🔥 Refresh Firebase token/data
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      // 🔥 Reload full app data
      window.location.reload();

    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={
        <div className="flex items-center justify-center py-6 text-xs font-bold text-gray-400">
          ↓ Pull to refresh
        </div>
      }
      refreshingContent={
        <div className="flex items-center justify-center py-6 text-xs font-bold text-[#C82327] animate-pulse">
          ↻ Syncing Firebase Database...
        </div>
      }
    >
      {children}
    </PullToRefresh>
  );
};

const AndroidAppRoutes = () => {

  const location = useLocation();
  const navigate = useNavigate();

  // 🔥 AUTH STATES
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState(null);

  // 🔥 AUTO LOGIN CHECK
  // useEffect(() => {

  //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {

  //     // ✅ USER LOGGED IN
  //     if (
  //       currentUser &&
  //       location.pathname === "/"
  //     ) {

  //       if (currentUser.email?.includes('admin')) {
  //         navigate('/admin/dashboard', { replace: true });
  //       } else {
  //         navigate('/dashboard', { replace: true });
  //       }

  //     }

  //     // ✅ USER LOGGED OUT
  //     if (!currentUser) {

  //       const protectedRoutes = [
  //         '/admin/dashboard',
  //         '/admin/services',
  //         '/admin/new-intake',
  //         '/admin/qr-generator',
  //         '/admin/technicians',
  //         '/admin/service',
  //         '/dashboard'
  //       ];

  //       const isProtected = protectedRoutes.some(route =>
  //         location.pathname.startsWith(route)
  //       );

  //       if (isProtected) {
  //         navigate('/', { replace: true });
  //       }
  //     }

  //     setCheckingAuth(false);

  //   });

  //   return () => unsubscribe();

  // }, [location.pathname, navigate]);

  useEffect(() => {

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

    setAuthUser(currentUser);

    setCheckingAuth(false);

  });

  return () => unsubscribe();

}, []);

  // 🔥 LOADING SCREEN
if (checkingAuth) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">

      <div className="w-14 h-14 border-4 border-[#C82327] border-t-transparent rounded-full animate-spin"></div>

      <p className="mt-5 text-sm font-bold text-gray-500">
        Loading Techno Steel...
      </p>

    </div>
  );
}

// 🔥 AUTO REDIRECT AFTER AUTH CHECK

if (authUser && location.pathname === "/") {

  if (authUser.email?.includes('admin')) {
    navigate('/admin/dashboard', { replace: true });
  } else {
    navigate('/dashboard', { replace: true });
  }

  return null;
}

// 🔥 BLOCK PROTECTED ROUTES IF LOGGED OUT

const protectedRoutes = [
  '/admin',
  '/dashboard'
];

const isProtected = protectedRoutes.some(route =>
  location.pathname.startsWith(route)
);

if (!authUser && isProtected) {
  navigate('/', { replace: true });
  return null;
}

  return (
    <Routes location={location}>

      {/* LOGIN */}
      <Route
        path="/"
        element={
          <PageWrapper>
            <Login />
          </PageWrapper>
        }
      />

      {/* ADMIN ROUTES */}
      <Route element={<AdminLayout />}>

        <Route
          path="/admin/dashboard"
          element={
            <RefreshWrapper>
              <AdminDashboard />
            </RefreshWrapper>
          }
        />

        <Route
          path="/admin/services"
          element={
            <RefreshWrapper>
              <AdminServices />
            </RefreshWrapper>
          }
        />

        <Route
          path="/admin/new-intake"
          element={
            <RefreshWrapper>
              <AdminNewIntake />
            </RefreshWrapper>
          }
        />

        <Route
          path="/admin/qr-generator"
          element={<AdminQRGenerator />}
        />

        <Route
          path="/admin/technicians"
          element={
            <RefreshWrapper>
              <AdminTechnicians />
            </RefreshWrapper>
          }
        />

        <Route
          path="/admin/service/:id"
          element={
            <RefreshWrapper>
              <AdminServiceDetail />
            </RefreshWrapper>
          }
        />

      </Route>

      {/* TECH ROUTES */}
      <Route path="/dashboard" element={<TechLayout />}>

        <Route
          index
          element={
            <RefreshWrapper>
              <TechDashboard />
            </RefreshWrapper>
          }
        />

        <Route
          path="tasks"
          element={
            <RefreshWrapper>
              <TechTasks />
            </RefreshWrapper>
          }
        />

        <Route
          path="scanner"
          element={<TechScanner />}
        />

        <Route
          path="task-detail/:id"
          element={
            <RefreshWrapper>
              <TechTaskDetail />
            </RefreshWrapper>
          }
        />

        <Route
          path="profile"
          element={
            <RefreshWrapper>
              <TechProfile />
            </RefreshWrapper>
          }
        />

      </Route>

    </Routes>
  );
};

export default function App() {

  const [platform, setPlatform] = useState('');

  useEffect(() => {

    const currentPlatform = Capacitor.getPlatform();
    setPlatform(currentPlatform);

  }, []);

  return (
    <Router>
      <AndroidAppRoutes />
    </Router>
  );
}