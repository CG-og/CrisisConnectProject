import React, { useState } from 'react';
import { storage, db } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Upload, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { motion } from 'motion/react';

export default function UploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');

  const seedDemoData = async () => {
    setStatus('processing');
    try {
      const demoReports = [
        { summary: "Severe flooding reported in North Delhi block. 50 families displaced, immediate need for drinking water and dry rations.", urgency_score: 9, lat: 28.7041, lng: 77.1025, imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993a9e8?auto=format&fit=crop&q=80&w=200" },
        { summary: "Structural damage to local school building. No casualties but area evacuated. Tarps and temporary shelter requested.", urgency_score: 6, lat: 28.6139, lng: 77.2090, imageUrl: "https://images.unsplash.com/photo-1580974852861-ce383320f781?auto=format&fit=crop&q=80&w=200" },
        { summary: "Outbreak of water-borne illness in temporary camp. Medical supplies and chlorine tablets needed urgently.", urgency_score: 8, lat: 28.5355, lng: 77.3910, imageUrl: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=200" },
      ];

      for (const report of demoReports) {
        await addDoc(collection(db, 'reports'), {
          ...report,
          createdAt: serverTimestamp()
        });
      }
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setStatus('uploading');
      
      const storageRef = ref(storage, `surveys/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        }, 
        (error) => {
          console.error("Upload error:", error);
          setStatus('error');
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setStatus('processing');
          
          // Send to AI API
          const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: downloadURL })
          });

          if (!response.ok) throw new Error("Processing failed");
          
          const aiData = await response.json();

          // Save to Firestore
          await addDoc(collection(db, 'reports'), {
            ...aiData,
            imageUrl: downloadURL,
            createdAt: serverTimestamp()
          });

          setStatus('done');
          setUploading(false);
          // Optional: reset after a delay
          setTimeout(() => {
            setStatus('idle');
            setProgress(0);
          }, 3000);
        }
      );
    } catch (err) {
      console.error(err);
      setStatus('error');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Survey Photo
        </h2>
        <button
          onClick={seedDemoData}
          disabled={status !== 'idle'}
          className="text-[10px] flex items-center gap-1 px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded transition-colors disabled:opacity-50"
        >
          <Database className="w-3 h-3" />
          Seed Demo Data
        </button>
      </div>
      
      <div className="relative group">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
        />
        <div className={`
          border-2 border-dashed rounded-lg p-10 text-center transition-all
          ${status === 'idle' ? 'border-gray-200 group-hover:border-blue-400 bg-gray-50' : ''}
          ${status === 'uploading' ? 'border-blue-400 bg-blue-50' : ''}
          ${status === 'processing' ? 'border-amber-400 bg-amber-50' : ''}
          ${status === 'done' ? 'border-green-400 bg-green-50' : ''}
          ${status === 'error' ? 'border-red-400 bg-red-50' : ''}
        `}>
          {status === 'idle' && (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" />
              <p className="text-gray-600 font-medium">Click or drag photo of survey</p>
              <p className="text-gray-400 text-sm mt-1">Supports JPG, PNG (Local languages detected automatically)</p>
            </div>
          )}

          {status === 'uploading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
              <p className="text-blue-700 font-medium">Uploading to Secure Storage...</p>
              <div className="w-48 h-2 bg-blue-200 mt-4 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-2" />
              <p className="text-amber-700 font-medium">Gemini AI: Processing & Translating...</p>
              <p className="text-amber-600 text-sm mt-1 italic italic">Analyzing handwriting and disaster zones...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center text-green-600">
              <CheckCircle2 className="w-10 h-10 mb-2" />
              <p className="font-bold text-lg">Report Successfully Processed!</p>
              <p className="text-sm">Added to live dashboard and heatmap.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-red-600">
              <AlertCircle className="w-10 h-10 mb-2" />
              <p className="font-bold text-lg">Processing Failed</p>
              <p className="text-sm">Please try again or check your connection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
