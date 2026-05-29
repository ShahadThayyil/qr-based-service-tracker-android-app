import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, PieChart, Activity, Layers } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';

export default function TechProfile() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTechName, setCurrentTechName] = useState('');

  useEffect(() => {
    const fetchTechData = async () => {
      if (auth.currentUser) {
        const techSnap = await getDoc(doc(db, "technicians", auth.currentUser.uid));
        if (techSnap.exists()) setCurrentTechName(techSnap.data().fullName || '');
      }
    };
    fetchTechData();
  }, []);

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

  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const total = tasks.length || 1;

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#C82327]">Loading...</div>;

  return (
    <div className="px-5 py-8 space-y-6 font-sans bg-[#FAFAFA] min-h-screen">
      
      {/* Profile Header */}
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center text-2xl font-black text-white mb-4">
          {auth.currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-black text-gray-900">{currentTechName || 'Technician'}</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{auth.currentUser?.email}</p>
      </div>

      {/* Account Status */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Status</p>
          <p className="text-sm font-black text-gray-900">Account Verified</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
          <span className="text-[10px] font-black text-emerald-700 uppercase">Active</span>
        </div>
      </div>

      {/* Radial Stats */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200">
        <h3 className="text-[10px] font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
          <PieChart className="w-4 h-4 text-[#C82327]"/> Task Overview
        </h3>
        <div className="flex items-center justify-between">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F3F4F6" strokeWidth="10" />
              <motion.circle cx="50" cy="50" r="40" fill="transparent" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeDasharray="251" initial={{ strokeDashoffset: 251 }} animate={{ strokeDashoffset: 251 - (251 * (completedCount / total)) }} transition={{ duration: 1 }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-lg text-gray-900">{total}</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-gray-500">Resolved ({completedCount})</span></div>
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-orange-400" /><span className="text-xs font-bold text-gray-500">Active ({pendingCount})</span></div>
          </div>
        </div>
      </div>

      {/* Expertise Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200">
        <h3 className="text-[10px] font-black text-gray-900 mb-6 uppercase tracking-widest">Expertise Matrix</h3>
        <div className="space-y-4">
          {expertiseData.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                <span>{c.label}</span>
                <span>{c.percent}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${c.percent}%` }} className="h-full bg-[#C82327]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Score */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200">
        <h3 className="text-[10px] font-black text-gray-900 mb-1 uppercase tracking-widest">Quality Score</h3>
        <p className="text-[9px] font-bold text-gray-400 mb-4">Overall resolution success rate</p>
        <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-gray-900">{successRate}%</span>
            <span className="text-xs font-bold text-emerald-600 pb-2">Excellent</span>
        </div>
      </div>

    </div>
  );
}