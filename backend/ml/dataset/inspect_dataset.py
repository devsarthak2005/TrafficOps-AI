import pandas as pd
df = pd.read_csv("c:/Users/samik/OneDrive/Desktop/TrafficOps-AI/backend/ml/dataset/events.csv")
print("causes:", sorted(list(df["event_cause"].dropna().unique())))
print("types:", sorted(list(df["event_type"].dropna().unique())))
print("counts:\n", df["event_cause"].value_counts())
