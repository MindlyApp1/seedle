import pandas as pd
import numpy as np
import os

excel_path = "assets/canadianMentalHealthResources_cleaned.xlsx"
extra_path = "assets/canadianMentalHealthResourcesExtra.xlsx"
print("Loading Excel data...")
df = pd.read_excel(excel_path)

df.columns = [col.strip().capitalize() for col in df.columns]

french_words = ["le ", "la ", "les ", "des ", "du ", "de ", "centre de santé", "et ", "santé mentale", "clinique de"]
mask_french = df.astype(str).apply(lambda x: x.str.contains('|'.join(french_words), case=False, na=False)).any(axis=1)
df = df[~mask_french]
print(f"Removed {mask_french.sum()} French-language rows")

df = df[(df["Name"].astype(str).str.strip() != "") & (df["Description"].astype(str).str.strip() != "")]
df.dropna(subset=["Name"], inplace=True)

for col in ["Name", "Description", "Category"]:
    df[col] = df[col].astype(str).str.lower()

conditions = [
    df["Description"].str.contains("crisis|distress|suicide|helpline|hotline|talk line|emergency", na=False),
    df["Description"].str.contains("youth|student|teen|young adult|child|adolescent|campus|school|college", na=False),
    df["Description"].str.contains("indigenous|first nation|metis|inuit|aboriginal|native friendship|tribal", na=False),
    df["Description"].str.contains("hospital|clinic|health centre|psychiatric|inpatient|outpatient", na=False),
    df["Description"].str.contains("counsel|therapy|support group|psychotherapy|family service|wellness|community centre", na=False)
]

choices = [
    "Crisis & Distress Support",
    "Youth & Student Services",
    "Indigenous Support",
    "Hospitals & Health Centres",
    "Community Counselling"
]

df["Category"] = np.select(conditions, choices, default="Other Mental Health Service")

keep_cols = [
    "Province", "City", "Name", "Address", "Category", "Description",
    "Contact", "Link", "Latitude", "Longitude", "Onlineonly"
]
df = df[[c for c in keep_cols if c in df.columns]]

df.sort_values(by=["Province", "City", "Category", "Name"], inplace=True)

before = len(df)
df.drop_duplicates(subset=["Name", "City", "Province", "Address"], inplace=True)
print(f"Removed {before - len(df)} duplicate rows")

os.makedirs(os.path.dirname(extra_path), exist_ok=True)
df.to_excel(extra_path, index=False)
print(f"Saved cleaned and categorized dataset to {extra_path} with {len(df)} rows.")
