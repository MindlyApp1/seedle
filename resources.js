const resourcesList = document.getElementById("resourcesList");
const mapContainer = document.getElementById("map-container");
const provinceNameEl = document.getElementById("province-name");

const excelFilePath = "assets/resources.xlsx";

let resources = [];

const cityCoordinates = {
  "Ontario": {
    "Toronto": { top: "70%", left: "58%" },
    "Ottawa": { top: "63%", left: "65%" }
  },
  "British Columbia": {
    "Vancouver": { top: "72%", left: "14%" },
    "Victoria": { top: "76%", left: "12%" }
  },
  "Nunavut": {
    "Arctic Bay": { top: "32%", left: "53.5%" }
  }
};

async function loadExcel() {
  const response = await fetch(excelFilePath);
  if (!response.ok) {
    console.error("Failed to load Excel file:", response.statusText);
    return [];
  }
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function clearCityPins() {
  document.querySelectorAll(".city-pin").forEach(pin => pin.remove());
}

function renderProvinceCities(province) {
  clearCityPins();
  provinceNameEl.textContent = `${province} - Online Resources`;
  resourcesList.innerHTML = "";
  const filtered = resources.filter(
    r => r.Province.toLowerCase() === province.toLowerCase()
  );
  if (filtered.length === 0) {
    resourcesList.innerHTML = `<p>No resources found for ${province}.</p>`;
    return;
  }
  const withCities = filtered.filter(r => r.City && r.City.trim() !== "");
  const noCities = filtered.filter(r => !r.City || r.City.trim() === "");
  if (noCities.length > 0) {
    noCities.forEach(r => {
      const card = document.createElement("div");
      card.className = "resource-card";
      card.innerHTML = `
        <h2>${r.Name}</h2>
        <p><strong>${r.Category}</strong></p>
        <p>${r.Description}</p>
        <a href="${r.Link}" target="_blank">Visit Website</a>
      `;
      resourcesList.appendChild(card);
    });
  }
  const cities = [...new Set(withCities.map(r => r.City))];
  cities.forEach(city => {
    const coords = cityCoordinates[province]?.[city];
    if (!coords) return;
    const cityPin = document.createElement("div");
    cityPin.className = "city-pin";
    cityPin.dataset.city = city;
    cityPin.dataset.province = province;
    cityPin.style.top = coords.top;
    cityPin.style.left = coords.left;
    cityPin.title = city;
    mapContainer.appendChild(cityPin);
    cityPin.addEventListener("click", () => {
      renderCityResources(province, city);
    });
  });
}

function renderCityResources(province, city) {
  provinceNameEl.textContent = `${province} – ${city}`;
  resourcesList.innerHTML = "";
  const filtered = resources.filter(
    r =>
      r.Province.toLowerCase() === province.toLowerCase() &&
      r.City.toLowerCase() === city.toLowerCase()
  );
  if (filtered.length === 0) {
    resourcesList.innerHTML = `<p>No resources found for ${city}, ${province}.</p>`;
    return;
  }
  filtered.forEach(r => {
    const card = document.createElement("div");
    card.className = "resource-card";
    card.innerHTML = `
      <h2>${r.Name}</h2>
      <p><strong>${r.Category}</strong></p>
      <p>${r.Description}</p>
      <a href="${r.Link}" target="_blank">Visit Website</a>
    `;
    resourcesList.appendChild(card);
  });
}

async function init() {
  resources = await loadExcel();
  document.querySelectorAll(".province-pin").forEach(pin => {
    pin.addEventListener("click", () => {
      const province = pin.dataset.province;
      pin.classList.add("clicked");
      setTimeout(() => pin.classList.remove("clicked"), 600);
      renderProvinceCities(province);
    });
  });
}

init();
