import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, PieChart, Activity, Layers } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';

export default function TechProfile() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTechName, setCurrentTechName] = useState('');

  // 1. Fetch Tech Name for robust matching
  useEffect(() => {
    const fetchTechData = async () => {
      if (auth.currentUser) {
        const techSnap = await getDoc(doc(db, "technicians", auth.currentUser.uid));
        if (techSnap.exists()) setCurrentTechName(techSnap.data().fullName || '');
      }
    };
    fetchTechData();
  }, []);

  // 2. Real-time Firebase Listener
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => doc.data());
      
      const myTasks = allTasks.filter(task => {
        if (!task.customerName || task.status === 'qr_printed') return false; 
        return task.assignedTo === auth.currentUser?.uid || 
               (task.techName && currentTechName && task.techName === currentTechName);
      });

      setTasks(myTasks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentTechName]);

  // --- DATA CALCULATIONS ---
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const total = tasks.length || 1; // Prevent division by zero

  const expertiseCounts = tasks.reduce((acc, task) => {
    const type = task.productType || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const expertiseData = Object.entries(expertiseCounts)
    .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4); 

  const successRate = tasks.length > 0 ? Math.round((completedCount / total) * 100) : 0;

  // --- CHART HELPERS ---
  const donutCircumference = 2 * Math.PI * 40; // r=40
  const gaugeCircumference = Math.PI * 40; // half-circle r=40

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C82327] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-4 pb-24 font-sans bg-[#FAFAFA] min-h-screen">
      
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-gradient-to-br from-[#C82327] to-red-900 rounded-2xl flex items-center justify-center text-3xl font-black text-white mb-3 shadow-lg shadow-red-900/20"
        >
          {auth.currentUser?.email?.charAt(0).toUpperCase() || 'T'}
        </motion.div>
        <h2 className="text-xl font-black text-gray-900">{auth.currentUser?.displayName || currentTechName || 'Technician'}</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{auth.currentUser?.email}</p>
      </div>

      {/* Account Status Badge */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Account Status</p>
          <p className="text-xs font-black text-gray-900">Active Technician</p>
        </div>
        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-100 shadow-inner">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Verified</span>
        </div>
      </motion.div>

      {/* MODERN CHART 1: Radial Task Distribution */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
          <PieChart className="w-4 h-4 text-[#C82327]"/> Workload Distribution
        </h3>
        <div className="flex items-center justify-between">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F3F4F6" strokeWidth="12" />
              {/* Completed Ring */}
              <motion.circle 
                cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="12"
                strokeLinecap="round" strokeDasharray={donutCircumference}
                initial={{ strokeDashoffset: donutCircumference }}
                animate={{ strokeDashoffset: donutCircumference - (donutCircumference * (completedCount / total)) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              {/* Pending Ring (Offset by Completed) */}
              <motion.circle 
                cx="50" cy="50" r="40" fill="transparent" stroke="#F59E0B" strokeWidth="12"
                strokeLinecap="round" strokeDasharray={donutCircumference}
                initial={{ strokeDashoffset: donutCircumference }}
                animate={{ strokeDashoffset: donutCircumference - (donutCircumference * (pendingCount / total)) }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                style={{ strokeDashoffset: donutCircumference - (donutCircumference * (completedCount / total)) }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-gray-900">{tasks.length}</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
            </div>
          </div>
          
          <div className="flex-1 pl-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resolved</span>
              </div>
              <p className="text-lg font-black text-gray-900 leading-none">{completedCount}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active</span>
              </div>
              <p className="text-lg font-black text-gray-900 leading-none">{pendingCount}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MODERN CHART 2: Expertise Matrix (Stacked Pills) */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
        <h3 className="text-xs font-black text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-wider">
          <Layers className="w-4 h-4 text-[#C82327]"/> Expertise Matrix
        </h3>
        <div className="space-y-3.5">
          {expertiseData.length > 0 ? expertiseData.map((c, i) => (
            <div key={i} className="relative">
              <div className="flex justify-between items-end mb-1.5 relative z-10">
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-wide truncate pr-4">{c.label}</span>
                <span className="text-[10px] font-black text-[#C82327]">{c.percent}%</span>
              </div>
              <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }} animate={{ width: `${c.percent}%` }} transition={{ duration: 1, delay: 0.3 + (i * 0.1), ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#C82327] to-red-500 rounded-full" 
                />
              </div>
            </div>
          )) : <p className="text-xs text-gray-400 italic font-bold">No tasks recorded yet.</p>}
        </div>
      </motion.div>

      {/* MODERN CHART 3: Quality Gauge (Speedometer) */}
      <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
        
        {/* Decorative Background Blur */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <h3 className="text-xs font-black text-gray-900 mb-1 flex items-center gap-2 uppercase tracking-wider relative z-10">
          <Activity className="w-4 h-4 text-emerald-500"/> Quality Score
        </h3>
        <p className="text-[9px] font-bold text-gray-400 mb-6 relative z-10">Overall resolution success rate</p>
        
        <div className="flex flex-col items-center justify-center relative">
          {/* SVG Semi-Circle Gauge */}
          <div className="relative w-48 h-24">
            <svg className="w-full h-full drop-shadow-md" viewBox="0 0 100 50">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" /> {/* Red */}
                  <stop offset="50%" stopColor="#f59e0b" /> {/* Orange */}
                  <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
                </linearGradient>
              </defs>
              
              {/* Background Arc */}
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="transparent" stroke="#F3F4F6" strokeWidth="12" strokeLinecap="round" />
              
              {/* Foreground Animated Arc */}
              <motion.path 
                d="M 10 50 A 40 40 0 0 1 90 50" fill="transparent" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={gaugeCircumference}
                initial={{ strokeDashoffset: gaugeCircumference }}
                animate={{ strokeDashoffset: gaugeCircumference - (gaugeCircumference * (successRate / 100)) }}
                transition={{ duration: 1.8, ease: "easeOut", delay: 0.5 }}
              />
            </svg>
            
            {/* Absolute Centered Score Text */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center translate-y-2">
              <span className="text-3xl font-black text-gray-900 leading-none">{successRate}%</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Score</span>
            </div>
          </div>
        </div>

      </motion.div>
      
    </div>
  );
}