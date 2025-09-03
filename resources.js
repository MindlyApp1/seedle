const resourcesList = document.getElementById("resourcesList");
const mapContainer = document.getElementById("map-container");
const provinceNameEl = document.getElementById("province-name");

const excelFilePath = "assets/resources.xlsx";

let resources = [];

const cityCoordinates = {
  "Ontario": {
    "Toronto": { top: "75%", left: "65%" }
  },
  "British Columbia": {
    "Vancouver": { top: "59%", left: "15.5%" }
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
  } else {

    const noCities = filtered.filter(r => !r.City || r.City.trim() === "");
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

  const cities = cityCoordinates[province] || {};
  Object.entries(cities).forEach(([city, coords]) => {
    const cityPin = document.createElement("div");
    cityPin.className = "city-pin";

    const hasResources = filtered.some(
      r => r.City && r.City.toLowerCase() === city.toLowerCase()
    );
    if (!hasResources) {
      cityPin.classList.add("no-resource");
    }

    cityPin.dataset.city = city;
    cityPin.dataset.province = province;
    cityPin.style.top = coords.top;
    cityPin.style.left = coords.left;
    cityPin.title = hasResources ? city : `${city} (no resources)`;

    mapContainer.appendChild(cityPin);

    cityPin.addEventListener("click", () => {
      renderCityResources(province, city);
    });
  });
}

function renderCityResources(province, city) {
  provinceNameEl.textContent = `${province} - ${city}`;
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
