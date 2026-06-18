export interface SimilarIncidentResult {
  incident_id: string;
  incident_type: string;
  severity: string;
  junction_id: string;
  junction_name: string;
  timestamp: string;
  weather: string;
  similarity_score: number;
  matched_factors: string[];
  weak_match: boolean;
}

export interface SimilarIncidentsResponse {
  query_incident_id: string;
  results: SimilarIncidentResult[];
}
