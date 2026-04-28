export interface Report {
  id: string;
  imageUrl: string;
  summary: string;
  urgency_score: number;
  lat: number;
  lng: number;
  createdAt: any; // Firestore Timestamp
}
