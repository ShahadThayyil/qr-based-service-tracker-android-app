import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Wrench, 
  CheckCircle, 
  Activity, 
  PhoneCall, 
  MessageCircle, 
  Clock 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

// Firebase
import { db } from '../../firebase/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function AdminTechnicians() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==============================
  // FETCH TECHNICIANS FROM FIREBASE
  // ==============================
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'technicians'),
      (snapshot) => {
        const techs = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data()
        }));

        setTechnicians(techs);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching technicians:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==============================
  // FILTER TECHNICIANS
  // ==============================
  const filteredTechs = technicians.filter((tech) => {
    const name = tech.fullName || '';
    const id = tech.uid || '';
    const phone = tech.phone || '';

    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm)
    );
  });

  // ==============================
  // CHART DATA
  // ==============================
  const chartData = filteredTechs
    .map((t) => ({
      name: t.fullName?.split(' ')[0] || 'Tech',
      completed: t.stats?.completed || 0
    }))
    .sort((a, b) => b.completed - a.completed);

  // ==============================
  // CALL FUNCTION
  // ==============================
  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  // ==============================
  // WHATSAPP FUNCTION
  // ==============================
  const handleWhatsApp = (phone, name) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const msg = `Hello ${name}, an update regarding your tasks:`;

    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`,
      '_blank'
    );
  };

  // ==============================
  // ANIMATION
  // ==============================
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">

      {/* Header */}
      <div className="bg-[#C82327] rounded-b-3xl px-4 pt-12 pb-6 shadow-md relative z-20 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Staff Monitor
            </h1>

            <p className="text-red-100 text-xs font-medium mt-0.5">
              Track technician performance
            </p>
          </div>

          {/* Total Staff */}
          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl flex flex-col items-center justify-center border border-white/20 shadow-sm">
            <span className="text-white font-bold text-base leading-none">
              {technicians.length}
            </span>

            <span className="text-red-100 text-[9px] uppercase tracking-wider mt-0.5 font-bold">
              Staff
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Search */}
        <div className="px-4 mt-4 relative">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            type="text"
            placeholder="Search by name, ID, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)] text-sm font-bold text-gray-900 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 border border-gray-50"
          />
        </div>

        {/* Chart */}
        {filteredTechs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              Top Performers (Completed)
            </h2>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 0,
                    left: -25,
                    bottom: 0
                  }}
                >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 9,
                      fill: '#9CA3AF',
                      fontWeight: 'bold'
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: '#9CA3AF'
                    }}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                    }}
                  />

                  <Bar
                    dataKey="completed"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#C82327' : '#1F2937'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Technician List */}
        <div className="px-4 py-4">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {loading ? (
              <div className="text-center text-gray-400 mt-10 font-medium">
                Loading technicians...
              </div>
            ) : (
              <>
                {filteredTechs.map((tech) => (
                  <motion.div
                    key={tech.uid}
                    variants={itemVariant}
                    className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50 relative overflow-hidden"
                  >

                    {/* Top */}
                    <div className="flex justify-between items-start mb-4">

                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 text-gray-700 font-bold text-lg">
                          {tech.fullName?.charAt(0) || 'T'}
                        </div>

                        <div>
                          <h3 className="text-sm font-extrabold text-gray-900">
                            {tech.fullName}
                          </h3>

                          <p className="text-[10px] font-bold text-gray-400 mt-0.5 tracking-wider">
                            {tech.uid}
                          </p>

                          <p className="text-[11px] font-bold text-gray-600 mt-0.5">
                            {tech.phone}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">

                        <button
                          onClick={() => handleCall(tech.phone)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm active:scale-95"
                        >
                          <PhoneCall className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            handleWhatsApp(tech.phone, tech.fullName)
                          }
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                      </div>
                    </div>

                    {/* Current Task */}
                    {tech.currentTask ? (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                        <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            In Progress
                          </p>

                          <p className="text-xs font-bold text-gray-900 mt-0.5">
                            {tech.currentTask.item}

                            <span className="text-gray-500 font-medium">
                              {' '}
                              ({tech.currentTask.id})
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />

                        <p className="text-xs font-bold text-gray-500">
                          Currently Available
                        </p>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">

                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            Completed
                          </p>

                          <p className="text-sm font-extrabold text-gray-900">
                            {tech.stats?.completed || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="bg-orange-50 p-1.5 rounded-lg text-orange-500">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                            Pending Tasks
                          </p>

                          <p className="text-sm font-extrabold text-gray-900">
                            {tech.stats?.pending || 0}
                          </p>
                        </div>
                      </div>

                    </div>

                  </motion.div>
                ))}

                {filteredTechs.length === 0 && (
                  <div className="text-center text-gray-400 mt-10 font-medium">
                    No technicians found.
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>

      </div>
    </div>
  );
}