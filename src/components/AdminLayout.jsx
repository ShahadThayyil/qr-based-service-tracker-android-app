import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, ClipboardList, QrCode, Users, PlusCircle, LogOut, AlertCircle } from 'lucide-react';
import { auth } from '../firebase/firebase';
import { signOut } from 'firebase/auth';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.clear();
      sessionStorage.clear();
      setShowLogout(false);
      navigate('/', { replace: true });
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
    { path: '/admin/services', icon: ClipboardList, label: 'Services' },
    { path: '/admin/new-intake', icon: PlusCircle, label: 'Intake', highlight: true }, 
    { path: '/admin/qr-generator', icon: QrCode, label: 'QR Gen' },
    { path: '/admin/technicians', icon: Users, label: 'Staff' }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col relative overflow-x-hidden">

      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center">

        {/* LOGO */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Company Logo"
            className="w-9 h-9 object-contain rounded-lg"
          />
          <span className="font-bold text-gray-900 tracking-tight">
            Techno Steel
          </span>
        </div>

        <button
          onClick={() => setShowLogout(true)}
          className="p-2 text-gray-400 hover:text-[#C82327] transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>

      </header>

      {/* ================= PAGE CONTENT ================= */}
      <div className="flex-1 w-full pb-24">
        <Outlet />
      </div>

      {/* ================= BOTTOM NAV ================= */}
      <div className="fixed bottom-0 left-0 w-full z-50">
        <div className="bg-white rounded-t-[2rem] shadow-[0_-8px_30px_rgb(0,0,0,0.06)] border-t border-gray-100 px-4 py-3 pb-safe">

          <div className="flex justify-between items-center max-w-md mx-auto">

            {navItems.map((item) => {

              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center w-14 h-12"
                >

                  {/* ACTIVE TAB */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 bg-red-50 rounded-xl -z-10"
                    />
                  )}

                  {/* 🔥 INTENSE HIGHLIGHT FOR INTAKE */}
                  {item.highlight && (
                    <div className="absolute inset-0 bg-red-100/40 rounded-xl scale-110 animate-pulse" />
                  )}

                  <Icon
                    className={`w-5 h-5 transition-colors relative z-10 ${
                      isActive ? 'text-[#C82327]' : 'text-gray-400'
                    }`}
                  />

                  <span
                    className={`text-[9px] font-bold mt-1 relative z-10 ${
                      isActive ? 'text-[#C82327]' : 'text-gray-400'
                    }`}
                  >
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* ================= LOGOUT MODAL ================= */}
      <AnimatePresence>
        {showLogout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogout(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl relative z-10 w-full max-w-xs text-center"
            >

              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-[#C82327]" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Logout?
              </h3>

              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to end your session?
              </p>

              <div className="grid grid-cols-2 gap-3">

                <button
                  onClick={() => setShowLogout(false)}
                  className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleLogout}
                  className="py-3 rounded-xl font-bold text-white bg-[#C82327]"
                >
                  Logout
                </button>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}