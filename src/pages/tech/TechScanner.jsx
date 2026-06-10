import React, {
  useState,
  useEffect,
  useRef
} from 'react';

import {
  motion,
  AnimatePresence
} from 'framer-motion';

import {
  X,
  User,
  Package,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertCircle,
  Database,
  Settings,
  Activity,
  Phone,
  MapPin,
  IndianRupee,
  MessageCircle,
  PhoneCall,
  Camera
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import {
  auth,
  db
} from '../../firebase/firebase';

export default function TechScanner() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const scannerStarted = useRef(false);

  // =========================
  // UI STATES
  // =========================
  const [scanResult, setScanResult] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [viewingImage, setViewingImage] =
    useState(null);

  // Tracks if this task belongs to another technician
  const [isOtherTech, setIsOtherTech] = useState(false);

  // =========================
  // FORM DATA
  // =========================
  const [formData, setFormData] =
    useState({
      id: '',

      status: 'pending',

      receivedAt:
        new Date()
          .toISOString()
          .split('T')[0],

      completedAt: '',

      techName: '',
      techPhone: '',

      customerName: '',
      customerPhone: '',
      customerLocation: '',

      productBrand: '',
      productType: '',
      problem: '',

      amount: '',

      images: [],

      inspectionPoints: [],

      createdAt: null
    });

  // =========================
  // CLOUDINARY UPLOAD
  // =========================
 const uploadToCloudinary = async (file) => {

  const cloudName =
    import.meta.env
      .VITE_CLOUDINARY_CLOUD_NAME;

  const uploadPreset =
    import.meta.env
      .VITE_CLOUDINARY_UPLOAD_PRESET;

  const data = new FormData();

  data.append('file', file);

  data.append(
    'upload_preset',
    uploadPreset
  );

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: data
    }
  );

  const uploaded =
    await res.json();

  console.log(uploaded);

  if (!uploaded.secure_url) {
    throw new Error(
      uploaded.error?.message ||
      'Cloudinary upload failed'
    );
  }

  return uploaded.secure_url;
};
  // =========================
  // START SCANNER
  // =========================
  
useEffect(() => {
  if (scannerStarted.current) return;

  scannerStarted.current = true;

  const startScanner = async () => {
    try {
      // Permission
      const { camera } =
        await BarcodeScanner.requestPermissions();

      if (camera !== "granted") {
        alert("Camera permission denied");
        navigate("/dashboard/tasks");
        return;
      }

      // Check scanner module
      const available =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      console.log(
        "Scanner Module Available:",
        available
      );

      if (!available.available) {
        alert(
          "Downloading scanner module...\nPlease wait."
        );

        await BarcodeScanner.installGoogleBarcodeScannerModule();

        // Re-check after install
        const recheck =
          await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

        console.log(
          "Scanner Module Recheck:",
          recheck
        );

        if (!recheck.available) {
          throw new Error(
            "Google Barcode Scanner module installation failed. Please update Google Play Services."
          );
        }
      }

      // Start scanning
      const result =
        await BarcodeScanner.scan();

      console.log(
        "Scan Result:",
        result
      );

      // No QR found
      if (!result?.barcodes?.length) {
        alert("No QR code detected");
        return;
      }

      const scannedId =
        result.barcodes[0]?.rawValue;

      if (!scannedId) {
        alert("Invalid QR code");
        return;
      }

      console.log(
        "Scanned ID:",
        scannedId
      );

      // =========================
      // CURRENT USER
      // =========================

      const currentUser =
        auth.currentUser;

      let technicianName = "";
      let technicianPhone = "";

      if (currentUser) {
        const techRef = doc(
          db,
          "technicians",
          currentUser.uid
        );

        const techSnap =
          await getDoc(techRef);

        if (techSnap.exists()) {
          const techData =
            techSnap.data();

          technicianName =
            techData.fullName || "";

          technicianPhone =
            techData.phone || "";
        }
      }

      // =========================
      // SERVICE CHECK
      // =========================

      const serviceRef = doc(
        db,
        "services",
        scannedId
      );

      const serviceSnap =
        await getDoc(serviceRef);

      if (serviceSnap.exists()) {
        const existingData =
          serviceSnap.data();

        const otherTechClaimed =
          existingData.techName &&
          technicianName &&
          existingData.techName !==
            technicianName;

        setIsOtherTech(
          otherTechClaimed
        );

        setFormData((prev) => ({
          ...prev,
          ...existingData,
          id: scannedId,
          status:
            existingData?.status ??
            "pending",

          receivedAt:
            existingData.receivedAt ||
            new Date()
              .toISOString()
              .split("T")[0],

          completedAt:
            existingData.completedAt ||
            "",

          techName:
            otherTechClaimed
              ? existingData.techName
              : existingData.techName ||
                technicianName,

          techPhone:
            otherTechClaimed
              ? existingData.techPhone
              : existingData.techPhone ||
                technicianPhone,

          images:
            (
              existingData.images ||
              []
            )
              .map((img) =>
                typeof img === "string"
                  ? img
                  : img?.secure_url ||
                    img?.url
              )
              .filter(Boolean),

          inspectionPoints:
            existingData.inspectionPoints ||
            []
        }));

        setScanResult("existing");
      } else {
        const today =
          new Date()
            .toISOString()
            .split("T")[0];

        setIsOtherTech(false);

        setFormData((prev) => ({
          ...prev,
          id: scannedId,
          status: "pending",
          receivedAt: today,
          completedAt: "",
          techName: technicianName,
          techPhone: technicianPhone,
          customerName: "",
          customerPhone: "",
          customerLocation: "",
          productBrand: "",
          productType: "",
          problem: "",
          amount: "",
          images: [],
          inspectionPoints: [],
          createdAt: null
        }));

        setScanResult("new");
      }
    } catch (err) {
      console.error(
        "Scanner Error:",
        err
      );

      let message =
        "Scanner failed";

      if (
        err?.message?.includes(
          "Google Barcode Scanner"
        )
      ) {
        message =
          "Please update Google Play Services and try again.";
      } else if (err?.message) {
        message = err.message;
      }

      alert(message);
    }
  };

  startScanner();
}, [navigate]);

  // =========================
  // HANDLE INPUT
  // =========================
  const handleChange = (e) => {
    setFormData({
      ...formData,

      [e.target.name]:
        e.target.value
    });
  };

  // =========================
  // STATUS
  // =========================
const handleStatusChange = (newStatus) => {
  const current = formData.status;

  const flow = ['pending', 'in_progress', 'completed', 'delivered'];

  const currentIndex = flow.indexOf(current);
  const newIndex = flow.indexOf(newStatus);

  // prevent going backwards
  if (newIndex < currentIndex) {
    alert('You cannot move status backward');
    return;
  }

  // enforce order skipping
  if (newStatus === 'completed' && current !== 'in_progress') {
    alert('Move to In Progress first');
    return;
  }

  setFormData(prev => ({
    ...prev,
    status: newStatus,
    completedAt:
      newStatus === 'completed' || newStatus === 'delivered'
        ? prev.completedAt || new Date().toISOString().split('T')[0]
        : ''
  }));
};

  // Dynamically resolve allowed statuses
  let allowedStatuses = ['pending', 'in_progress', 'completed'];
  if (formData.status === 'completed' || formData.status === 'delivered') {
    allowedStatuses.push('delivered');
  }
  if (isOtherTech) {
    allowedStatuses = [formData.status, 'delivered'];
  }
  allowedStatuses = [...new Set(allowedStatuses)]; 

  // =========================
  // NOTES
  // =========================
  const handlePointChange = (
    index,
    value
  ) => {
    const updated = [
      ...(formData.inspectionPoints ||
        [])
    ];

    updated[index] = value;

    setFormData({
      ...formData,
      inspectionPoints: updated
    });
  };

  const addPoint = () => {
    setFormData({
      ...formData,

      inspectionPoints: [
        ...(formData.inspectionPoints ||
          []),

        ''
      ]
    });
  };

  const removePoint = (index) => {
    setFormData({
      ...formData,

      inspectionPoints:
        (
          formData.inspectionPoints ||
          []
        ).filter(
          (_, i) => i !== index
        )
    });
  };

  // =========================
  // IMAGE UPLOAD (GALLERY)
  // =========================
  const handleImageUpload =
    async (e) => {
      try {
        const files = Array.from(
          e.target.files
        );

        if (!files.length) return;

        setIsSaving(true);

        const uploadedUrls = [];

        for (const file of files) {
          const imageUrl =
            await uploadToCloudinary(
              file
            );
          
          if(imageUrl) {
            uploadedUrls.push(imageUrl);
          }
        }

        setFormData((prev) => ({
          ...prev,

          images: [
            ...(prev.images || []),

            ...uploadedUrls
          ]
        }));
      } catch (err) {
        console.error(err);

        alert(
          'Image upload failed'
        );
      } finally {
        setIsSaving(false);
      }
    };

  // =========================
  // IMAGE UPLOAD (CAMERA)
  // =========================
  const handleNativeImageUpload = async () => {
    if (isOtherTech) return;
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl, 
        source: CameraSource.Camera 
      });

      setIsSaving(true);

      const imageUrl = await uploadToCloudinary(image.dataUrl);

      if (imageUrl) {
        setFormData((prev) => ({
          ...prev,
          images: [
            ...(prev.images || []),
            imageUrl
          ]
        }));
      }
    } catch (err) {
      if (err.message !== 'User cancelled photos app') {
        console.error(err);
        alert('Camera upload failed');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,

      images: (
        formData.images || []
      ).filter(
        (_, i) => i !== index
      )
    });
  };

  // =========================
  // SAVE
  // =========================
const handleSave = async () => {

  if (
    !formData.customerName ||
    !formData.productType
  ) {
    alert(
      'Please fill customer name and item type'
    );
    return;
  }

  // BILL AMOUNT REQUIRED
  if (
    (formData.status === 'completed' ||
      formData.status === 'delivered') &&
    !formData.amount
  ) {
    alert(
      'Bill amount required for completed/delivered status'
    );
    return;
  }

  setIsSaving(true);

  try {

    const cleanData = {

      id: formData.id || '',

      status:
        formData.status || 'pending',

      receivedAt:
        formData.receivedAt || '',

      completedAt:
        (formData.status === 'completed' ||
          formData.status === 'delivered')
          ? (
              formData.completedAt ||
              new Date()
                .toISOString()
                .split('T')[0]
            )
          : '',

      techName:
        formData.techName || '',

      techPhone:
        formData.techPhone || '',

      customerName:
        formData.customerName || '',

      customerPhone:
        formData.customerPhone || '',

      customerLocation:
        formData.customerLocation || '',

      productBrand:
        formData.productBrand || '',

      productType:
        formData.productType || '',

      problem:
        formData.problem || '',

      amount:
        formData.amount || '',

      images: Array.isArray(formData.images)
        ? formData.images.filter(Boolean)
        : [],

      inspectionPoints:
        Array.isArray(
          formData.inspectionPoints
        )
          ? formData.inspectionPoints.filter(
              Boolean
            )
          : []
    };

    const serviceRef = doc(
      db,
      'services',
      cleanData.id
    );

    if (scanResult === 'new') {

      await setDoc(serviceRef, {
        ...cleanData,
        createdAt: serverTimestamp()
      });

    } else {

      await updateDoc(
        serviceRef,
        cleanData
      );

    }

    const currentUser = auth.currentUser;

    // UPDATE TECHNICIAN ACTIVE TASK
    if (currentUser && !isOtherTech) {

      const techRef = doc(
        db,
        'technicians',
        currentUser.uid
      );

      // CLEAR TASK IF DELIVERED
      if (
        cleanData.status ===
        'delivered'
      ) {

        await updateDoc(techRef, {
          currentTask: null
        });

      } else {

        await updateDoc(techRef, {
          currentTask: {
            id: cleanData.id,
            item:
              cleanData.productType
          }
        });

      }

    }

    alert(
      scanResult === 'new'
        ? 'New Service Registered'
        : 'Service Updated'
    );

    navigate('/dashboard/tasks');

  } catch (err) {

    console.error(
      'Firebase Save Error:',
      err
    );

    alert(
      'Failed to save to database'
    );

  } finally {

    setIsSaving(false);

  }
};

  return (
    <div className="relative min-h-screen bg-transparent font-sans flex flex-col">

      {/* IMAGE VIEWER */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              setViewingImage(null)
            }
          >
            <div
              className="relative bg-white p-2 rounded-2xl max-w-3xl w-full"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                className="absolute -top-4 -right-4 p-2 bg-[#C82327] rounded-full text-white"
                onClick={() =>
                  setViewingImage(null)
                }
              >
                <X className="w-5 h-5" />
              </button>

              <img
                src={viewingImage}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <AnimatePresence>
        {scanResult && (
          <>
            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />

            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">

              <motion.div
                initial={{
                  scale: 0.95,
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  scale: 0.95,
                  opacity: 0,
                  y: 20
                }}
                className="w-full max-w-lg bg-[#FAFAFA] rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col pointer-events-auto"
              >

                {/* HEADER */}
                <div className="flex justify-between items-center mb-3">

                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      {scanResult ===
                      'new'
                        ? 'New Service'
                        : 'Service Details'}
                    </h3>

                    <p className="text-[10px] font-bold text-[#C82327] uppercase">
                      ID :
                      {' '}
                      {formData.id}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      navigate(
                        '/dashboard/tasks'
                      )
                    }
                    className="bg-gray-200 p-2 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">

                  {/* ALERT FOR NEW */}
                  {scanResult ===
                    'new' && (
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-start gap-3">

                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />

                      <p className="text-[10px] font-bold text-orange-800">
                        New QR detected.
                        Fill the form and
                        save.
                      </p>

                    </div>
                  )}

                  {/* ALERT FOR LOCKED RECORD */}
                  {isOtherTech && (
                    <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                      <p className="text-[10px] font-bold text-gray-700">
                        This service is managed by {formData.techName}. Fields are locked, but you can mark it as delivered.
                      </p>
                    </div>
                  )}

                  {/* STATUS */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-50 space-y-4">

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase">

                      <Settings className="w-3.5 h-3.5" />

                      System Status

                    </div>

                    <div className="bg-gray-50 p-1.5 rounded-xl flex gap-1 border border-gray-100">

                      {allowedStatuses.map((s) => (
                        <button
                          key={s}
                          onClick={() =>
                            handleStatusChange(
                              s
                            )
                          }
                          className={`flex-1 py-2.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
  (formData.status || 'pending') === s
    ? 'bg-[#C82327] text-white'
    : 'text-gray-400'
}`}
                        >
                          {s.replace(
                            '_',
                            ' '
                          )}
                        </button>
                      ))}
                      
                    </div>

                    {/* TECH */}
                    <div className="grid grid-cols-2 gap-3">

                      <input
                        type="text"
                        value={
                          formData.techName
                        }
                        disabled
                        className="w-full bg-gray-100 text-xs font-bold text-gray-700 px-3 py-3 rounded-xl"
                      />

                      <input
                        type="text"
                        value={
                          formData.techPhone
                        }
                        disabled
                        className="w-full bg-gray-100 text-xs font-bold text-gray-700 px-3 py-3 rounded-xl"
                      />

                    </div>
                    <div className="grid grid-cols-2 gap-3">

  <div>
    <label className="block text-[10px] font-bold text-gray-400 mb-1">
      Received At
    </label>

    <input
  type="date"
  name="receivedAt"
  value={formData.receivedAt || ''}
  disabled
  className="w-full bg-gray-100 text-xs font-bold px-3 py-3 rounded-xl border border-gray-100 outline-none"
/>
  </div>

  <div>
    <label className="block text-[10px] font-bold text-gray-400 mb-1">
      Completed At
    </label>

    <input
      type="date"
      name="completedAt"
      value={formData.completedAt}
      onChange={handleChange}
      disabled
      className="w-full bg-gray-100 text-xs font-bold px-3 py-3 rounded-xl border border-gray-100 outline-none"
    />
  </div>

</div>
                  </div>

                  {/* CUSTOMER */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-50 space-y-3">

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase">

                      <User className="w-3.5 h-3.5" />

                      Customer Info

                    </div>

                    <input
                      type="text"
                      name="customerName"
                      placeholder="Customer Name"
                      value={
                        formData.customerName
                      }
                      onChange={
                        handleChange
                      }
                      disabled={isOtherTech}
                      className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 outline-none disabled:opacity-60"
                    />

                    <input
                      type="tel"
                      name="customerPhone"
                      placeholder="Phone"
                      value={
                        formData.customerPhone
                      }
                      onChange={
                        handleChange
                      }
                      disabled={isOtherTech}
                      className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 outline-none disabled:opacity-60"
                    />

                    <textarea
                      name="customerLocation"
                      rows="2"
                      placeholder="Location"
                      value={
                        formData.customerLocation
                      }
                      onChange={
                        handleChange
                      }
                      disabled={isOtherTech}
                      className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 outline-none resize-none disabled:opacity-60"
                    />
                  </div>

                  {/* PRODUCT */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-50 space-y-3">

                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase">

                      <Package className="w-3.5 h-3.5" />

                      Product Details

                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <input
                        type="text"
                        name="productBrand"
                        placeholder="Brand"
                        value={
                          formData.productBrand
                        }
                        onChange={
                          handleChange
                        }
                        disabled={isOtherTech}
                        className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 outline-none disabled:opacity-60"
                      />

                      <input
                        type="text"
                        name="productType"
                        placeholder="Item Type"
                        value={
                          formData.productType
                        }
                        onChange={
                          handleChange
                        }
                        disabled={isOtherTech}
                        className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 outline-none disabled:opacity-60"
                      />

                    </div>

                    <textarea
                      name="problem"
                      rows="2"
                      placeholder="Problem Description"
                      value={
                        formData.problem
                      }
                      onChange={
                        handleChange
                      }
                      disabled={isOtherTech}
                      className="w-full bg-gray-50 text-xs font-bold px-4 py-3 rounded-xl border border-gray-100 resize-none outline-none disabled:opacity-60"
                    />
                  </div>

                  {/* IMAGES */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-50">

                    <div className="flex items-center justify-between mb-3">

                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C82327] uppercase">

                        <ImageIcon className="w-3.5 h-3.5" />

                        Product Images

                      </div>

                      {!isOtherTech && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              fileInputRef.current?.click()
                            }
                            className="text-gray-600 font-bold text-[10px] bg-gray-100 px-2 py-1.5 rounded-md active:scale-95 transition-transform"
                          >
                            Gallery
                          </button>
                          <button
                            onClick={handleNativeImageUpload}
                            className="text-[#C82327] text-[10px] font-bold bg-red-50 px-2 py-1.5 rounded-md flex items-center gap-1 active:scale-95 transition-transform"
                          >
                            <Camera className="w-3 h-3"/> Camera
                          </button>
                        </div>
                      )}

                    </div>

                    <input
                      ref={
                        fileInputRef
                      }
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={
                        handleImageUpload
                      }
                    />

                    {(formData.images ||
                      []).length >
                      0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">

                        {formData.images.map(
                          (
                            img,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0"
                            >
                             {console.log("Image error solve chyane: ",img)}
                              <img
                                src={
                                  img
                                }
                                alt=""
                                onClick={() =>
                                  setViewingImage(
                                    img
                                  )
                                }
                                className="w-full h-full object-cover cursor-pointer"
                              />

                              {!isOtherTech && (
                                <button
                                  onClick={() =>
                                    removeImage(
                                      index
                                    )
                                  }
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>

                  {/* NOTES */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-50">

                    <div className="flex justify-between items-center mb-3">

                      <h3 className="text-[10px] font-bold text-gray-400 uppercase">
                        Service Notes
                      </h3>

                      {!isOtherTech && (
                        <button
                          onClick={
                            addPoint
                          }
                          className="flex items-center gap-1 text-[#C82327] text-[10px] font-bold bg-red-50 px-2 py-1 rounded-lg"
                        >
                          <Plus className="w-3 h-3" />

                          Add Point
                        </button>
                      )}

                    </div>

                    <div className="space-y-2">

                      {(
                        formData.inspectionPoints ||
                        []
                      ).map(
                        (
                          point,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="flex gap-2 items-center"
                          >

                            <input
                              type="text"
                              value={
                                point
                              }
                              onChange={(
                                e
                              ) =>
                                handlePointChange(
                                  index,
                                  e
                                    .target
                                    .value
                                )
                              }
                              disabled={isOtherTech}
                              placeholder="Service note..."
                              className="flex-1 bg-gray-50 text-xs font-bold px-3 py-2.5 rounded-lg border border-gray-100 outline-none disabled:opacity-60"
                            />

                            {!isOtherTech && (
                              <button
                                onClick={() =>
                                  removePoint(
                                    index
                                  )
                                }
                                className="bg-red-50 p-2 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            )}

                          </div>
                        )
                      )}

                      {(
                        formData.inspectionPoints ||
                        []
                      ).length ===
                        0 && (
                        <p className="text-[10px] text-gray-300 italic">
                          No notes added
                        </p>
                      )}

                    </div>
                  </div>

                  {/* BILLING & ADMIN (Shows only on completed/delivered status) */}
                  {(formData.status === 'completed' || formData.status === 'delivered') && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 uppercase mb-3">
                        <Activity className="w-3.5 h-3.5" />
                        Billing Details
                      </div>
                      
                      <input
                        type="number"
                        name="amount"
                        placeholder="Total Bill Amount (₹)"
                        value={formData.amount}
                        onChange={handleChange}
                        disabled={isOtherTech}
                        className="w-full bg-white text-xs font-bold px-4 py-3 rounded-xl border border-blue-100 outline-none mb-3 disabled:opacity-70"
                      />
                      
                    
                    </div>
                  )}

                </div>

                {/* SAVE */}
                <div className="pt-3 border-t border-gray-100">

                  <button
                    onClick={
                      handleSave
                    }
                    disabled={
                      isSaving
                    }
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-[#C82327] active:scale-95 transition-transform"
                  >

                    {isSaving
                      ? 'Saving...'
                      : (
                        <>
                          <Database className="w-5 h-5" />

                          {scanResult ===
                          'new'
                            ? 'Save Service'
                            : 'Update Service'}
                        </>
                      )}

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