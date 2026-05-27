import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core'; 
import PullToRefresh from 'react-simple-pull-to-refresh'; // 🔥 IMPORT ADDED

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
    // 🚀 TODO: Replace this timeout with your actual database fetch functions!
    // Example: await fetchLatestDataFromDatabase();
    
    // Simulating network delay for now
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
          ↻ Syncing Database...
        </div>
      }
    >
      {children}
    </PullToRefresh>
  );
};

const AndroidAppRoutes = () => {
  const location = useLocation();

  return (
    <Routes location={location}>
      
      {/* Login Route */}
      <Route path="/" element={<PageWrapper><Login /></PageWrapper>} />

      {/* ADMIN ROUTES */}
      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<RefreshWrapper><AdminDashboard /></RefreshWrapper>} />
        <Route path="/admin/services" element={<RefreshWrapper><AdminServices /></RefreshWrapper>} />
        <Route path="/admin/new-intake" element={<RefreshWrapper><AdminNewIntake /></RefreshWrapper>} />
        <Route path="/admin/qr-generator" element={<AdminQRGenerator />} /> {/* Excluded Refresh: Not needed for QR */}
        <Route path="/admin/technicians" element={<RefreshWrapper><AdminTechnicians /></RefreshWrapper>} />
        <Route path="/admin/service/:id" element={<RefreshWrapper><AdminServiceDetail /></RefreshWrapper>} />
      </Route>

      {/* TECHNICIAN ROUTES */}
      <Route path="/dashboard" element={<TechLayout />}>
        <Route index element={<RefreshWrapper><TechDashboard /></RefreshWrapper>} />
        <Route path="tasks" element={<RefreshWrapper><TechTasks /></RefreshWrapper>} />
        <Route path="scanner" element={<TechScanner />} /> {/* Excluded Refresh: It's a full-screen camera view */}
        <Route path="task-detail/:id" element={<RefreshWrapper><TechTaskDetail /></RefreshWrapper>} />
        <Route path="profile" element={<RefreshWrapper><TechProfile /></RefreshWrapper>} />
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