import { LayoutDashboard, Radio, Activity, ShieldAlert } from 'lucide-react';
import UploadComponent from './components/UploadComponent';
import ReportList from './components/ReportList';
import MapDashboard from './components/MapDashboard';

export default function App() {
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
        
        <div className="flex gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
            <Activity className="w-3 h-3" />
            Live Processing
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">
            <ShieldAlert className="w-3 h-3" />
            Emergency Protocol Active
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-73px)] overflow-hidden">
        {/* Left Panel: Upload & Feed */}
        <section className="w-full lg:w-[450px] flex flex-col border-r border-neutral-200 bg-white p-6 overflow-y-auto">
          <UploadComponent />
          
          <div className="mt-2 mb-4 flex items-center justify-between">
            <h3 className="font-bold text-neutral-800 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-neutral-400" />
              Incoming Intelligence Feed
            </h3>
            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-mono">
              REAL-TIME
            </span>
          </div>
          
          <ReportList />
        </section>

        {/* Right Panel: Heatmap */}
        <section className="flex-1 relative bg-neutral-100 p-6 flex flex-col">
          <div className="absolute top-10 left-10 z-10 pointer-events-none">
            <div className="bg-white/90 backdrop-blur shadow-lg border border-neutral-200 p-4 rounded-xl max-w-xs">
              <h4 className="font-bold text-sm mb-1 text-neutral-900">Urgency Heatmap</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Aggregating crowd-sourced surveys to identify high-need clusters. Intensity reflects verified urgency scores.
              </p>
              <div className="mt-3 flex gap-2">
                <div className="h-1.5 flex-1 bg-gradient-to-r from-blue-500 via-amber-500 to-red-500 rounded-full" />
              </div>
              <div className="flex justify-between text-[8px] text-neutral-400 mt-1 font-mono">
                <span>LOW</span>
                <span>CRITICAL</span>
              </div>
            </div>
          </div>
          
          <MapDashboard />
        </section>
      </main>
    </div>
  );
}

