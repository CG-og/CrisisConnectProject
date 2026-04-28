import { useEffect, useState, useMemo } from 'react';
import { APIProvider, Map, useApiIsLoaded, useMap } from '@vis.gl/react-google-maps';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Report } from '../types';

const MAP_ID = 'bf121A0d1234567'; // Placeholder Map ID if needed

function HeatmapLayer({ reports }: { reports: Report[] }) {
  const map = useMap();
  const apiIsLoaded = useApiIsLoaded();
  const [heatmap, setHeatmap] = useState<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !apiIsLoaded) return;

    const heatmapInstance = new google.maps.visualization.HeatmapLayer({
      map: map,
      radius: 30,
      opacity: 0.7,
    });
    setHeatmap(heatmapInstance);

    return () => {
      heatmapInstance.setMap(null);
    };
  }, [map, apiIsLoaded]);

  useEffect(() => {
    if (!heatmap) return;

    const data = reports.map(r => ({
      location: new google.maps.LatLng(r.lat, r.lng),
      weight: r.urgency_score
    }));

    heatmap.setData(data);
  }, [heatmap, reports]);

  return null;
}

export default function MapDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'reports'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
      setReports(data);
    });

    return () => unsubscribe();
  }, []);

  if (!apiKey) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
        <div className="max-w-xs">
          <p className="text-red-500 mb-2 font-bold uppercase tracking-widest text-[10px]">Security Alert</p>
          <p className="text-gray-900 mb-2 font-bold text-lg">Google Maps API Key Missing</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Please add <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your environment secrets to enable real-time geospatial intelligence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-2xl border border-gray-200">
      <APIProvider apiKey={apiKey} libraries={['visualization']}>
        <Map
          defaultCenter={{ lat: 28.6139, lng: 77.2090 }} // New Delhi
          defaultZoom={11}
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling={'greedy'}
        >
          <HeatmapLayer reports={reports} />
        </Map>
      </APIProvider>
    </div>
  );
}
