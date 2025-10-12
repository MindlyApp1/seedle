import pandas as pd
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

excel_path = "assets/canadianMentalHealthResources.xlsx"
output_path = "assets/canadianMentalHealthResourcesFinal.xlsx"

print("Loading dataset...")
df = pd.read_excel(excel_path)

def check_url(url):
    if not isinstance(url, str) or not url.startswith("http"):
        return False
    if "seedle" in url.lower():
        return False
    try:
        r = requests.head(url, timeout=4, allow_redirects=True)
        return r.status_code < 400
    except:
        return False

def is_indigenous_related(text):
    if not isinstance(text, str):
        return False
    keywords = [
        "indigenous", "first nation", "first nations", "inuit", "metis", "métis",
        "aboriginal", "native", "treaty", "anishinaabe", "cree", "haudenosaunee",
        "mohawk", "mi'kmaq", "ojibwe", "dene", "inuvialuit", "nunavut"
    ]
    text = text.lower()
    return any(k in text for k in keywords)

def is_employment_related(text):
    if not isinstance(text, str):
        return False
    keywords = [
        "employment", "career", "job", "workshop", "resume", "placement",
        "training", "skills development", "employability", "labour", "apprentice"
    ]
    text = text.lower()
    return any(k in text for k in keywords)

print("Checking links in parallel...")
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
before = len(df)
df = df[df["keep"]]
df.drop(columns=["keep"], inplace=True)

print("Filtering and classifying resources...")
rows_to_remove = []
for idx, row in df.iterrows():
    fields = " ".join(str(row[col]) for col in ["Name", "Category", "Description"] if col in df.columns)
    if is_employment_related(fields):
        rows_to_remove.append(idx)
    elif is_indigenous_related(fields):
        if "Category" in df.columns:
            df.at[idx, "Category"] = "Indigenous Support"

df.drop(rows_to_remove, inplace=True)
df.reset_index(drop=True, inplace=True)

df.to_excel(output_path, index=False)
print(f"Cleaned and saved verified dataset to {output_path} with {len(df)} resources remaining.")
