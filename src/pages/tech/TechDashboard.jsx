import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Wrench, CheckCircle, Truck, PieChart, Activity } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase'; 

export default function TechDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTechName, setCurrentTechName] = useState('');

  // 1. Fetch current logged-in technician's name to match tasks correctly
  useEffect(() => {
    const fetchTechData = async () => {
      if (auth.currentUser) {
        const techSnap = await getDoc(doc(db, "technicians", auth.currentUser.uid));
        if (techSnap.exists()) {
          setCurrentTechName(techSnap.data().fullName || '');
        }
      }
    };
    fetchTechData();
  }, []);

  // 2. Fetch Services and filter strictly for this technician
  useEffect(() => {
    const q = query(collection(db, "services"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const myTasks = allTasks.filter(task => {
        // Hide blank generated QR codes that haven't been filled yet
        if (!task.customerName || task.status === 'qr_printed') return false; 

        // Safely check if this task belongs to the current user
        return task.assignedTo === auth.currentUser?.uid || 
               (task.techName && currentTechName && task.techName === currentTechName);
      });

      setTasks(myTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentTechName]);

  // Calculated Stats (Only for this technician)
  const totalWorks = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const delivered = tasks.filter(t => t.status === 'delivered').length;
  const pending = tasks.filter(t => t.status === 'pending').length;

  const stats = [
    { label: 'Total', count: totalWorks, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Progress', count: inProgress, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed', count: completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Delivered', count: delivered, icon: Truck, color: 'text-[#C82327]', bg: 'bg-red-50' },
  ];

  const chartData = [
    { label: 'Delivered', count: delivered, color: '#C82327', percent: totalWorks ? (delivered/totalWorks) * 100 : 0 },
    { label: 'Completed', count: completed, color: '#10B981', percent: totalWorks ? (completed/totalWorks) * 100 : 0 },
    { label: 'In Progress', count: inProgress, color: '#F97316', percent: totalWorks ? (inProgress/totalWorks) * 100 : 0 },
    { label: 'Pending', count: pending, color: '#9CA3AF', percent: totalWorks ? (pending/totalWorks) * 100 : 0 },
  ];

  let acc = 0;

  // Animation variants
  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C82327] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="px-5 py-6 space-y-5 pb-24 font-sans bg-[#FAFAFA] min-h-screen"
      variants={containerVars}
      initial="hidden"
      animate="show"
    > 
      
      <motion.div variants={itemVars} className="mb-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Dashboard</h1>
        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-wider">
          {currentTechName ? `Welcome, ${currentTechName}` : 'Technician Overview'}
        </p>
      </motion.div>

      {/* Grid Stats */}
      <motion.div variants={itemVars} className="grid grid-cols-2 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`p-4 rounded-2xl border border-gray-100 ${stat.bg}`}>
              <Icon className={`w-5 h-5 mb-3 ${stat.color}`} />
              <p className="text-2xl font-black text-gray-900">{stat.count}</p>
              <p className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${stat.color}`}>{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Chart 1: Donut Overview */}
      <motion.div variants={itemVars} className="bg-white p-5 rounded-2xl border border-gray-200 mt-2">
        <div className="flex items-center gap-2 mb-6 text-[#C82327]">
          <PieChart className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Task Overview</h3>
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#F3F4F6" strokeWidth="3.5" />
              {chartData.map((slice, i) => {
                const dashOffset = -acc;
                acc += slice.percent;
                return (
                  <circle 
                    key={i} 
                    cx="18" cy="18" r="15.9" 
                    fill="transparent" 
                    stroke={slice.color} 
                    strokeWidth="3.5" 
                    strokeDasharray={`${slice.percent} 100`} 
                    strokeDashoffset={dashOffset} 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out" 
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-gray-900">{totalWorks}</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-3">
            {chartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</span>
                </div>
                <span className="text-sm font-black text-gray-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Chart 2: Workload Pipeline (Horizontal Stacked Bar) */}
      <motion.div variants={itemVars} className="bg-white p-5 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-2 mb-5 text-[#C82327]">
          <Activity className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Workload Pipeline</h3>
        </div>
        
        {/* Horizontal Stacked Bar */}
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
          <div style={{ width: `${chartData[0].percent}%` }} className="bg-[#C82327] h-full transition-all duration-1000" />
          <div style={{ width: `${chartData[1].percent}%` }} className="bg-[#10B981] h-full transition-all duration-1000" />
          <div style={{ width: `${chartData[2].percent}%` }} className="bg-[#F97316] h-full transition-all duration-1000" />
          <div style={{ width: `${chartData[3].percent}%` }} className="bg-[#9CA3AF] h-full transition-all duration-1000" />
        </div>
        
        {/* Pipeline Metrics */}
        <div className="flex justify-between items-center mt-5">
          <div className="text-left">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Tasks</p>
            <div className="flex items-end gap-1.5 mt-1">
              <p className="text-lg font-black text-gray-900 leading-none">{inProgress + pending}</p>
              <p className="text-[11px] font-bold text-orange-500 mb-[2px]">Waiting</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resolved</p>
            <div className="flex items-end gap-1.5 mt-1 justify-end">
              <p className="text-[11px] font-bold text-emerald-500 mb-[2px]">Finished</p>
              <p className="text-lg font-black text-gray-900 leading-none">{completed + delivered}</p>
            </div>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}