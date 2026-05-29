import React, { useState } from 'react';
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

          await sleep(5); // prevents UI freeze

          const canvas = document.getElementById(`qr-${id}`);
          if (!canvas) continue; // prevent crash

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
          await sleep(2); // prevents freeze

          const canvas = document.getElementById(`qr-${id}`);
          if (!canvas) continue; // safe guard

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
    <div className="min-h-screen bg-[#FAFAFA] pb-24 font-sans">

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

      {/* Header - Flat bottom, no rounded curves */}
      <div className="bg-[#C82327] px-5 pt-12 pb-6 shadow-md">
        <h1 className="text-xl font-black text-white">QR Generator</h1>
        <p className="text-red-100 text-xs font-bold mt-1 uppercase tracking-wider">
          Batch Create Labels
        </p>
      </div>

      {/* Inputs Section */}
      <div className="px-5 py-6 space-y-5">
        
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            ID Prefix
          </label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="w-full p-3.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 transition-all"
            placeholder="e.g., SRV-"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
              Start Number
            </label>
            <input
              type="number"
              value={startNum}
              onChange={(e) => setStartNum(Number(e.target.value))}
              className="w-full p-3.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-3.5 border border-gray-200 rounded-xl bg-white text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C82327]/20 transition-all"
            />
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={() => handleGenerate('pdf')}
            disabled={isGenerating}
            className="w-full bg-[#C82327] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {isGenerating ? (
              "Registering & Generating..."
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Download PDF
              </>
            )}
          </button>

          <button
            onClick={() => handleGenerate('zip')}
            disabled={isGenerating}
            className="w-full bg-white border border-gray-200 text-gray-800 py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            <Archive className="w-5 h-5 text-gray-500" />
            Download ZIP
          </button>
        </div>
      </div>
    </div>
  );
}