import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Calendar, Trash2 } from 'lucide-react';
import { collection, onSnapshot, query, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';

export default function TechTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('mine'); 
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTechName, setCurrentTechName] = useState('');

  // 1. Fetch current logged-in technician's details to match "My Services"
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

  // 2. Fetch Services data from Firebase in Real-time
  useEffect(() => {
    const q = query(collection(db, "services"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
    });
    return () => unsubscribe();
  }, []);

  // 3. Filter Logic
  const filteredTasks = tasks.filter(task => {
    // Hide blank generated QR codes that haven't been filled yet
    if (!task.customerName || task.status === 'qr_printed') return false; 

    // Safely check if this task belongs to the current user
    const isMine = 
      task.assignedTo === auth.currentUser?.uid || 
      (task.techName && currentTechName && task.techName === currentTechName);

    // Tab Logic - "others services" strictly stay out of "mine"
    if (activeTab === 'mine' && !isMine) return false;

    // Status Filter
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    
    // Search Query
    const q = searchQuery.toLowerCase();
    if (q && !task.id?.toLowerCase().includes(q) && !task.customerName?.toLowerCase().includes(q) && !task.productType?.toLowerCase().includes(q)) return false;

    return true;
  });

  // Sort newest first
  const sortedTasks = filteredTasks.sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() || new Date(a.receivedAt || 0).getTime() || 0;
    const timeB = b.createdAt?.toMillis?.() || new Date(b.receivedAt || 0).getTime() || 0;
    return timeB - timeA;
  });

  // Delete Handler
  const handleDelete = async (taskId, e) => {
    e.stopPropagation(); // Prevents clicking the card and navigating
    const confirmDelete = window.confirm("Are you sure you want to delete this service?");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "services", taskId));
      } catch (err) {
        console.error("Error deleting document: ", err);
        alert("Failed to delete the service.");
      }
    }
  };

  // Modern Status Badge Component
  const StatusBadge = ({ status }) => {
    let colorClass = 'bg-gray-100 text-gray-500 border-gray-200';
    let label = status?.replace('_', ' ') || 'Unknown';

    if (status === 'pending') {
      colorClass = 'bg-orange-50 text-orange-600 border-orange-100';
    } else if (status === 'in_progress') {
      colorClass = 'bg-blue-50 text-blue-600 border-blue-100';
      label = 'Working';
    } else if (status === 'completed') {
      colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
      label = 'Done';
    } else if (status === 'delivered') {
      colorClass = 'bg-purple-50 text-purple-600 border-purple-100';
    }

    return (
      <div className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${colorClass}`}>
        {label}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAFA] font-sans pb-24">
      
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-6 pb-2 sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <h2 className="text-lg font-black text-gray-900 mb-4">Service Board</h2>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4 relative">
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all ${activeTab === 'all' ? 'translate-x-[100%]' : 'translate-x-0'}`} />
          <button onClick={() => setActiveTab('mine')} className={`flex-1 py-2.5 text-[10px] font-black uppercase z-10 ${activeTab === 'mine' ? 'text-[#C82327]' : 'text-gray-500'}`}>My Services</button>
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-2.5 text-[10px] font-black uppercase z-10 ${activeTab === 'all' ? 'text-gray-900' : 'text-gray-500'}`}>All Services</button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 text-xs font-bold pl-9 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 text-[10px] font-bold px-3 rounded-xl border border-gray-100 uppercase outline-none">
            <option value="all">Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">Working</option>
            <option value="completed">Done</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {sortedTasks.length > 0 ? (
          sortedTasks.map((task) => {
            // Recalculate isMine here to conditionally render the delete button
            const isMine = 
              task.assignedTo === auth.currentUser?.uid || 
              (task.techName && currentTechName && task.techName === currentTechName);

            return (
              <motion.div 
                key={task.id}
                onClick={() => navigate(`/dashboard/task-detail/${task.id}`)}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] active:scale-[0.98] transition-transform cursor-pointer"
              >
                {/* Top Row: Details & Badge */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-[#C82327] tracking-wider mb-0.5">ID: {task.id}</p>
                    <h4 className="text-sm font-black text-gray-900">{task.customerName}</h4>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                
                {/* Middle Row: Added Details (Grid layout for clean premium look) */}
                <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Brand</p>
                    <p className="text-[10px] font-black text-gray-700 truncate">{task.productBrand || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Technician</p>
                    <p className="text-[10px] font-black text-gray-700 truncate">{task.techName || 'Unassigned'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Problem</p>
                    <p className="text-[10px] font-black text-gray-700 line-clamp-1">{task.problem || 'No description'}</p>
                  </div>
                </div>

                {/* Bottom Row: Item, Date & Delete Button */}
                <div className="flex justify-between items-end pt-2 border-t border-gray-50">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold">{task.productType || 'Unknown Item'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-bold">{task.receivedAt || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {isMine && (
                    <button 
                      onClick={(e) => handleDelete(task.id, e)} 
                      className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-10 text-gray-400 font-bold text-xs">No services found</div>
        )}
      </div>
    </div>
  );
}