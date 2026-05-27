import React, { useState, useEffect } from 'react';
import { Users, QrCode, ClipboardList, TrendingUp, IndianRupee, ChevronRight, FileSpreadsheet, Wallet, CalendarCheck, Clock, CheckCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query } from 'firebase/firestore'; 
import { db } from '../../firebase/firebase'; 
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';

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
    totalServices: registeredTasks.length, // Only count actual registered services
    pending: registeredTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    delivered: registeredTasks.filter(t => t.status === 'delivered').length, // ✅ New Delivered Count
    totalRevenue: registeredTasks.reduce((acc, t) => acc + (Number(t.amount) || 0), 0).toLocaleString(),
    // Today Earned: accurately checks if the service was completed/delivered TODAY
    todayEarnings: registeredTasks.filter(t => 
      (t.completedAt === todayDate || t.receivedAt === todayDate) && 
      (t.status === 'completed' || t.status === 'delivered')
    ).reduce((acc, t) => acc + (Number(t.amount) || 0), 0).toLocaleString()
  };

  // --- CHART DATA PROCESSING ---
  
  // 1. Status Overview Data
  const statusData = [
    { name: 'Pending/Prog', count: stats.pending, color: '#f97316' },
    { name: 'Delivered', count: stats.delivered, color: '#10b981' }
  ];

  // 2. Revenue Trend Data (Groups recent completed tasks by date)
  const processRevenueTrend = () => {
    const revMap = {};
    registeredTasks.forEach(t => {
      if ((t.status === 'completed' || t.status === 'delivered') && t.amount) {
        // Prefer completedAt, fallback to receivedAt
        const d = t.completedAt || t.receivedAt;
        if (d) {
          revMap[d] = (revMap[d] || 0) + Number(t.amount);
        }
      }
    });
    
    // Sort dates and take the last 5 active days
    const sortedDates = Object.keys(revMap).sort().slice(-5);
    const trendData = sortedDates.map(d => ({
      date: d.slice(5), // Format as MM-DD
      revenue: revMap[d]
    }));
    
    // Fallback if database has no completed revenues yet
    return trendData.length > 0 ? trendData : [{ date: 'Today', revenue: 0 }];
  };
  const revenueTrendData = processRevenueTrend();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="bg-[#C82327] rounded-b-[2rem] px-6 pt-12 pb-8 shadow-lg">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-red-100 text-xs font-bold uppercase tracking-widest mt-1">Techno Steel Management</p>
      </div>

      <div className="px-4 -mt-6 space-y-4">
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
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Leads', val: stats.totalServices, icon: ClipboardList, color: 'blue' },
            { label: 'Pending', val: stats.pending, icon: Clock, color: 'orange' },
            { label: 'Delivered', val: stats.delivered, icon: Package, color: 'emerald' }, // ✅ Replaced with Delivered
            { label: 'Today Earned', val: `₹${stats.todayEarnings}`, icon: Wallet, color: 'red' },
          ].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-transform active:scale-95">
              <item.icon className={`w-5 h-5 text-${item.color}-500 mb-2`} />
              <p className="text-lg font-black text-gray-900">{item.val}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/admin/qr-generator')} className="bg-gray-900 text-white p-4 rounded-2xl flex items-center gap-3 shadow-md active:scale-95 transition-all">
            <QrCode className="text-white w-5 h-5" /> <span className="font-bold text-xs">QR Gen</span>
          </button>
          <button onClick={() => navigate('/admin/services')} className="bg-white text-gray-900 p-4 rounded-2xl flex items-center gap-3 border border-gray-100 shadow-sm active:scale-95 transition-all">
            <FileSpreadsheet className="text-[#C82327] w-5 h-5" /> <span className="font-bold text-xs">Reports</span>
          </button>
        </div>

        {/* Modern Charts Section */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Revenue Trend Area Chart */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
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
                  <Area type="monotone" dataKey="revenue" stroke="#C82327" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Overview Bar Chart */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-black text-gray-900 mb-4">Workload Overview</h2>
            <div className="w-full h-32 min-h-[128px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
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
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-gray-900">Recent Services</h2>
            <button onClick={() => navigate('/admin/services')} className="text-[10px] font-bold text-[#C82327] flex items-center active:opacity-70">
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="space-y-4">
            {recentTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-xs font-black text-gray-900">{task.customerName}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{task.productType || 'Pending details'}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
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