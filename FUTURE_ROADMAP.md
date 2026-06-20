# Future Roadmap — TrafficOps-AI

This document outlines key technical integrations and enhancements that were identified during development as high-value, but fell out of scope for the current hackathon MVP/demo build.

## 1. Graph Convolutional Networks (GCN) for Crowd Movement
While the current MVP uses a highly performant and explainable heuristic proximity-weight algorithm to predict secondary crowd spillover hotspots, a future iteration should implement a GCN model. 
- **Objective**: Model the traffic network as a spatial graph where junctions are nodes and roads are edges, predicting network-wide congestion cascade propagation.
- **Prerequisites**: High-frequency historical crowd flow data, GPS trace dataset, and graph adjacency matrix normalization.

## 2. Computer Vision CCTV Ingestion
Currently, junction criticality and traffic density scores are calculated from simulation parameters. 
- **Objective**: Deploy lightweight YOLOv8 models on existing CCTV streams to compute real-time vehicle densities and queue lengths.
- **Action**: Feed the resulting density estimates directly into the FastAPI ingestion endpoint (`/incidents`) to trigger predictive alerts.

## 3. Signal Actuator Integration
Proactive resource recommendation lists optimal deployment parameters, but still requires physical barrier setup or manual override triggers.
- **Objective**: Interface directly with SCATS/SCOOT traffic signal systems to execute automatic green-wave overrides for emergency vehicle routing.
- **Action**: Implement WebSockets on the alerts engine to publish route clearing signals directly to edge junction microcontrollers.

## 4. Live Weather API Ingest
Currently, weather variables (clear, rain, heavy rain, fog) are mocked or manually overridden in the simulation pane.
- **Objective**: Automate weather checks via OpenWeatherMap API to dynamically inject visibility and rain modifiers into the severity and recovery ML models.
