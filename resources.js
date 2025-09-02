const resourcesList = document.getElementById("resourcesList");
const mapContainer = document.getElementById("map-container");
const provinceNameEl = document.getElementById("province-name");

const excelFilePath = "assets/resources.xlsx";

let resources = [];

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
  // Always clear old pins when switching provinces
  clearCityPins();

  provinceNameEl.textContent = province;
  resourcesList.innerHTML = "";

  const filtered = resources.filter(
    r => r.Province.toLowerCase() === province.toLowerCase()
  );

  if (filtered.length === 0) {
    resourcesList.innerHTML = `<p>No resources found for ${province}.</p>`;
    return;
  }

  const cities = [...new Set(filtered.map(r => r.City))];

  cities.forEach(city => {
    if (!city) return;

    const cityPin = document.createElement("div");
    cityPin.className = "city-pin";
    cityPin.dataset.city = city;
    cityPin.dataset.province = province;

    // TEMP random position so you can see them
    cityPin.style.top = `${40 + Math.random() * 20}%`;
    cityPin.style.left = `${40 + Math.random() * 20}%`;

    cityPin.title = city; // hover tooltip
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

      // Add a click animation
      pin.classList.add("clicked");
      setTimeout(() => pin.classList.remove("clicked"), 600);

      // Show only this province's cities
      renderProvinceCities(province);
    });
  });
}

init();
