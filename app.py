import pandas as pd

# Recreate the dataset
data = [
    {"University": "Queen's University", "City": "Kingston, ON", "Address": "99 University Ave, Kingston, ON K7L 3N6", "Latitude": 44.2250, "Longitude": -76.4951},
    {"University": "McMaster University", "City": "Hamilton, ON", "Address": "1280 Main St W, Hamilton, ON L8S 4L8", "Latitude": 43.2639397, "Longitude": -79.9178252},
    {"University": "University of Toronto (St. George)", "City": "Toronto, ON", "Address": "27 King's College Cir, Toronto, ON M5S 1A1", "Latitude": 43.663462, "Longitude": -79.3977597},
    {"University": "McGill University", "City": "Montreal, QC", "Address": "845 Sherbrooke St W, Montreal, QC H3A 0G4", "Latitude": 45.506875, "Longitude": -73.5790704},
    {"University": "University of Guelph", "City": "Guelph, ON", "Address": "50 Stone Rd E, Guelph, ON N1G 2W1", "Latitude": 43.5266, "Longitude": -80.2264},
    {"University": "Western University", "City": "London, ON", "Address": "1151 Richmond St, London, ON N6A 3K7", "Latitude": 43.009953, "Longitude": -81.273613},
    {"University": "University of the Fraser Valley (Abbotsford, BC)", "City": "Abbotsford, BC", "Address": "33844 King Rd, Abbotsford, BC V2S 7M8", "Latitude": 49.029053, "Longitude": -122.285431},
    {"University": "University of Winnipeg", "City": "Winnipeg, MB", "Address": "515 Portage Ave, Winnipeg, MB R3B 2E9", "Latitude": 49.892441, "Longitude": -97.154472},
    {"University": "University of Saskatchewan (Saskatoon)", "City": "Saskatoon, SK", "Address": "105 Administration Pl, Saskatoon, SK S7N 5A2", "Latitude": 52.132854, "Longitude": -106.631401},
    {"University": "MacEwan University (Edmonton)", "City": "Edmonton, AB", "Address": "10700 104 Ave NW, Edmonton, AB T5J 4S2", "Latitude": 53.546543, "Longitude": -113.504845},
    {"University": "University of Calgary", "City": "Calgary, AB", "Address": "2500 University Dr NW, Calgary, AB T2N 1N4", "Latitude": 51.078621, "Longitude": -114.136719},
    {"University": "University of New Brunswick (Fredericton)", "City": "Fredericton, NB", "Address": "3 Bailey Dr, Fredericton, NB E3B 5A3", "Latitude": 45.9636, "Longitude": -66.6431},
    {"University": "University of British Columbia (Vancouver)", "City": "Vancouver, BC", "Address": "2329 West Mall, Vancouver, BC V6T 1Z4", "Latitude": 49.2606, "Longitude": -123.2460},
    {"University": "University of Alberta (Edmonton)", "City": "Edmonton, AB", "Address": "116 St & 85 Ave, Edmonton, AB T6G 2R3", "Latitude": 53.5232, "Longitude": -113.5263},
    {"University": "University of Ottawa", "City": "Ottawa, ON", "Address": "75 Laurier Ave E, Ottawa, ON K1N 6N5", "Latitude": 45.4215, "Longitude": -75.6903}
]

# Create DataFrame and save
df = pd.DataFrame(data)
output_path = "canadian_universities_addresses_final.xlsx"
df.to_excel(output_path, index=False)
output_path
