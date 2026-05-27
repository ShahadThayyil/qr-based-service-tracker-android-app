import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ClipboardList, User, LogOut, Camera, AlertTriangle } from 'lucide-react';
import { signOut } from 'firebase/auth'; 
import { auth } from '../firebase/firebase'; 

export default function TechLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/dashboard/tasks', icon: ClipboardList, label: 'Tasks' },
    { path: '/dashboard/profile', icon: User, label: 'Profile' }
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const isScannerPage = location.pathname === '/dashboard/scanner';

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative">

      {/* --- LOGOUT MODAL --- */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative z-10"
            >
              <div className="w-12 h-12 bg-red-50 text-[#C82327] rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900 text-center mb-2">Logout Session?</h3>
              <p className="text-xs font-bold text-gray-500 text-center mb-6 leading-relaxed">Are you sure you want to log out?</p>
              
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 rounded-xl font-bold text-xs text-gray-600 bg-gray-100 active:scale-95">Cancel</button>
                <button onClick={handleLogout} className="flex-1 py-3 rounded-xl font-bold text-xs text-white bg-[#C82327] shadow-lg shadow-red-900/20 active:scale-95">Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STICKY TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#C82327] rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-900/10">TS</div>
          <span className="font-black text-gray-900 tracking-tight text-lg">Tech Portal</span>
        </div>
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-[#C82327] active:scale-95"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1 w-full pb-32">
        <Outlet />
      </main>

      {/* FAB */}
      {!isScannerPage && (
        <button
          onClick={() => navigate('/dashboard/scanner')}
          className="fixed bottom-24 right-6 z-40 w-16 h-16 bg-[#C82327] text-white rounded-full shadow-xl flex items-center justify-center border-4 border-white active:scale-90 transition-transform"
        >
          <Camera className="w-7 h-7" />
        </button>
      )}

      {/* BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-100 px-6 py-3 shadow-[0_-4px_20px_rgb(0,0,0,0.03)]">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {navItems.map((item) => {
            const isActive = item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)} className="flex flex-col items-center justify-center w-16 h-14">
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#C82327]' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-black mt-1 uppercase ${isActive ? 'text-[#C82327]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}