import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Upload, Loader2, CheckCircle2, AlertCircle, Database, FileText, Activity, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ReportResult {
  summary: string;
  transcription: string;
  urgency_score: number;
  lat: number;
  lng: number;
  imageUrl: string;
}

export default function UploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [lastReport, setLastReport] = useState<ReportResult | null>(null);

  const seedDemoData = async () => {
    setStatus('processing');
    try {
      const demoReports = [
        { 
          summary: "Severe flooding reported in North Delhi block. 50 families displaced, immediate need for drinking water and dry rations.", 
          transcription: "# Disaster Assessment Form\n\n**Location:** North Delhi, Jahangirpuri Block B  \n**Incident Type:** Flash Floods  \n\n### Situation Details:\n- Water level rising quickly since 4 AM.\n- Primary school submerged.\n- Approx 50 households evacuated to high ground.\n\n### Immediate Needs:\n| Item | Quantity |\n| :--- | :--- |\n| Drinking Water | 500L |\n| Dry Rations | 100 Packs |\n| Blankets | 200 Units |",
          urgency_score: 9, 
          lat: 28.7041, 
          lng: 77.1025, 
          imageUrl: "https://images.unsplash.com/photo-1547683905-f686c993a9e8?auto=format&fit=crop&q=80&w=200" 
        },
        { 
          summary: "Structural damage to local school building. No casualties but area evacuated. Tarps and temporary shelter requested.", 
          transcription: "# Field Incident Report\n\n**Sector:** South Delhi, Saket Market  \n**Status:** CRITICAL - Structural Instability  \n\n---\n\n**Incident:** Retaining wall collapse followed by facade cracking in Senior Secondary School.  \n**Action Taken:** Immediate evacuation. Perimeter cordoned off.  \n\n**Logistical Request:**\n1. 10x Industrial Grade Tarps\n2. 50x Safety Cones\n3. Structural Engineer assessment within 12 hours.",
          urgency_score: 6, 
          lat: 28.6139, 
          lng: 77.2090, 
          imageUrl: "https://images.unsplash.com/photo-1580974852861-ce383320f781?auto=format&fit=crop&q=80&w=200" 
        },
        { 
          summary: "Outbreak of water-borne illness in temporary camp. Medical supplies and chlorine tablets needed urgently.", 
          transcription: "## Medical Alert - Camp Alpha\n\n**Observation:** 12 Pediatric cases of acute gastroenteritis within 6 hours.  \n**Suspected Source:** Local borehole contamination.  \n\n**SUPPLY LIST:**\n*   [ ] 20x IV Saline Bags\n*   [ ] 500x ORS Individual Packets\n*   [ ] 1000x Chlorine purification tabs\n*   [ ] 2x On-site medical volunteers",
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

    e.target.value = "";

    try {
      setUploading(true);
      setStatus('uploading');
      setProgress(10);
      setLastReport(null);
      
      const compressedImage = await compressImage(file);
      setProgress(30);

      const base64Data = compressedImage.split(',')[1];
      
      setStatus('processing');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "You are a disaster response AI. Read this handwritten survey (it may be in Hindi or another Indian language). 1. Provide a full verbatim transcription of the sheet in English. Use Markdown formatting (bold headers, bullet points, and tables) to closely replicate the structure and layout of the handwritten form. 2. Provide a 2-sentence executive summary of the critical needs. 3. Assign an urgency score from 1-10. 4. Generate mock latitude and longitude coordinates based on the location mentioned in the sheet. If no location is clear, generate coordinates across the broader North and East India region (lat between 20.0 and 35.0, lng between 74.0 and 92.0)." },
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
      
      const finalReport = {
        ...reportData,
        imageUrl: compressedImage
      };

      setLastReport(finalReport);
      setProgress(80);

      await addDoc(collection(db, 'reports'), {
        ...reportData,
        imageUrl: compressedImage,
        createdAt: serverTimestamp()
      });

      setProgress(100);
      setStatus('done');
      setUploading(false);

    } catch (err: any) {
      console.error("Upload/Processing failed:", err);
      setStatus('error');
      setUploading(false);
    }
  };

  const reset = () => {
    setStatus('idle');
    setProgress(0);
    setLastReport(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-neutral-900 p-2 rounded-lg text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-neutral-900 tracking-tight">FIELD DATA INGESTION</h3>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest leading-none mt-1">Optical Character Recognition & Analysis</p>
            </div>
          </div>
          <button
            onClick={seedDemoData}
            disabled={status !== 'idle'}
            className="text-[10px] flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <Database className="w-3 h-3" />
            Mock Injection
          </button>
        </div>
        
        <div className="p-8">
          <div className="relative group">
            {status !== 'done' && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <div className={`
                  border-2 border-dashed rounded-2xl p-12 text-center transition-all min-h-[300px] flex flex-col justify-center
                  ${status === 'idle' ? 'border-neutral-200 group-hover:border-blue-400 bg-neutral-25' : ''}
                  ${status === 'uploading' ? 'border-blue-400 bg-blue-50' : ''}
                  ${status === 'processing' ? 'border-amber-400 bg-amber-50' : ''}
                  ${status === 'error' ? 'border-red-400 bg-red-50' : ''}
                `}>
                  <AnimatePresence mode="wait">
                    {status === 'idle' && (
                      <motion.div 
                        key="idle"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center"
                      >
                        <div className="bg-white shadow-sm p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-10 h-10 text-neutral-400 group-hover:text-blue-500" />
                        </div>
                        <p className="text-neutral-900 font-black text-xl tracking-tight">Drop Sheet Photo Here</p>
                        <p className="text-neutral-500 font-medium mt-2 max-w-xs mx-auto">Upload handwritten disaster reports for real-time intelligence mapping.</p>
                        <div className="mt-8 flex gap-4 text-[10px] font-black tracking-widest text-neutral-400 uppercase">
                          <span>Verified</span>
                          <span className="w-1 h-1 bg-neutral-300 rounded-full my-auto" />
                          <span>Translated</span>
                          <span className="w-1 h-1 bg-neutral-300 rounded-full my-auto" />
                          <span>Geolocated</span>
                        </div>
                      </motion.div>
                    )}

                    {status === 'uploading' && (
                      <motion.div 
                        key="uploading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative">
                          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-600">
                            {progress}%
                          </div>
                        </div>
                        <p className="text-blue-900 font-black text-xl tracking-tight uppercase">Buffered Ingestion</p>
                        <div className="w-64 h-2 bg-blue-200 mt-6 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                          />
                        </div>
                      </motion.div>
                    )}

                    {status === 'processing' && (
                      <motion.div 
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center"
                      >
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <p className="text-amber-900 font-black text-xl tracking-tight uppercase">AI Cognitive Analysis</p>
                        <p className="text-amber-600 font-medium mt-2 animate-pulse italic">Decoding handwriting & identifying coordinates...</p>
                      </motion.div>
                    )}

                    {status === 'error' && (
                      <motion.div 
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center text-red-600"
                      >
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <p className="font-black text-xl tracking-tight uppercase">System Exception</p>
                        <p className="text-red-500 font-medium mt-2">The AI model failed to process this sheet. Verify image quality and retry.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {status === 'done' && lastReport && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-black text-green-900 tracking-tight">ANALYSIS COMPLETE</p>
                      <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest leading-none mt-1">Intelligence synchronized with central node</p>
                    </div>
                  </div>
                  <button 
                    onClick={reset}
                    className="flex items-center gap-2 bg-white text-neutral-900 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all border border-neutral-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                    New Submission
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                      <FileText className="w-3.5 h-3.5" />
                      Optical Transcription
                    </div>
                    <div className="bg-white text-neutral-900 p-6 rounded-2xl border border-neutral-200 shadow-sm max-h-[400px] overflow-y-auto selection:bg-blue-100">
                      <div className="prose prose-sm prose-neutral max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {lastReport.transcription}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3">
                        <Activity className="w-3.5 h-3.5" />
                        Intelligence Summary
                      </div>
                      <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl italic text-blue-900 font-medium leading-relaxed leading-relaxed shadow-sm">
                        "{lastReport.summary}"
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Urgency</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-black ${lastReport.urgency_score >= 8 ? 'text-red-600' : 'text-amber-500'}`}>
                            {lastReport.urgency_score}/10
                          </span>
                        </div>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Coordinates</p>
                        <div className="flex items-center gap-1 text-neutral-900 font-bold text-xs truncate">
                          <MapPin className="w-3 h-3 text-neutral-400" />
                          {lastReport.lat.toFixed(4)}, {lastReport.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-neutral-200">
                       <img 
                        src={lastReport.imageUrl} 
                        alt="Original" 
                        className="w-full h-40 object-cover grayscale hover:grayscale-0 transition-all cursor-crosshair"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4">
        <div className="bg-amber-500 p-2 rounded-lg text-white self-start">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 uppercase tracking-tight text-sm">System Guidance</h4>
          <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
            AI analysis is performed locally via the Google Gemini node. For best results, ensure sheets are flat and well-lit. 
            Transcription includes verbatim text even from Indian regional languages.
          </p>
        </div>
      </div>
    </div>
  );
}
