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
  const infoWindow = new google.maps.InfoWindow();

  filtered.forEach(r => {
    const isOnline = r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes";
    const hasCoords = r.latitude && r.longitude;
    const hasAddress = r.Address && r.Address.trim() !== "";

    if (isOnline && !hasCoords && !hasAddress) {
      onlineList.push(r);
    } else if (hasCoords) {
      const marker = new google.maps.Marker({
        position: { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) },
        map,
        title: r.Name,
        icon: {
          path: "M192 0C86 0 0 86 0 192c0 77.7 27.6 99.5 172.1 310.1 9.5 13.9 29.3 13.9 38.8 0C356.4 291.5 384 269.7 384 192 384 86 298 0 192 0zm0 272c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z",
          fillColor: "#4cbb6a",
          fillOpacity: 1,
          strokeColor: "#10824c",
          strokeWeight: 2,
          scale: 0.05,
          anchor: new google.maps.Point(192, 384)
        }
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div class="info-card">
            <h2 class="info-title">${r.Name}</h2>
            <p class="info-category">${r.Category}</p>
            <p class="info-description">${r.Description}</p>
            <p class="info-address"><em>${r.Address || ""}</em></p>
            <a class="info-link" href="${r.Link}" target="_blank">Visit Website</a>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      bounds.extend({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) });
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
      { featureType: "poi.park", elementType: "geometry", stylers: [{ visibility: "off" }] },
      { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", stylers: [{ visibility: "off" }] },
      { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] }
    ]
  });

  resources = await loadExcel();
  renderResourcesOnMap(resources);

  const form = document.getElementById("search-form");
  const input = document.getElementById("map-search");
  const icon = document.querySelector(".search-icon");
  const clearBtn = document.getElementById("clear-search");

  function runSearch() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      renderResourcesOnMap(resources);
      icon.style.display = "block";
      clearBtn.style.display = "none";
      return;
    }
    icon.style.display = "none";
    clearBtn.style.display = "block";

    const queryWords = query.split(/\s+/);
    const matched = resources.filter(r => {
      const combined = `
        ${r.Name} ${r.City} ${r.Province} ${r.Category}
        ${r.Address || ""} ${r.latitude || ""} ${r.longitude || ""}
      `.toLowerCase();
      return queryWords.every(word => combined.includes(word));
    });

    renderResourcesOnMap(matched);

    if (matched.length === 1 && matched[0].latitude && matched[0].longitude) {
      map.setCenter({ lat: parseFloat(matched[0].latitude), lng: parseFloat(matched[0].longitude) });
      map.setZoom(12);
    }
  }

  input.addEventListener("input", () => {
    if (input.value.trim().length > 0) {
      icon.style.display = "none";
      clearBtn.style.display = "block";
    } else {
      icon.style.display = "block";
      clearBtn.style.display = "none";
      renderResourcesOnMap(resources);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim().length > 0) runSearch();
  });

  icon.addEventListener("click", () => {
    if (input.value.trim().length === 0) return;
    runSearch();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.style.display = "none";
    icon.style.display = "block";
    renderResourcesOnMap(resources);
  });
}

let ctrlApressed = false;
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
  if (e.key.toLowerCase() === "a" && e.ctrlKey) ctrlApressed = true;
  if (ctrlApressed && e.key === "Delete") {
    markers.forEach(m => m.setMap(null));
    markers = [];
    ctrlApressed = false;
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "a") ctrlApressed = false;
});
