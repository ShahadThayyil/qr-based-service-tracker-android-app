import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Calendar, Wrench, CheckCircle, Clock, Repeat, History, Package, IndianRupee, MessageCircle, User, LayoutList, Send, Trash2, Phone } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase'; // Ensure this path is correct

const CURRENT_ADMIN_ID = 'ADMIN-001';

export default function AdminServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  
  // 1. Fetch Real-time Firebase Data
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);
  
  // States
  const [activeSection, setActiveSection] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [customDate, setCustomDate] = useState(''); 
  const [showRepeated, setShowRepeated] = useState(false);

  // 2. Calculate which phone numbers are repeated
  const phoneCounts = useMemo(() => {
    return services.reduce((acc, curr) => {
      const phone = curr.customerPhone || curr.phone || '';
      acc[phone] = (acc[phone] || 0) + 1;
      return acc;
    }, {});
  }, [services]);

  // 3. Filtering & Sorting Logic
  const filteredServices = useMemo(() => {
    const filtered = services.filter(service => {
      // 🚀 ONLY SHOW CARDS WITH DATA (Hide empty QR printed docs)
      if (!service.customerName) return false;

      // --- Section Filtering ---
      if (activeSection === 'mine' && service.techName !== 'admin') return false;
      if (activeSection === 'pending_msg' && (service.status !== 'completed' || service.clientMessaged)) return false;

      // --- Standard Filters ---
      const matchesSearch = (service.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                            (service.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                            (service.customerPhone || service.phone || '').includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      
      const received = service.receivedAt || service.receivedDate || '';
      const matchesMonth = monthFilter === 'all' 
        ? true 
        : monthFilter === 'custom' 
          ? (customDate ? received === customDate : true)
          : received.startsWith(monthFilter);
          
      const matchesRepeat = showRepeated ? phoneCounts[service.customerPhone || service.phone] > 1 : true;
      
      return matchesSearch && matchesStatus && matchesMonth && matchesRepeat;
    });

    // --- Sort Newest First ---
    return filtered.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || new Date(a.receivedAt || a.receivedDate || 0).getTime() || 0;
      const timeB = b.createdAt?.toMillis?.() || new Date(b.receivedAt || b.receivedDate || 0).getTime() || 0;
      return timeB - timeA;
    });

  }, [services, activeSection, searchTerm, statusFilter, monthFilter, customDate, showRepeated, phoneCounts]);

  // 4. Dynamic Chart Data
  const chartData = [
    { name: 'Pending', count: filteredServices.filter(s => s.status === 'pending').length, color: '#f97316' },
    { name: 'In Prog', count: filteredServices.filter(s => s.status === 'in_progress').length, color: '#3b82f6' },
    { name: 'Completed', count: filteredServices.filter(s => s.status === 'completed').length, color: '#10b981' },
    { name: 'Delivered', count: filteredServices.filter(s => s.status === 'delivered').length, color: '#8b5cf6' }, 
  ];

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredServices.map((s) => ({
      ID: s.id, 
      Customer: s.customerName, 
      Phone: s.customerPhone || s.phone, 
      Item: s.productType || s.item, 
      Brand: s.productBrand,
      Status: s.status?.toUpperCase(), 
      'Received Date': s.receivedAt || s.receivedDate, 
      Technician: s.techName || s.tech,
      'Bill Amount (₹)': s.amount || 0,
      'Client Messaged': s.clientMessaged ? 'Yes' : 'No'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Service_Records");
    XLSX.writeFile(workbook, `Techno_Services_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // UI Helpers
  const handleWhatsAppAlert = async (service) => {
    const phone = service.customerPhone || service.phone;
    const item = service.productType || service.item;
    const msg = `Hello ${service.customerName}, your ${item} (ID: ${service.id}) is successfully repaired and ready for pickup! Total Bill: ₹${service.amount || 0}.`;
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    
    // Update Firebase
    await updateDoc(doc(db, "services", service.id), { clientMessaged: true });
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevents card click navigation
    if (window.confirm("Are you sure you want to delete this service record?")) {
      try {
        await deleteDoc(doc(db, "services", id));
      } catch (error) {
        console.error("Error deleting document:", error);
        alert("Failed to delete service.");
      }
    }
  };

  const StatusBadge = ({ status }) => {
    const configs = {
      pending: { color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock, label: 'Pending' },
      in_progress: { color: 'text-blue-700', bg: 'bg-blue-100', icon: Wrench, label: 'In Progress' },
      completed: { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle, label: 'Completed' },
      delivered: { color: 'text-purple-700', bg: 'bg-purple-100', icon: Package, label: 'Delivered' }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getCardStyle = (status) => {
    switch(status) {
      case 'pending': return 'border-orange-200 bg-orange-50/40';
      case 'in_progress': return 'border-blue-200 bg-blue-50/40';
      case 'completed': return 'border-emerald-200 bg-emerald-50/40';
      case 'delivered': return 'border-purple-200 bg-purple-50/40';
      default: return 'border-gray-50 bg-white';
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariant = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <div className="bg-white sticky top-0 z-30 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border-b border-gray-100">
        <div className="bg-[#C82327] px-4 pt-12 pb-6 relative overflow-hidden rounded-b-3xl">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Service Records</h1>
              <p className="text-red-100 text-xs font-medium mt-1">Manage and track workflows</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl flex flex-col items-center justify-center border border-white/20 shadow-sm">
              <span className="text-white font-bold text-base leading-none">{filteredServices.length}</span>
              <span className="text-red-100 text-[9px] uppercase tracking-wider mt-0.5 font-bold">Records</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-white">
          <div className="flex bg-gray-100 p-1 rounded-xl relative">
            <div className={`absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out`} style={{ transform: `translateX(${activeSection === 'all' ? '0' : activeSection === 'mine' ? 'calc(100% + 4px)' : 'calc(200% + 8px)'})` }} />
            {['all', 'mine', 'pending_msg'].map((s) => (
              <button key={s} onClick={() => setActiveSection(s)} className={`flex-1 py-2.5 text-[10px] font-bold z-10 flex items-center justify-center gap-1 ${activeSection === s ? 'text-[#C82327]' : 'text-gray-500'}`}>
                {s === 'pending_msg' ? 'To Message' : s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {activeSection !== 'pending_msg' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50 overflow-hidden min-h-[112px]">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-gray-900">Current View Status</h2>
              <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-sm">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
            <div className="h-28 w-full min-h-[112px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={24}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        <div className="px-4 py-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search ID, name, or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white shadow-sm text-sm font-medium pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 border border-gray-100" />
          </div>

          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {filteredServices.map(service => (
              <motion.div 
                key={service.id} 
                variants={itemVariant} 
                onClick={() => activeSection !== 'pending_msg' && navigate(`/admin/service/${service.id}`)} 
                className={`p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border transition-transform ${getCardStyle(service.status)} ${activeSection !== 'pending_msg' ? 'active:scale-[0.98] cursor-pointer' : ''}`}
              >
                
                {/* Header: ID, Name, Status & Delete */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{service.id}</span>
                    <h3 className="text-base font-bold text-gray-900 mt-0.5">{service.customerName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={service.status} />
                    <button onClick={(e) => handleDelete(e, service.id)} className="p-1 text-gray-400 hover:text-red-500 bg-white rounded-md shadow-sm transition-colors active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 🚀 NEW DETAILS GRID */}
                <div className="grid grid-cols-2 gap-y-2 mt-3 text-xs font-medium border-t border-gray-200/50 pt-3">
                  <div className="text-gray-500">
                    Item: <span className="text-gray-900 font-bold ml-1">{service.productType || service.item || 'N/A'}</span>
                  </div>
                  <div className="text-gray-500 text-right flex justify-end items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-gray-900 font-bold">{service.receivedAt || service.receivedDate || 'N/A'}</span>
                  </div>
                  <div className="text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    <span className="text-gray-900 font-bold">{service.customerPhone || service.phone || 'N/A'}</span>
                  </div>
                  <div className="text-gray-500 text-right">
                    Tech: <span className="text-gray-900 font-bold ml-1">{service.techName || service.tech || 'Unassigned'}</span>
                  </div>
                  <div className="col-span-2 text-gray-500 mt-1">
                    Problem: <span className="text-gray-900 font-bold ml-1 line-clamp-2">{service.problem || 'Not specified'}</span>
                  </div>
                </div>

                {/* Message Action for 'To Message' Tab */}
                {activeSection === 'pending_msg' && (
                  <button onClick={() => handleWhatsAppAlert(service)} className="w-full mt-4 py-3 rounded-xl font-bold text-xs text-white bg-[#25D366] flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-transform">
                    <MessageCircle className="w-4 h-4" /> Message Client
                  </button>
                )}
                
              </motion.div>
            ))}
            {filteredServices.length === 0 && (
               <div className="text-center py-10">
                 <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                 <p className="text-xs font-bold text-gray-400">No active services found.</p>
               </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}