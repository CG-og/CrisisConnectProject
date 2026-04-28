import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Upload, Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default function UploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [latestSummary, setLatestSummary] = useState<string | null>(null);

  const seedDemoData = async () => {
    setStatus('processing');
    try {
      const demoReports = [
        { 
          summary: "Severe flooding reported in North Delhi block. 50 families displaced, immediate need for drinking water and dry rations.", 
          transcription: "Disaster Assessment Form\nLocation: North Delhi, Jahangirpuri Block B\nType: Flash Floods\nDetails: Water level rising quickly since 4 AM. Primary school submerged. Approx 50 households evacuated to high ground. Need: Food, clean water, blankets.",
          urgency_score: 9, 
          lat: 28.7041, 
          lng: 77.1025, 
          imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993a9e8?auto=format&fit=crop&q=80&w=200" 
        },
        { 
          summary: "Structural damage to local school building. No casualties but area evacuated. Tarps and temporary shelter requested.", 
          transcription: "Site Survey\nArea: South Delhi, Saket Market Area\nIncident: Wall collapse after heavy rain\nStatus: Building unstable. No injuries. Crowds redirected. School closed until structural check. Request: 10 large tarps for temporary cover.",
          urgency_score: 6, 
          lat: 28.6139, 
          lng: 77.2090, 
          imageUrl: "https://images.unsplash.com/photo-1580974852861-ce383320f781?auto=format&fit=crop&q=80&w=200" 
        },
        { 
          summary: "Outbreak of water-borne illness in temporary camp. Medical supplies and chlorine tablets needed urgently.", 
          transcription: "Medical Help Desk - Camp Alpha\nIssue: Gastrointestinal cases reported in 12 children. Suspected water contamination.\nNeeds: Medical staff, IV fluids, ORS packets, Chlorine tablets for 500 liters capacity.",
          urgency_score: 8, 
          lat: 28.5355, 
          lng: 77.3910, 
          imageUrl: "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=200" 
        },
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.7 to keep it small for Firestore (limit 1MB)
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(base64);
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input value so that the user can pick the same file again if needed
    e.target.value = "";

    try {
      setUploading(true);
      setStatus('uploading');
      setProgress(10);
      setLatestSummary(null);
      
      console.log("Starting local AI processing for:", file.name);

      // 1. Compress image for storage in Firestore
      const compressedImage = await compressImage(file);
      setProgress(30);

      // 2. Process with Gemini AI locally on the frontend
      const base64Data = compressedImage.split(',')[1];
      
      setStatus('processing');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "You are a disaster response AI. Read this handwritten survey (it may be in Hindi or another Indian language). 1. Provide a full verbatim transcription of the sheet in English. 2. Provide a 2-sentence executive summary of the critical needs. 3. Assign an urgency score from 1-10. 4. Finally, generate mock latitude and longitude coordinates near New Delhi, India for demo purposes (lat between 28.5 and 28.7, lng between 77.1 and 77.3)." },
              { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: { type: Type.STRING },
              summary: { type: Type.STRING },
              urgency_score: { type: Type.NUMBER },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["transcription", "summary", "urgency_score", "lat", "lng"]
          }
        }
      });

      const responseText = response.text || "{}";
      const reportData = JSON.parse(responseText.replace(/```json|```/g, "").trim());
      console.log("AI result:", reportData);

      setProgress(80);
      setLatestSummary(reportData.summary);

      // 3. Save the final report to Firestore with the base64 image
      await addDoc(collection(db, 'reports'), {
        summary: reportData.summary,
        transcription: reportData.transcription,
        urgency_score: reportData.urgency_score,
        lat: reportData.lat,
        lng: reportData.lng,
        imageUrl: compressedImage, // Using base64 directly
        createdAt: serverTimestamp()
      });

      setProgress(100);
      setStatus('done');
      setUploading(false);
      
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setLatestSummary(null);
      }, 8000);

    } catch (err: any) {
      console.error("Upload/Processing failed:", err);
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
            <div className="flex flex-col items-center text-green-600 px-4">
              <CheckCircle2 className="w-10 h-10 mb-2" />
              <p className="font-bold text-lg">Report Successfully Processed!</p>
              {latestSummary && (
                <div className="mt-4 p-4 bg-green-100 rounded-lg text-left w-full border border-green-200">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-green-700 mb-1 leading-none">Intelligence Summary</p>
                  <p className="text-sm text-green-800 leading-relaxed italic">"{latestSummary}"</p>
                </div>
              )}
              <p className="text-xs mt-4 text-green-500">Added to live dashboard and heatmap.</p>
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
