import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, User, Phone, MapPin, Package, Image as ImageIcon, Plus, Trash2, AlertCircle, Database, Settings, IndianRupee, MessageCircle, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase'; // Ensure path is correct

export default function AdminScanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // --- UI States ---
  const [scanResult, setScanResult] = useState(null); // 'new' or 'existing'
  const [isSaving, setIsSaving] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  // --- Form State ---
  const [formData, setFormData] = useState({
    id: '',
    status: 'pending',
    receivedAt: new Date().toISOString().split('T')[0],
    completedAt: '',
    techName: 'admin',
    techPhone: '9847512024',
    customerName: '',
    customerPhone: '',
    customerLocation: '',
    productBrand: '',
    productType: '',
    problem: '',
    amount: '',
    images: [],
    inspectionPoints: []
  });

  const scannerStarted = useRef(false);

useEffect(() => {
  if (scannerStarted.current) return;
  scannerStarted.current = true;

  const startScanner = async () => {
    try {
      const { camera } = await BarcodeScanner.requestPermissions();

      if (camera !== 'granted') {
        alert("Camera permission denied");
        navigate(-1);
        return;
      }

      const result = await BarcodeScanner.scan();

      // If cancelled
      if (!result?.barcodes?.length) {
        console.log("Scan cancelled");
        return;
      }

      const scannedId = result.barcodes[0].rawValue;

      console.log("Scanned ID:", scannedId);

      const docRef = doc(db, "services", scannedId);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("Existing document found");

        setFormData(prev => ({
  ...prev,
  id: scannedId,
  ...docSnap.data()
}));

        setScanResult("existing");

      } else {
        console.log("New document");

        setFormData(prev => ({
          ...prev,
          id: scannedId
        }));

        setScanResult("new");
      }

    } catch (err) {

      // IMPORTANT
      if (err?.message?.includes("scan canceled")) {
        console.log("User cancelled scanning");
        return;
      }

      console.error("Scanner Error:", err);

      alert("Scanner failed");
    }
  };

  startScanner();

}, []);
  // --- REAL QR SCANNER & FIREBASE INTEGRATION ---
//  useEffect(() => {
//   const startScanner = async () => {
//     try {
//       // Request permission
//       const { camera } = await BarcodeScanner.requestPermissions();

//       if (camera !== 'granted') {
//         alert("Camera permission denied");
//         navigate(-1);
//         return;
//       }

//       // Start scan
//       const result = await BarcodeScanner.scan();

//       // Cancel handling
//       if (!result || !result.barcodes || result.barcodes.length === 0) {
//         console.log('Scan cancelled');
//         navigate('/admin/services');
//         return;
//       }

//       const scannedId = result.barcodes[0].rawValue;
//       console.log('Scanned ID:', scannedId);

//       // Firebase lookup
//       const docRef = doc(db, "services", scannedId);
//       const docSnap = await getDoc(docRef);

//       if (docSnap.exists()) {
//         setFormData({ id: scannedId, ...docSnap.data() });
//         setScanResult('existing');
//       } else {
//         setFormData(prev => ({
//           ...prev,
//           id: scannedId
//         }));
//         setScanResult('new');
//       }

//     } catch (err) {
//       console.error('Scanner Error:', err);
//       navigate('/admin/services');
//     }
//   };

//   startScanner();
// }, [navigate]);

  // --- FORM HANDLERS ---
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleStatusChange = (newStatus) => setFormData({ ...formData, status: newStatus });
  
  const handlePointChange = (index, value) => {
    const updatedPoints = [...formData.inspectionPoints];
    updatedPoints[index] = value;
    setFormData(prev => ({ ...prev, inspectionPoints: updatedPoints }));
  };
  const addPoint = () => setFormData(prev => ({ ...prev, inspectionPoints: [...prev.inspectionPoints, ''] }));
  const removePoint = (index) => setFormData(prev => ({ ...prev, inspectionPoints: prev.inspectionPoints.filter((_, i) => i !== index) }));

  // NATIVE DEVICE IMAGE UPLOAD
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newImages = files.map(file => URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
    }
  };
  const removeImage = (indexToRemove) => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== indexToRemove) }));

  // COMMUNICATION
  const handleWhatsApp = () => {
    const msg = `Hello ${formData.customerName}, your service for the ${formData.productBrand} ${formData.productType} (ID: ${formData.id}) is complete. Total Bill: ₹${formData.amount || 0}. Please collect it. Thanks, Techno Steel.`;
    window.open(`https://wa.me/91${formData.customerPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };
  const handleCall = () => window.open(`tel:${formData.customerPhone}`, '_self');

  // --- FIREBASE SAVE LOGIC ---
  const handleSave = async () => {
    if(!formData.customerName || !formData.productType) {
      alert("Please fill in the required fields (Name & Item Type).");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const docRef = doc(db, "services", formData.id);
      
      if (scanResult === 'new') {
        // Create new document with fixed ID
        await setDoc(docRef, { ...formData, createdAt: serverTimestamp() });
      } else {
        // Update existing document
        await updateDoc(docRef, formData);
      }
      
      setIsSaving(false);
      setScanResult(null);
      alert(scanResult === 'new' ? 'Successfully Registered!' : 'Modifications Saved!');
      navigate('/admin/services');
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Error saving to database. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent font-sans flex flex-col">
      
      {/* Full-Screen Image Viewer */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <div className="relative bg-white p-2 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <button className="absolute -top-4 -right-4 p-2.5 bg-[#C82327] rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all" onClick={() => setViewingImage(null)}>
                <X className="w-5 h-5" />
              </button>
              <img src={viewingImage} alt="Enlarged product" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CENTERED POPUP MODAL (Handles both New & Existing) --- */}
      <AnimatePresence>
        {scanResult && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-lg bg-[#FAFAFA] rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col pointer-events-auto"
              >
                
                {/* Form Header */}
                <div className="flex justify-between items-center mb-3 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      {scanResult === 'new' ? 'New Registration' : 'Edit Service Ticket'}
                    </h3>
                    <p className="text-[10px] font-bold text-[#C82327] mt-0.5 tracking-wider uppercase">ID: {formData.id} Attached</p>
                  </div>
                  <button onClick={() => { setScanResult(null); navigate(-1); }} className="bg-gray-200 p-2 rounded-full text-gray-600 hover:text-gray-900 active:scale-95"><X className="w-4 h-4" /></button>
                </div>

                {/* Form Content (Scrollable Area) */}
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 scrollbar-hide pr-1">
                  
                  {scanResult === 'new' && (
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-orange-800 leading-relaxed">Unregistered QR. Capture initial details before starting service.</p>
                    </div>
                  )}

                  {/* System & Status Details */}
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 space-y-4">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase tracking-wider"><Settings className="w-3.5 h-3.5"/> System Status</div>
                    
                    {/* Status Buttons */}
                    <div className="bg-gray-50 p-1.5 rounded-xl flex flex-wrap gap-1 border border-gray-100 shadow-inner">
                      {['pending', 'in_progress', 'completed', 'delivered'].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(s)}
                          className={`flex-1 min-w-[70px] py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                            formData.status === s ? 'bg-[#C82327] text-white shadow-md' : 'text-gray-400 hover:bg-white'
                          }`}
                        >
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    {scanResult === 'existing' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1.5">Received At</label>
                            <input type="date" name="receivedAt" value={formData.receivedAt} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1.5">Completed At</label>
                            <input type="date" name="completedAt" value={formData.completedAt} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1.5">Assigned Tech</label>
                            <input type="text" name="techName" value={formData.techName} onChange={handleChange} placeholder="Tech Name" className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-1.5">Tech Phone</label>
                            <input type="tel" name="techPhone" value={formData.techPhone} onChange={handleChange} placeholder="Tech Phone" className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Customer Details */}
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase tracking-wider"><User className="w-3.5 h-3.5"/> Customer Info</div>
                      {scanResult === 'existing' && (
                        <div className="flex gap-2">
                          <button onClick={handleCall} className="p-1.5 bg-blue-50 text-blue-600 rounded-md active:scale-95 transition-all"><PhoneCall className="w-3.5 h-3.5" /></button>
                          <button onClick={handleWhatsApp} className="p-1.5 bg-[#25D366]/10 text-[#25D366] rounded-md active:scale-95 transition-all"><MessageCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <input type="text" name="customerName" placeholder="Full Name *" value={formData.customerName} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" />
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" name="customerPhone" placeholder="WhatsApp Number" value={formData.customerPhone} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                      <textarea name="customerLocation" placeholder="Address / Location" value={formData.customerLocation} onChange={handleChange} rows="2" className="w-full bg-gray-50 text-xs font-bold text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none resize-none"></textarea>
                    </div>
                  </div>

                  {/* Product Details & Billing */}
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase tracking-wider"><Package className="w-3.5 h-3.5"/> Product & Billing</div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" name="productBrand" placeholder="Brand" value={formData.productBrand} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" />
                      <input type="text" name="productType" placeholder="Item Type *" value={formData.productType} onChange={handleChange} className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" />
                    </div>
                    <textarea name="problem" placeholder="Reported Issue..." value={formData.problem} onChange={handleChange} rows="2" className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none resize-none"></textarea>
                    
                    {/* Admin Editable Bill Amount */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 flex justify-between">
                        <span>Total Bill Amount (₹)</span>
                        <span className="text-[9px] text-[#C82327] uppercase tracking-wider">Admin Editable</span>
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C82327]" />
                        <input 
                          type="number" name="amount" value={formData.amount} onChange={handleChange} 
                          className="w-full bg-red-50 text-base font-black text-[#C82327] pl-10 pr-4 py-3 rounded-xl border border-red-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/40" 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Device Upload Gallery */}
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50">
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Product Images</span>
                      <button onClick={() => fileInputRef.current?.click()} className="text-[#C82327] font-bold text-[10px] bg-red-50 px-2 py-1 rounded-md active:scale-95 transition-transform">+ Add Photos</button>
                    </label>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                    
                    {formData.images.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2 mt-3">
                        {formData.images.map((img, idx) => (
                          <div key={idx} onClick={() => setViewingImage(img)} className="w-16 h-16 flex-shrink-0 relative rounded-xl border border-gray-200 overflow-hidden cursor-pointer">
                            <img src={img} className="w-full h-full object-cover" alt={`Img ${idx}`} />
                            <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 z-10"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Intake/Inspection Notes */}
                  <div className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Notes</h3>
                      <button onClick={addPoint} className="text-[#C82327] flex items-center gap-1 text-[9px] font-bold bg-red-50 px-2 py-1 rounded-md active:scale-95 transition-transform">
                        <Plus className="w-3 h-3" /> Add Point
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.inspectionPoints.map((point, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <span className="text-[#C82327] font-black text-lg leading-none">•</span>
                          <input 
                            type="text" placeholder="Note detail..." value={point} onChange={(e) => handlePointChange(index, e.target.value)} 
                            className="flex-1 bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-lg border border-gray-100 focus:ring-2 focus:ring-[#C82327]/20 outline-none" 
                          />
                          <button onClick={() => removePoint(index)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {formData.inspectionPoints.length === 0 && <p className="text-[10px] font-bold text-gray-300 italic">No notes added.</p>}
                    </div>
                  </div>

                </div>

                {/* Fixed Save Button Inside Modal */}
                <div className="flex-shrink-0 pt-3 border-t border-gray-100 mt-1">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-white bg-[#C82327] shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Saving to Database..." : <><Database className="w-5 h-5"/> {scanResult === 'new' ? 'Save & Register' : 'Save Modifications'}</>}
                  </button>
                </div>

              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
} 