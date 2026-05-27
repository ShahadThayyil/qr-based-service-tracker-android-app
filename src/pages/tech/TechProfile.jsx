import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, Clock, PieChart, Activity } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';

export default function TechProfile() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "services"), where("assignedTechId", "==", auth.currentUser?.uid || ""));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => doc.data()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Calculate Real Stats
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;
  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const total = tasks.length || 1;

  // 2. Calculate Real Expertise (Counts occurrences of productTypes)
  const expertiseCounts = tasks.reduce((acc, task) => {
    const type = task.productType || 'Other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const expertiseData = Object.entries(expertiseCounts).map(([label, count]) => ({
    label,
    percent: Math.round((count / total) * 100)
  })).slice(0, 3); // Show top 3 categories

  // 3. Calculate Real Quality Score (Assuming 'completed' without 'problem_reoccur' flag is high quality)
  // If your DB doesn't track reworks, we default to 95% for completed jobs.
  const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="px-4 py-6 space-y-4 pb-24 font-sans bg-[#FAFAFA] min-h-screen">
      
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 bg-[#C82327]/10 rounded-2xl flex items-center justify-center text-3xl font-black text-[#C82327] mb-3">
          {auth.currentUser?.email?.charAt(0).toUpperCase() || 'T'}
        </div>
        <h2 className="text-xl font-black text-gray-900">{auth.currentUser?.displayName || 'Technician'}</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{auth.currentUser?.email}</p>
      </div>

      {/* Account Status */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase">Account Status</p>
          <p className="text-xs font-black text-gray-900">Active Technician</p>
        </div>
        <div className="bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-100">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span className="text-[9px] font-black text-emerald-600 uppercase">Verified</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
          <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900">{completedCount}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase">Completed</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
          <Clock className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase">Pending</p>
        </div>
      </div>

      {/* Dynamic Expertise Stats */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100">
        <h3 className="text-xs font-black text-gray-900 mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#C82327]"/> Task Expertise
        </h3>
        <div className="space-y-4">
          {expertiseData.length > 0 ? expertiseData.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-[9px] font-black mb-1">
                <span className="text-gray-500 uppercase">{c.label}</span>
                <span className="text-gray-900">{c.percent}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#C82327] rounded-full" style={{ width: `${c.percent}%` }} />
              </div>
            </div>
          )) : <p className="text-xs text-gray-400 italic">No tasks completed yet.</p>}
        </div>
      </div>

      {/* Quality Score */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-gray-900 mb-0.5 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C82327]"/> Quality Score
          </h3>
          <p className="text-[9px] font-bold text-gray-400">Success rate of handled tasks</p>
        </div>
        <div className="text-xl font-black text-[#C82327]">{successRate}%</div>
      </div>
      
    </div>
  );
}