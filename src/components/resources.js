const citySelect = document.getElementById("citySelect");
const resourcesList = document.getElementById("resourcesList");

const excelFilePath = "/assets/resources.xlsx";

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

function renderResources(resources, city) {
  resourcesList.innerHTML = "";

  const filtered = resources.filter(r => r.City.toLowerCase() === city.toLowerCase());

  if (filtered.length === 0) {
    resourcesList.innerHTML = `<p>No resources found for ${city}.</p>`;
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
  const resources = await loadExcel();

  const cities = [...new Set(resources.map(r => r.City).filter(Boolean))].sort();
  citySelect.innerHTML = `<option value="">Select a city</option>`;
  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  citySelect.addEventListener("change", () => {
    const city = citySelect.value;
    if (!city) {
      resourcesList.innerHTML = "";
      return;
    }
    renderResources(resources, city);
  });
}

init();
