export interface AccessJunctionDetail {
  junction_id: string;
  junction_name: string;
  effective_health_score: number;
  contribution_to_penalty: number;
}

export interface HospitalStatus {
  hospital_id: string;
  hospital_name: string;
  lat: number;
  lng: number;
  accessibility_score: number;
  accessibility_band: string;
}

export interface HospitalDetail extends HospitalStatus {
  access_junctions: AccessJunctionDetail[];
}
