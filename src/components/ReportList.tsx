import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Report } from '../types';
import { AlertTriangle, Clock, MapPin, Check, Activity, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'summary' | 'transcription' | 'original'>>({});

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data);
      setLoading(false);
      
      // Initialize tabs for new reports
      setActiveTabs(prev => {
        const next = { ...prev };
        data.forEach(r => {
          if (!next[r.id]) next[r.id] = 'summary';
        });
        return next;
      });
    }, (error) => {
      console.error("Firestore read error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      console.error("Error resolving report:", error);
    }
  };

  const setTab = (reportId: string, tab: 'summary' | 'transcription' | 'original') => {
    setActiveTabs(prev => ({ ...prev, [reportId]: tab }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-300px)] pr-2">
      <AnimatePresence mode="popLayout">
        {reports.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
            <p>No reports received yet.</p>
            <p className="text-sm">Upload a field survey to get started.</p>
          </div>
        ) : (
          reports.map((report) => {
            const activeTab = activeTabs[report.id] || 'summary';
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={report.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Status Bar */}
                <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex gap-2">
                    <span className={`
                      px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                      ${report.urgency_score >= 8 ? 'bg-red-100 text-red-700' : 
                        report.urgency_score >= 5 ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700'}
                    `}>
                      <AlertTriangle className="w-3 h-3" />
                      Urgency: {report.urgency_score}/10
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolve(report.id)}
                    title="Mark as Responded"
                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition-all"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Area */}
                <div className="p-4">
                  <div className="min-h-[140px]">
                    <AnimatePresence mode="wait">
                      {activeTab === 'summary' && (
                        <motion.div
                          key="summary"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
                            <Activity className="w-3 h-3" />
                            Intelligence Summary
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed italic">
                            "{report.summary}"
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 pt-2 border-t border-gray-50">
                            <MapPin className="w-3 h-3" />
                            {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'transcription' && (
                        <motion.div
                          key="transcription"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                            <FileText className="w-3 h-3" />
                            Full Transcription
                          </div>
                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                            {report.transcription || (
                              <div className="italic text-gray-400">
                                No transcription available for this report. 
                                <br />
                                <span className="text-[10px]">Newly uploaded reports will include full transcriptions.</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'original' && (
                        <motion.div
                          key="original"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex justify-center"
                        >
                          <div className="relative group/img max-w-full">
                            <img 
                              src={report.imageUrl} 
                              alt="Original Survey" 
                              className="max-h-40 rounded-lg shadow-sm border border-gray-100 object-contain bg-neutral-900"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white drop-shadow-md opacity-70">
                              <ImageIcon className="w-3 h-3" />
                              Original Image
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-t border-gray-50 bg-gray-25">
                  <button
                    onClick={() => setTab(report.id, 'summary')}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${activeTab === 'summary' ? 'bg-white text-blue-600 border-t-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Activity className="w-3 h-3" />
                    Summary
                  </button>
                  <button
                    onClick={() => setTab(report.id, 'transcription')}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${activeTab === 'transcription' ? 'bg-white text-amber-600 border-t-2 border-amber-500' : 'text-gray-400 hover:text-gray-600 border-l border-gray-50'}`}
                  >
                    <FileText className="w-3 h-3" />
                    Transcript
                  </button>
                  <button
                    onClick={() => setTab(report.id, 'original')}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${activeTab === 'original' ? 'bg-white text-neutral-800 border-t-2 border-neutral-800' : 'text-gray-400 hover:text-gray-600 border-l border-gray-50'}`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Original
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
