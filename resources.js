const resourcesList = document.getElementById("resourcesList");
const mapContainer = document.getElementById("map-container");
const provinceNameEl = document.getElementById("province-name");

const excelFilePath = "assets/resources.xlsx";

let resources = [];
let activeProvince = null;
let activeCity = null;
let activeCategory = "All";

const categoryFilter = document.createElement("select");
categoryFilter.id = "categoryFilter";
categoryFilter.style.display = "none";
categoryFilter.innerHTML = `<option value="All">All Categories</option>`;
resourcesList.before(categoryFilter);

categoryFilter.addEventListener("change", () => {
  activeCategory = categoryFilter.value;
  if (activeCity) {
    renderCityResources(activeProvince, activeCity);
  } else if (activeProvince) {
    renderProvinceCities(activeProvince);
  }
});

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

function getFilteredResources(filterFn) {
  return resources.filter(r => {
    if (activeCategory !== "All") {
      if (r.Category.trim().toLowerCase() !== activeCategory.toLowerCase()) return false;
    }
    return filterFn(r);
  });
}

function updateCategoryFilter(items) {
  categoryFilter.style.display = "inline-block";
  categoryFilter.innerHTML = `<option value="All">All Categories</option>`;

  const seen = new Set();
  const categories = items
    .map(r => r.Category)
    .filter(cat => {
      const key = cat.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.trim().toLowerCase();
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // keep selection if still valid
  let found = false;
  for (let i = 0; i < categoryFilter.options.length; i++) {
    if (categoryFilter.options[i].value === activeCategory.toLowerCase()) {
      categoryFilter.selectedIndex = i;
      found = true;
      break;
    }
  }

  if (!found) {
    activeCategory = "All";
    categoryFilter.value = "All";
  }
}

function renderProvinceCities(province) {
  clearCityPins();
  activeProvince = province;
  activeCity = null;

  provinceNameEl.textContent = `${province} - Online Resources`;
  resourcesList.innerHTML = "";

  const provinceResources = resources.filter(
    r => r.Province.toLowerCase() === province.toLowerCase() && (!r.City || r.City.trim() === "")
  );
  updateCategoryFilter(provinceResources);

  const filtered = getFilteredResources(
    r => r.Province.toLowerCase() === province.toLowerCase() && (!r.City || r.City.trim() === "")
  );

  if (filtered.length === 0) {
    resourcesList.innerHTML = `<p>No province-level resources found for ${province}.</p>`;
  } else {
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

  const cities = cityCoordinates[province] || {};
  Object.entries(cities).forEach(([city, coords]) => {
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
  activeProvince = province;
  activeCity = city;

  provinceNameEl.textContent = `${province} - ${city}`;
  resourcesList.innerHTML = "";

  const cityResources = resources.filter(
    r => r.Province.toLowerCase() === province.toLowerCase() && r.City.toLowerCase() === city.toLowerCase()
  );
  updateCategoryFilter(cityResources);

  const filtered = getFilteredResources(
    r => r.Province.toLowerCase() === province.toLowerCase() && r.City.toLowerCase() === city.toLowerCase()
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
