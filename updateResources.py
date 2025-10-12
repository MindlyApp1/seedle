import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

excel_path = "assets/canadianMentalHealthResourcesVerified.xlsx"
output_path = "assets/canadianMentalHealthResourcesFinal.xlsx"

print("Loading dataset...")
df = pd.read_excel(excel_path)

# --- Step 1: verify website links in parallel ---
def check_url(url):
    if not isinstance(url, str) or not url.startswith("http"):
        return False
    if "seedle" in url.lower():
        return False
    try:
        r = requests.head(url, timeout=3, allow_redirects=True)
        return r.status_code < 400
    except:
        return False

print("Verifying website links...")
urls = df["Link"].tolist()
results = []

with ThreadPoolExecutor(max_workers=20) as executor:
    futures = {executor.submit(check_url, u): i for i, u in enumerate(urls)}
    for future in as_completed(futures):
        i = futures[future]
        try:
            results.append(future.result())
        except:
            results.append(False)

df["keep"] = results
df = df[df["keep"]].drop(columns=["keep"])
print(f"Remaining verified resources: {len(df)}")

# --- Step 2: standardize column order ---
columns = [
    "Province",
    "City",
    "Address",
    "Category",
    "Name",
    "Description",
    "Contact",
    "Link",
    "Latitude",
    "Longitude",
    "OnlineOnly",
]
for col in columns:
    if col not in df.columns:
        df[col] = ""
df = df[columns]

# --- Step 3: fix and update coordinates ---
print("Fixing coordinates with Nominatim (OpenStreetMap)...")
geolocator = Nominatim(user_agent="seedle_resource_cleaner")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1, max_retries=2)

def update_coords(row):
    if pd.notna(row["Latitude"]) and pd.notna(row["Longitude"]):
        return row["Latitude"], row["Longitude"]
    try:
        loc = geocode(f"{row['Address']}, {row['City']}, {row['Province']}, Canada")
        if loc:
            return loc.latitude, loc.longitude
    except:
        pass
    return None, None

coords = [update_coords(row) for _, row in df.iterrows()]
df["Latitude"], df["Longitude"] = zip(*coords)

# --- Step 4: remove rows still missing valid coordinates ---
df = df[df["Latitude"].notna() & df["Longitude"].notna()]
df.reset_index(drop=True, inplace=True)

# --- Step 5: export cleaned dataset ---
df.to_excel(output_path, index=False)
print(f"✅ Final cleaned dataset saved to {output_path} with {len(df)} fully verified resources.")
