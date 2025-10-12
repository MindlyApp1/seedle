import pandas as pd
import os

xlsx_path = "khp.xlsx"
excel_path = "assets/canadianMentalHealthResources.xlsx"

print("Loading KHP (Ontario) dataset...")

df = pd.read_excel(xlsx_path)
df.columns = [col.lower().strip() for col in df.columns]

def pick(colnames, options):
    for opt in options:
        if opt in colnames:
            return opt
    return None

name_col = pick(df.columns, ["publicname", "programagencynamepublic", "officialname"])
city_col = pick(df.columns, ["physicalcity", "mailingcity"])
address_col = pick(df.columns, ["physicaladdress1", "mailingaddress1"])
desc_col = pick(df.columns, ["agencydescription", "custom_please share your anonymity and confidentiality policy in regards to serving clients (please consider caller id age of consent client records application parental permission etc in your description):"])
phone_col = pick(df.columns, ["phonenumberbusinessline", "phone1number", "phonenumberhotline"])
website_col = pick(df.columns, ["websiteaddress"])
lat_col = pick(df.columns, ["latitude"])
lon_col = pick(df.columns, ["longitude"])

df_formatted = pd.DataFrame({
    "Province": "ontario",
    "City": df[city_col].fillna("") if city_col else "",
    "Address": df[address_col].fillna("") if address_col else "",
    "Category": "Mental Health Service",
    "Name": df[name_col].fillna("") if name_col else "",
    "Description": df[desc_col].fillna("") if desc_col else "",
    "Contact": df[phone_col].fillna("") if phone_col else "",
    "Link": df[website_col].fillna("") if website_col else "",
    "Latitude": df[lat_col] if lat_col else "",
    "Longitude": df[lon_col] if lon_col else "",
    "OnlineOnly": "no"
})

df_formatted = df_formatted[
    (df_formatted["Name"].astype(str).str.strip() != "") |
    (df_formatted["Address"].astype(str).str.strip() != "")
]

for col in ["Name", "City", "Province", "Address"]:
    df_formatted[col] = df_formatted[col].astype(str).str.strip().str.lower()

print(f"Loaded {len(df_formatted)} Ontario rows from KHP.")

if os.path.exists(excel_path):
    print("Merging with existing Excel...")
    existing = pd.read_excel(excel_path)
    for col in ["Name", "City", "Province", "Address"]:
        if col in existing.columns:
            existing[col] = existing[col].astype(str).str.strip().str.lower()
        else:
            existing[col] = ""

    combined = pd.concat([existing, df_formatted], ignore_index=True)

    before = len(combined)
    combined.drop_duplicates(
        subset=["Name", "City", "Province"],
        keep="first",
        inplace=True
    )
    print(f"Removed {before - len(combined)} duplicates after merge.")
else:
    print("Creating new Excel file...")
    os.makedirs(os.path.dirname(excel_path), exist_ok=True)
    combined = df_formatted

combined.to_excel(excel_path, index=False)
print(f"Updated {excel_path} with {len(combined)} total unique resources.")

os.system(f"open '{excel_path}'")
