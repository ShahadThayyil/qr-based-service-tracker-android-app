import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, User, Package, Settings, Phone, MapPin, Plus, Trash2, Image as ImageIcon, X, Camera } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebase';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

export default function TechTaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    id: '', status: 'pending', receivedAt: '', completedAt: '',
    techName: '', techPhone: '', customerName: '', customerPhone: '',
    customerLocation: '', productBrand: '', productType: '', problem: '',
    amount: '', images: [], inspectionPoints: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null); 
  const [isMine, setIsMine] = useState(false);
  const [currentTechName, setCurrentTechName] = useState('');
  const [previewImages, setPreviewImages] = useState([]);

  // --- FIREBASE: FETCH INITIAL DATA ---
  useEffect(() => {
    const fetchServiceData = async () => {
      if (!id) return;
      try {
        if (auth.currentUser) {
          const techSnap = await getDoc(doc(db, "technicians", auth.currentUser.uid));
          if (techSnap.exists()) setCurrentTechName(techSnap.data().fullName || '');
        }

        const docRef = doc(db, "services", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          data.images = Array.isArray(data.images) ? data.images : [];
          data.inspectionPoints = Array.isArray(data.inspectionPoints) ? data.inspectionPoints : [];
          
          setFormData({ id: docSnap.id, ...data });

          const belongsToMe = 
            data.assignedTo === auth.currentUser?.uid || 
            (data.techName && currentTechName && data.techName === currentTechName);
            
          setIsMine(belongsToMe);
        } else {
          alert("Service record not found!");
          navigate(-1);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        alert("Failed to fetch data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceData();
  }, [id, navigate, currentTechName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- STATUS LOGIC (ONE-WAY PROGRESSION & VALIDATION) ---
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    const current = formData.status;

    // Strict override: if not mine, can ONLY change from completed to delivered
    if (!isMine) {
      if (current !== 'completed' || newStatus !== 'delivered') {
        alert('You can only mark a completed service as delivered.');
        return;
      }
    }
    
    const flow = ['pending', 'in_progress', 'completed', 'delivered'];
    const currentIndex = flow.indexOf(current);
    const newIndex = flow.indexOf(newStatus);

    // Prevent backwards movement
    if (newIndex < currentIndex) {
      alert('You cannot move the status backward.');
      return;
    }

    // Prevent skipping steps
    if (newStatus === 'completed' && current === 'pending') {
      alert('You must move the task to "In Progress" first.');
      return;
    }

    // Require Bill Amount for completed/delivered
    if ((newStatus === 'completed' || newStatus === 'delivered') && !formData.amount) {
      alert('Total Bill Amount is required before updating to this status.');
      return;
    }

    setFormData(prev => ({
      ...prev, 
      status: newStatus,
      completedAt: (newStatus === 'completed' || newStatus === 'delivered') 
        ? (prev.completedAt || new Date().toISOString().split('T')[0]) 
        : prev.completedAt
    }));
  };

  // --- POINTS LOGIC ---
  const handlePointChange = (index, value) => {
    const updatedPoints = [...formData.inspectionPoints];
    updatedPoints[index] = value;
    setFormData(prev => ({ ...prev, inspectionPoints: updatedPoints }));
  };

  const addPoint = () => setFormData(prev => ({ ...prev, inspectionPoints: [...(prev.inspectionPoints || []), ''] }));
  const removePoint = (index) => setFormData(prev => ({ ...prev, inspectionPoints: formData.inspectionPoints.filter((_, i) => i !== index) }));

  // --- CLOUDINARY UPLOAD: CAMERA (FIXED) ---
  const handleNativeImageUpload = async () => {
    if (!isMine) return;
    try {
      // Changed to DataUrl to prevent local Android file path crashes
      const image = await CapacitorCamera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl, 
        source: CameraSource.Camera 
      });

      // Instant preview
      setPreviewImages(prev => [...prev, image.dataUrl]);
      setIsUploading(true);

      const uploadData = new FormData();
      uploadData.append("file", image.dataUrl);
      uploadData.append("upload_preset", "techno-service-manager"); 
      uploadData.append("cloud_name", "dmtzmgbkj"); 

      const res = await fetch("https://api.cloudinary.com/v1_1/dmtzmgbkj/image/upload", {
        method: "POST",
        body: uploadData,
      });
      const json = await res.json();
      
      if (json.secure_url) {
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), json.secure_url] }));
      }
    } catch (e) {
      if (e.message !== 'User cancelled photos app') {
         console.error("Camera error:", e);
         alert(`Camera failed: ${e.message}`);
      }
    } finally {
      setPreviewImages([]); // Clear temporary preview
      setIsUploading(false);
    }
  };

  // --- CLOUDINARY UPLOAD: GALLERY ---
  const handleFallbackImageUpload = async (e) => {
    if (!isMine) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Instant preview
    const localPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewImages(prev => [...prev, ...localPreviews]);
    setIsUploading(true);

    const uploadedUrls = [];
    for (const file of files) {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("upload_preset", "techno-service-manager"); 
      uploadData.append("cloud_name", "dmtzmgbkj"); 

      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dmtzmgbkj/image/upload", {
          method: "POST",
          body: uploadData,
        });
        const json = await res.json();
        if (json.secure_url) uploadedUrls.push(json.secure_url);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
    }
    
    setPreviewImages([]); // Clear temporary previews
    setIsUploading(false);
  };

  const removeImage = (indexToRemove) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== indexToRemove) }));
  };

  // --- FIREBASE: SAVE DATA ---
  const handleSave = async () => {
    // Final sanity check before saving
    if ((formData.status === 'completed' || formData.status === 'delivered') && !formData.amount) {
      alert("Total Bill Amount is required to save this service as Completed or Delivered.");
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, "services", id);
      await updateDoc(docRef, formData);

      // Update Technician's active task
      if (isMine && auth.currentUser) {
        const techRef = doc(db, 'technicians', auth.currentUser.uid);
        await updateDoc(techRef, {
          currentTask: formData.status === 'delivered' 
            ? null 
            : { id: formData.id || id, item: formData.productType }
        });
      }

      alert('Service Details Successfully Saved!');
      navigate(-1);
    } catch (error) {
      console.error("Error updating document:", error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Framer motion variants
  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariant = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C82327] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Combine real images with instant preview images for UI rendering
  const displayImages = [...(formData.images || []), ...previewImages];
  
  // Determine if Save button should be visible (Mine OR Not Mine but they are interacting with delivery)
  const canSave = isMine || (!isMine && (formData.status === 'completed' || formData.status === 'delivered'));

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      
      {/* Full-Screen Image Viewer Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setViewingImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white p-2 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()} 
            >
              <button 
                className="absolute -top-4 -right-4 p-2.5 bg-[#C82327] rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all z-10"
                onClick={() => setViewingImage(null)}
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-full bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={viewingImage} alt="Enlarged product" className="max-w-full max-h-[80vh] object-contain" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="bg-[#C82327] rounded-b-3xl px-4 pt-12 pb-6 shadow-md relative z-20 overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center transition-all text-white active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Service Details</h1>
              <p className="text-red-100 text-xs font-medium mt-0.5">ID: {formData.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24"> 
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          
          {/* Status & Assignment Card */}
          <motion.div variants={itemVariant} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#C82327]">
                <Settings className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">System Status</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Current Status</label>
                  <select 
                    name="status" 
                    value={formData.status || 'pending'} 
                    onChange={handleStatusChange}
                    disabled={formData.status === 'delivered' || (!isMine && formData.status !== 'completed')}
                    className="w-full bg-gray-50 text-sm font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Received At</label>
                  <input 
                    type="date" name="receivedAt" value={formData.receivedAt || ''} onChange={handleChange} disabled={!isMine}
                    className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Completed At</label>
                  <input 
                    type="date" name="completedAt" value={formData.completedAt || ''} onChange={handleChange} disabled={!isMine}
                    className="w-full bg-gray-50 text-xs font-bold text-gray-900 px-3 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" 
                  />
                </div>
                
                <div className="col-span-2 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Tech Name</label>
                    <input type="text" value={formData.techName || ''} disabled className="w-full bg-gray-100 text-xs font-bold text-gray-500 px-3 py-3 rounded-xl border border-gray-100 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Tech Phone</label>
                    <input type="tel" value={formData.techPhone || ''} disabled className="w-full bg-gray-100 text-xs font-bold text-gray-500 px-3 py-3 rounded-xl border border-gray-100 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Customer Details Card */}
          <motion.div variants={itemVariant} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50">
            <div className="flex items-center gap-2 mb-4 text-[#C82327]">
              <User className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Customer Info</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Full Name</label>
                <input type="text" name="customerName" value={formData.customerName || ''} onChange={handleChange} disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" name="customerPhone" value={formData.customerPhone || ''} onChange={handleChange} disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
                  <textarea name="customerLocation" value={formData.customerLocation || ''} onChange={handleChange} rows="2" disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 pl-10 pr-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 resize-none disabled:opacity-70"></textarea>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product & Billing Info Card */}
          <motion.div variants={itemVariant} className="bg-white p-4 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-gray-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#C82327]">
                <Package className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Product & Billing</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Brand</label>
                  <input type="text" name="productBrand" value={formData.productBrand || ''} onChange={handleChange} disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Type</label>
                  <input type="text" name="productType" value={formData.productType || ''} onChange={handleChange} disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" />
                </div>
              </div>

              {/* Modifiable Bill Amount (Blocked if delivered) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5 flex justify-between">
                  <span>Total Bill Amount (₹)</span>
                </label>
                <input 
                  type="number" 
                  name="amount" 
                  value={formData.amount || ''} 
                  onChange={handleChange} 
                  disabled={!isMine || formData.status === 'delivered'}
                  className="w-full bg-red-50 text-lg font-black text-[#C82327] px-4 py-3 rounded-xl border border-red-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/40 disabled:opacity-70" 
                  placeholder="0.00" 
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Reported Issue</label>
                <textarea name="problem" value={formData.problem || ''} onChange={handleChange} rows="2" disabled={!isMine} className="w-full bg-gray-50 text-sm font-bold text-gray-900 px-4 py-3 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 resize-none disabled:opacity-70"></textarea>
              </div>

              {/* Product Images */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Product Images</span>
                  {isMine && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        className="text-gray-600 font-bold text-[10px] bg-gray-100 px-2 py-1.5 rounded-md active:scale-95 transition-transform disabled:opacity-50"
                      >
                        Gallery
                      </button>
                      <button 
                        onClick={handleNativeImageUpload} 
                        disabled={isUploading}
                        className="text-[#C82327] font-bold text-[10px] bg-red-50 px-2 py-1.5 rounded-md flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        <Camera className="w-3 h-3"/> Camera
                      </button>
                    </div>
                  )}
                </label>
                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFallbackImageUpload} />
                
                {displayImages.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {displayImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setViewingImage(img)}
                        className={`w-20 h-20 flex-shrink-0 relative rounded-xl border border-gray-200 overflow-hidden cursor-pointer group ${isUploading && previewImages.includes(img) ? 'opacity-50 animate-pulse' : ''}`}
                      >
                        <img src={img} alt={`Product ${idx+1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                        
                        {isMine && !previewImages.includes(img) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }} 
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10 opacity-80 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-300 italic">No images attached.</p>
                )}
              </div>

              {/* Inspection Notes */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Inspection Notes</h3>
                  {isMine && (
                    <button onClick={addPoint} className="text-[#C82327] flex items-center gap-1 text-[10px] font-bold bg-red-50 px-2 py-1 rounded-md active:scale-95 transition-transform">
                      <Plus className="w-3 h-3" /> Add Point
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {(formData.inspectionPoints || []).map((point, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="text-[#C82327] font-black text-lg leading-none">•</span>
                      <input 
                        type="text" placeholder="e.g. Broken dial replaced" value={point} onChange={(e) => handlePointChange(index, e.target.value)} disabled={!isMine}
                        className="flex-1 bg-gray-50 text-xs font-bold text-gray-900 px-3 py-2.5 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 disabled:opacity-70" 
                      />
                      {isMine && (
                        <button onClick={() => removePoint(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 rounded-lg active:scale-95">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!formData.inspectionPoints || formData.inspectionPoints.length === 0) && (
                    <p className="text-xs font-bold text-gray-400 italic">No notes recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Standard Save Button */}
          {canSave && (
            <motion.button 
              variants={itemVariant}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-[#C82327] text-white py-4 rounded-2xl font-bold shadow-xl shadow-red-900/20 disabled:opacity-70 transition-all"
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Modifications
                </>
              )}
            </motion.button>
          )}

        </motion.div>
      </div>
    </div>
  );
}