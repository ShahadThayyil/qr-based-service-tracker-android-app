import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Download, FileText, Archive, CheckCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function AdminQRGenerator() {
  const [prefix, setPrefix] = useState('SRV-');
  const [startNum, setStartNum] = useState(1050);
  const [quantity, setQuantity] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const getQRDataUrl = (id) => {
    const canvas = document.getElementById(`qr-${id}`);
    if (!canvas) {
      throw new Error(`QR canvas not found: ${id}`);
    }
    return canvas.toDataURL("image/png");
  };

  const handleGenerate = async (type) => {
    setIsGenerating(true);

    const ids = Array.from(
      { length: quantity },
      (_, i) => `${prefix}${startNum + i}`
    );

    try {
      // ---------------- FIREBASE INTEGRATION ----------------
      // Register these IDs in Firebase so the scanner recognizes them
      for (const id of ids) {
        const docRef = doc(db, "services", id);
        const docSnap = await getDoc(docRef);
        
        // Only create the document if it doesn't already exist to prevent overwriting old data
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            id: id,
            status: 'qr_printed', // Indicates a label was printed but no device received yet
            createdAt: serverTimestamp()
          });
        }
      }

      // ---------------- PDF ----------------
      if (type === 'pdf') {
        const doc = new jsPDF('p', 'mm', 'a4');

        let x = 10, y = 10;

        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];

          await sleep(5); // ✅ prevents UI freeze

          const canvas = document.getElementById(`qr-${id}`);
          if (!canvas) continue; // ✅ prevent crash

          const imgData = canvas.toDataURL("image/png");

          doc.addImage(imgData, 'PNG', x, y, 30, 30);
          doc.text(id, x + 5, y + 35);

          x += 40;
          if (x > 170) { x = 10; y += 40; }
          if (y > 250) { doc.addPage(); y = 10; }
        }

        const pdfBase64 = doc.output('datauristring').split(',')[1];

        if (Capacitor.getPlatform() === 'web') {
          doc.save(`QR_Labels_${prefix}.pdf`);
        } else {
          await Filesystem.writeFile({
            path: `QR_Labels_${prefix}.pdf`,
            data: pdfBase64,
            directory: Directory.Documents,
          });
        }
      }

      // ---------------- ZIP ----------------
      if (type === 'zip') {
        const zip = new JSZip();

        for (const id of ids) {
          await sleep(2); // ✅ prevents freeze

          const canvas = document.getElementById(`qr-${id}`);
          if (!canvas) continue; // ✅ safe guard

          const imgData = canvas.toDataURL("image/png").split(',')[1];
          zip.file(`${id}.png`, imgData, { base64: true });
        }

        const blob = await zip.generateAsync({ type: "base64" });

        if (Capacitor.getPlatform() === 'web') {
          const link = document.createElement('a');
          link.href = "data:application/zip;base64," + blob;
          link.download = `QR_Codes_${prefix}.zip`;
          link.click();
        } else {
          await Filesystem.writeFile({
            path: `QR_Codes_${prefix}.zip`,
            data: blob,
            directory: Directory.Documents,
          });
        }
      }

    } catch (err) {
      console.error("Generation Error:", err);
      alert("Failed to generate. Check console for details.");
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">

      {/* Hidden QR Generator */}
      <div className="hidden">
        {Array.from({ length: quantity }, (_, i) => `${prefix}${startNum + i}`).map(id => (
          <QRCodeCanvas
            key={id}
            id={`qr-${id}`}
            value={id}
            size={256}
          />
        ))}
      </div>

      {/* Header */}
      <div className="bg-[#C82327] rounded-b-3xl px-4 pt-12 pb-6 shadow-md">
        <h1 className="text-xl font-bold text-white">QR Generator</h1>
      </div>

      {/* Inputs */}
      <div className="px-4 py-4 space-y-4">
        <input
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          className="w-full p-3 border rounded-xl"
        />

        <input
          type="number"
          value={startNum}
          onChange={(e) => setStartNum(Number(e.target.value))}
          className="w-full p-3 border rounded-xl"
        />

        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full p-3 border rounded-xl"
        />

        <button
          onClick={() => handleGenerate('pdf')}
          className="w-full bg-[#C82327] text-white py-4 rounded-xl font-bold"
          disabled={isGenerating}
        >
          {isGenerating ? "Registering & Generating..." : "Download PDF"}
        </button>

        <button
          onClick={() => handleGenerate('zip')}
          className="w-full bg-white border py-4 rounded-xl font-bold"
          disabled={isGenerating}
        >
          Download ZIP
        </button>
      </div>
    </div>
  );
}