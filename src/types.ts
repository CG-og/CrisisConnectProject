export interface Report {
  id: string;
  imageUrl: string;
  summary: string;
  transcription?: string;
  urgency_score: number;
  lat: number;
  lng: number;
  createdAt: any; // Firestore Timestamp
}
