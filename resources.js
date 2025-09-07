const provinceNameEl = document.getElementById("province-name");

const excelFilePath = "assets/mentalHealthResources.xlsx";

let resources = [];
let map;
let markers = [];

async function loadExcel() {
  const response = await fetch(excelFilePath);
  if (!response.ok) return [];
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function renderResourcesOnMap(filtered) {
  markers.forEach(m => m.setMap(null));
  markers = [];

  const inPersonSection = document.getElementById("inperson-resources-section");
  const onlineSection = document.getElementById("online-resources-section");

  inPersonSection.innerHTML = "";
  onlineSection.innerHTML = "";

  if (filtered.length === 0) {
    inPersonSection.innerHTML = `<p>No resources found.</p>`;
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const onlineList = [];

  filtered.forEach(r => {
    const isOnline = r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes";
    const hasCoords = r.Lat && r.Lng;
    const hasAddress = r.Address && r.Address.trim() !== "";

    if (isOnline && !hasCoords && !hasAddress) {
      onlineList.push(r);
    } else if (hasCoords) {
      const marker = new google.maps.Marker({
        position: { lat: parseFloat(r.Lat), lng: parseFloat(r.Lng) },
        map,
        title: r.Name
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <h2>${r.Name}</h2>
          <p><strong>${r.Category}</strong></p>
          <p>${r.Description}</p>
          <p><em>${r.Address || ""}</em></p>
          <a href="${r.Link}" target="_blank">Visit Website</a>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      bounds.extend({ lat: parseFloat(r.Lat), lng: parseFloat(r.Lng) });
    }
  });

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }

  if (onlineList.length > 0) {
    const onlineHeading = document.createElement("h2");
    onlineHeading.className = "online-heading";
    onlineHeading.textContent = "Online Resources";
    onlineSection.appendChild(onlineHeading);

    const categoryFilter = document.createElement("select");
    categoryFilter.id = "online-category";
    categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
    onlineSection.appendChild(categoryFilter);

    const categories = [...new Set(onlineList.map(r => r.Category).filter(Boolean))];
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.toLowerCase();
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });

    const onlineContainer = document.createElement("div");
    onlineContainer.className = "resources-list initial-load";
    onlineSection.appendChild(onlineContainer);

    function renderOnlineCards(selected) {
      onlineContainer.innerHTML = "";
      const filteredOnline = selected === "all"
        ? onlineList
        : onlineList.filter(r => r.Category.toLowerCase() === selected);

      filteredOnline.forEach((r) => {
        const card = document.createElement("div");
        card.className = "resource-card";
        if (onlineContainer.classList.contains("initial-load")) {
          card.classList.add("initial-load");
        }
        card.innerHTML = `
          <h2>${r.Name}</h2>
          <p><strong>${r.Category}</strong></p>
          <p>${r.Description}</p>
          <a href="${r.Link}" target="_blank">Visit Website</a>
        `;
        onlineContainer.appendChild(card);
      });

      if (onlineContainer.classList.contains("initial-load")) {
        setTimeout(() => onlineContainer.classList.remove("initial-load"), 1000);
      }
    }

    renderOnlineCards("all");

    categoryFilter.addEventListener("change", () => {
      renderOnlineCards(categoryFilter.value);
    });
  }
}

async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 56.1304, lng: -106.3468 },
    zoom: 4,
    minZoom: 3,
    maxZoom: 12,
    restriction: {
      latLngBounds: {
        north: 83.11,
        south: 41.60,
        west: -141.2,
        east: -52.60
      },
      strictBounds: true
    },
    gestureHandling: "greedy",
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      { featureType: "poi.park", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] }
    ]
  });

  resources = await loadExcel();
  renderResourcesOnMap(resources);

  const input = document.createElement("input");
  input.id = "map-search";
  input.type = "text";
  input.placeholder = "Search mental health resources...";
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      renderResourcesOnMap(resources);
      return;
    }
    const queryWords = query.split(/\s+/);
    const matched = resources.filter(r => {
      const combined = `
        ${r.Name} ${r.City} ${r.Province} ${r.Category}
        ${r.Address || ""} ${r.Lat || ""} ${r.Lng || ""}
      `.toLowerCase();
      return queryWords.every(word => combined.includes(word));
    });
    renderResourcesOnMap(matched);
  });
}

let ctrlApressed = false;
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
    return;
  }
  if (e.key.toLowerCase() === "a" && e.ctrlKey) {
    ctrlApressed = true;
  }
  if (ctrlApressed && e.key === "Delete") {
    markers.forEach(m => m.setMap(null));
    markers = [];
    ctrlApressed = false;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "a") ctrlApressed = false;
});
