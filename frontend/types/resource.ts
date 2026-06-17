export interface RecommendationDetails {
  officers: number;
  barricades: number;
  patrol_vehicles: number;
  ambulances: number;
  diversion_routes: string[];
}

export interface ResourceRecommendation {
  junction_id: string;
  risk_category: string;
  is_simulated: boolean;
  recommendation: RecommendationDetails;
}
