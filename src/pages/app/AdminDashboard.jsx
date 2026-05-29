import React, { useState, useEffect } from 'react';
import { 
  Users, QrCode, ClipboardList, TrendingUp, IndianRupee, 
  ChevronRight, FileSpreadsheet, Wallet, CalendarCheck, 
  Clock, CheckCircle, Package 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore'; 
import { db } from '../../firebase/firebase'; 
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, CartesianGrid 
} from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);

  // Fetch real-time data from Firebase
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 🚀 ONLY keep actual registered services for the recent list
  const registeredTasks = tasks.filter(t => t.customerName && t.customerName.trim() !== '');

  // Sort registered tasks by latest added (newest first)
  const recentTasks = [...registeredTasks].sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() || new Date(a.receivedAt || 0).getTime() || 0;
    const timeB = b.createdAt?.toMillis?.() || new Date(b.receivedAt || 0).getTime() || 0;
    return timeB - timeA;
  });

  // Calculate live stats using actual service dates
  const todayDate = new Date().toISOString().split('T')[0];
  
  const stats = {
    totalServices: registeredTasks.length, 
    pending: registeredTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    completed: registeredTasks.filter(t => t.status === 'completed').length,
    delivered: registeredTasks.filter(t => t.status === 'delivered').length,
    totalRevenue: registeredTasks.reduce((acc, t) => acc + (Number(t.amount) || 0), 0).toLocaleString(),
    todayEarnings: registeredTasks.filter(t => 
      (t.completedAt === todayDate || t.receivedAt === todayDate) && 
      (t.status === 'completed' || t.status === 'delivered')
    ).reduce((acc, t) => acc + (Number(t.amount) || 0), 0).toLocaleString()
  };

  // --- CHART DATA PROCESSING ---
  
  // 1. Status Overview Data
  const statusData = [
    { name: 'Pending', count: stats.pending, color: '#f97316' },
    { name: 'Completed', count: stats.completed, color: '#3b82f6' },
    { name: 'Delivered', count: stats.delivered, color: '#10b981' }
  ];

  // 2. Revenue Trend Data
  const processRevenueTrend = () => {
    const revMap = {};
    registeredTasks.forEach(t => {
      if ((t.status === 'completed' || t.status === 'delivered') && t.amount) {
        const d = t.completedAt || t.receivedAt;
        if (d) {
          revMap[d] = (revMap[d] || 0) + Number(t.amount);
        }
      }
    });
    
    const sortedDates = Object.keys(revMap).sort().slice(-5);
    const trendData = sortedDates.map(d => ({
      date: d.slice(5), 
      revenue: revMap[d]
    }));
    
    return trendData.length > 0 ? trendData : [{ date: 'Today', revenue: 0 }];
  };
  const revenueTrendData = processRevenueTrend();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="bg-[#C82327] px-6 pt-12 pb-14 shadow-md">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1">Techno Steel Management</p>
      </div>

      <div className="px-4 -mt-6 relative z-10 space-y-4">
        {/* Revenue Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <h2 className="text-2xl font-black text-gray-900 mt-0.5">₹{stats.totalRevenue}</h2>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
            <IndianRupee size={24} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Leads', val: stats.totalServices, icon: ClipboardList, color: 'text-blue-500' },
            { label: 'Pending', val: stats.pending, icon: Clock, color: 'text-orange-500' },
            { label: 'Completed', val: stats.completed, icon: CheckCircle, color: 'text-blue-500' }, 
            { label: 'Delivered', val: stats.delivered, icon: Package, color: 'text-emerald-500' }, 
            { label: 'Today Earned', val: `₹${stats.todayEarnings}`, icon: Wallet, color: 'text-red-500', colSpan: true },
          ].map((item, i) => (
            <div 
              key={i} 
              className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex ${item.colSpan ? 'col-span-2 items-center justify-between' : 'flex-col justify-center'}`}
            >
              <div>
                <item.icon className={`w-5 h-5 ${item.color} mb-2 ${item.colSpan ? 'hidden' : 'block'}`} />
                {item.colSpan && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</p>}
                <p className="text-xl font-black text-gray-900">{item.val}</p>
                {!item.colSpan && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">{item.label}</p>}
              </div>
              {item.colSpan && (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 ${item.color} shadow-inner`}>
                  <item.icon className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/admin/qr-generator')} 
            className="w-full bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            <QrCode className="text-white w-4 h-4" /> 
            <span className="font-bold text-xs">QR Gen</span>
          </button>
          <button 
            onClick={() => navigate('/admin/services')} 
            className="w-full bg-white text-gray-900 p-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 shadow-sm transition-transform active:scale-95"
          >
            <FileSpreadsheet className="text-[#C82327] w-4 h-4" /> 
            <span className="font-bold text-xs">Reports</span>
          </button>
        </div>

        {/* Modern Charts Section */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Revenue Trend Area Chart */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#C82327]" />
              <h2 className="text-sm font-black text-gray-900">Revenue Trend</h2>
            </div>
            <div className="w-full h-40 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C82327" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C82327" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#C82327' }} />
                  <Area isAnimationActive={false} type="monotone" dataKey="revenue" stroke="#C82327" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Overview Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-black text-gray-900 mb-4">Workload Overview</h2>
            <div className="w-full h-40 min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Bar isAnimationActive={false} dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Recent Services List */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-black text-gray-900">Recent Services</h2>
            <button onClick={() => navigate('/admin/services')} className="text-[10px] font-bold text-[#C82327] flex items-center hover:underline">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="space-y-0">
            {recentTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex justify-between items-center border-b border-gray-50 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                <div>
                  <p className="text-xs font-black text-gray-900">{task.customerName}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{task.productType || 'Pending details'}</p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-1.5 rounded-md uppercase tracking-wider ${
                  task.status === 'completed' || task.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                  task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
            {recentTasks.length === 0 && (
              <div className="py-6 flex flex-col items-center justify-center opacity-50">
                <ClipboardList className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 font-bold italic text-center">No services recorded yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div> 
  );
}