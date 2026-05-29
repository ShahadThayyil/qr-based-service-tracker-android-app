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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative font-sans">

      {/* --- LOGOUT MODAL --- */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl relative z-10 border border-gray-100"
            >
              <div className="w-14 h-14 bg-red-50 text-[#C82327] rounded-full flex items-center justify-center mb-5 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-gray-900 text-center mb-2 tracking-tight">
                End Session?
              </h3>
              <p className="text-sm font-medium text-gray-500 text-center mb-8">
                Are you sure you want to log out of your account?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowLogoutModal(false)} 
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleLogout} 
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white bg-[#C82327] shadow-lg shadow-red-900/20 hover:bg-red-800 active:scale-95 transition-all"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FIXED GLASS HEADER --- */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C82327] rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shadow-red-900/20">
            TS
          </div>
          <span className="font-black text-gray-900 tracking-tight text-lg">
            Tech Portal
          </span>
        </div>
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="w-10 h-10 bg-gray-50 text-gray-600 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-[#C82327] active:scale-95 transition-colors"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* --- PAGE CONTENT --- */}
      {/* Added pt-20 to account for the fixed header, pb-32 for the bottom nav/FAB */}
      <main className="flex-1 w-full pt-20 pb-32">
        <Outlet />
      </main>

      {/* --- FLOATING ACTION BUTTON (SCANNER) --- */}
      {!isScannerPage && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/dashboard/scanner')}
          className="fixed bottom-24 right-6 z-40 w-16 h-16 bg-[#C82327] text-white rounded-full shadow-[0_8px_30px_rgba(200,35,39,0.3)] flex items-center justify-center border-[3px] border-white"
          aria-label="Open Scanner"
        >
          <Camera className="w-6 h-6" />
        </motion.button>
      )}

      {/* --- BOTTOM NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-100 px-6 py-2 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pb-safe">
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {navItems.map((item) => {
            const isActive = item.path === '/dashboard' 
              ? location.pathname === '/dashboard' 
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <button 
                key={item.path} 
                onClick={() => navigate(item.path)} 
                className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl"
              >
                {/* Animated Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="techBottomNav"
                    className="absolute inset-0 bg-red-50 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                
                <Icon className={`w-5 h-5 mb-1 transition-colors ${isActive ? 'text-[#C82327]' : 'text-gray-400'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-[#C82327]' : 'text-gray-400'}`}>
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