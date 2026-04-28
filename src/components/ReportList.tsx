import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Report } from '../types';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore read error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
          reports.map((report) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4 p-4">
                <div className="w-24 h-24 flex-shrink-0">
                  <img 
                    src={report.imageUrl} 
                    alt="Survey" 
                    className="w-full h-full object-cover rounded-lg border border-gray-100"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`
                      px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1
                      ${report.urgency_score >= 8 ? 'bg-red-100 text-red-700' : 
                        report.urgency_score >= 5 ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700'}
                    `}>
                      <AlertTriangle className="w-3 h-3" />
                      Urgency: {report.urgency_score}/10
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {report.createdAt ? new Date(report.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed mb-2">
                    {report.summary}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
