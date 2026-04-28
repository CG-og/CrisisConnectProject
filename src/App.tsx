import { useState } from 'react';
import { LayoutDashboard, Radio, Activity, ShieldAlert, Upload, Map as MapIcon } from 'lucide-react';
import UploadComponent from './components/UploadComponent';
import ReportList from './components/ReportList';
import MapDashboard from './components/MapDashboard';

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'upload'>('dashboard');

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">Crisis-Connect</h1>
            <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest mt-1">Disaster Intelligence Node v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="flex items-center bg-neutral-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Intelligence
            </button>
            <button 
              onClick={() => setActiveView('upload')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'upload' ? 'bg-white text-red-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              <Upload className="w-3.5 h-3.5" />
              Submit Report
            </button>
          </nav>

          <div className="hidden lg:flex gap-4 border-l border-neutral-200 pl-6 ml-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase border border-green-100">
              <Activity className="w-3 h-3" />
              Live Node
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-[10px] font-bold uppercase">
              <ShieldAlert className="w-3 h-3" />
              Secure
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {activeView === 'dashboard' ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left Panel: Feed */}
            <section className="w-full lg:w-[450px] flex flex-col border-r border-neutral-200 bg-white p-6 overflow-y-auto">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                  Situation Feed
                </h3>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono">
                  REAL-TIME
                </span>
              </div>
              <ReportList />
            </section>

            {/* Right Panel: Map */}
            <section className="flex-1 relative bg-neutral-100 flex flex-col">
              <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-md shadow-xl border border-neutral-200 p-5 rounded-2xl max-w-xs transition-all pointer-events-auto hover:shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MapIcon className="w-4 h-4 text-red-600" />
                    <h4 className="font-bold text-sm text-neutral-900">Urgency Heatmap</h4>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed font-bold">
                    Aggregating field intelligence to identify high-need clusters. Intensity reflects verified urgency scores.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <div className="h-1.5 flex-1 bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 rounded-full" />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-400 mt-2 font-black tracking-widest">
                    <span>STABLE</span>
                    <span>CRITICAL</span>
                  </div>
                </div>
              </div>
              <MapDashboard />
            </section>
          </div>
        ) : (
          <div className="flex-1 bg-neutral-100 overflow-y-auto p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
                  <div className="bg-red-600 p-2 rounded-xl">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  SURVEY INTELLIGENCE UPLOAD
                </h2>
                <p className="text-neutral-500 font-medium mt-1">Submit handwritten field surveys for instant AI transcription and geospatial mapping.</p>
              </div>
              <UploadComponent />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
