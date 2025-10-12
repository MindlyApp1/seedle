
const excelFilePath = "assets/canadianMentalHealthResourcesVerified.xlsx";

let resources = [];
let map;
let markers = [];
let userPos = null;
let firstOnlineRender = true;

async function loadExcel() {
  const response = await fetch(excelFilePath);
  if (!response.ok) return [];
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return json.map(r => {
    const row = {};
    for (const key in r) {
      row[key.trim()] = r[key];
    }
    return {
      ...row,
      OriginalCategory: row.Category ? String(row.Category).trim() : "",
      Category: row.Category ? String(row.Category).toLowerCase().trim().replace(/\s+/g, " ") : "",
      Name: row.Name ? String(row.Name).toLowerCase().trim().replace(/\s+/g, " ") : "",
      City: row.City ? String(row.City).toLowerCase().trim().replace(/\s+/g, " ") : "",
      Province: row.Province ? String(row.Province).toLowerCase().trim().replace(/\s+/g, " ") : "",
      OnlineOnly: row.OnlineOnly ? String(row.OnlineOnly).trim() : "",
      Latitude: row.Latitude && !isNaN(parseFloat(row.Latitude)) ? parseFloat(row.Latitude) : null,
      Longitude: row.Longitude && !isNaN(parseFloat(row.Longitude)) ? parseFloat(row.Longitude) : null
    };
  });
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
}

const distinctColors = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
  "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
  "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
  "#000075", "#808080"
];

const categoryColorMap = {};
let colorIndex = 0;

function getCategoryColor(category) {
  const normalized = (category || "").toLowerCase().trim();
  
  if (categoryColorMap[normalized]) {
    return categoryColorMap[normalized];
  }

  const color = distinctColors[colorIndex % distinctColors.length];
  categoryColorMap[normalized] = color;
  colorIndex++;

  return color;
}

function renderResourcesOnMap(filtered) {
  markers.forEach(m => m.setMap(null));
  markers = [];

  const inPersonSection = document.getElementById("inperson-resources-section");
  const onlineSection = document.getElementById("online-resources-section");
  inPersonSection.innerHTML = "";

  if (filtered.length === 0) {
    inPersonSection.innerHTML = `<p>No resources found.</p>`;
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const onlineList = [];
  const infoWindow = new google.maps.InfoWindow();

  filtered.forEach(r => {
    const isOnline = r.OnlineOnly && r.OnlineOnly.trim().toLowerCase() === "yes";
    const hasCoords = r.Latitude && r.Longitude;

    if (isOnline) {
      onlineList.push(r);
    } else if (hasCoords) {
      const normalizedCat = (r.Category || "").toLowerCase();
      const color = getCategoryColor(normalizedCat);

      const marker = new google.maps.Marker({
        position: { lat: r.Latitude, lng: r.Longitude },
        map,
        title: r.Name,
        icon: {
          path: "M192 0C86 0 0 86 0 192c0 77.7 27.6 99.5 172.1 310.1 9.5 13.9 29.3 13.9 38.8 0C356.4 291.5 384 269.7 384 192 384 86 298 0 192 0zm0 272c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z",
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#333",
          strokeWeight: 2,
          scale: 0.05,
          anchor: new google.maps.Point(192, 384)
        }
      });

      marker.addListener("click", () => {
        const distanceText =
          userPos && r.Latitude && r.Longitude
            ? `<p class="info-distance">${getDistanceKm(userPos.lat, userPos.lng, r.Latitude, r.Longitude)} km away</p>`
            : `<p class="info-distance">Distance unavailable</p>`;

        infoWindow.setContent(`
          <div class="info-card">
            <h2 class="info-title">${r.Name}</h2>
            <p class="info-category"><strong>${r.Category}</strong></p>
            <p class="info-description">${r.Description}</p>
            <p class="info-address">${r.Address || ""}</p>
            ${distanceText}
            <p class="info-contact">${r.Contact || ""}</p>
            <a class="info-link" href="${r.Link}" target="_blank">Visit Website</a>
          </div>
        `);
        infoWindow.open(map, marker);
      });

      markers.push(marker);
      bounds.extend({ lat: r.Latitude, lng: r.Longitude });
    }
  });

  if (onlineList.length > 0 && onlineSection) {
    let headerWrapper = onlineSection.querySelector(".section-header");
    let categoryFilter = document.getElementById("online-category");
    let onlineSearch = document.getElementById("online-search");
    let onlineContainer = onlineSection.querySelector(".resources-list");

    if (!headerWrapper) {
      headerWrapper = document.createElement("div");
      headerWrapper.className = "section-header";
      onlineSection.appendChild(headerWrapper);

      const onlineHeading = document.createElement("h2");
      onlineHeading.className = "online-heading";
      onlineHeading.textContent = "Online Resources";
      headerWrapper.appendChild(onlineHeading);
    }

    if (!onlineContainer) {
      onlineContainer = document.createElement("div");
      onlineContainer.className = "resources-list";
      onlineSection.appendChild(onlineContainer);
    }

    if (categoryFilter) {
      categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
      const categories = [...new Set(onlineList.map(r => r.Category).filter(Boolean))];

      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        const pretty = onlineList.find(r => r.Category === cat)?.OriginalCategory || cat;
        option.textContent = pretty;
        categoryFilter.appendChild(option);
      });
    }

    function renderOnlineCards(selected = "all", searchQuery = "") {
      if (!onlineContainer) return;
      onlineContainer.innerHTML = "";
      const query = searchQuery.trim().toLowerCase();

      onlineList.forEach(r => {
        const cardText = `${r.Name} ${r.Description} ${r.Contact}`.toLowerCase();
        const matchCat = selected === "all" || r.Category === selected;
        const matchText = !query || cardText.includes(query);

        if (matchCat && matchText) {
          const card = document.createElement("div");
          card.className = "resource-card";
          if (firstOnlineRender) card.classList.add("initial-load");

          card.innerHTML = `
            <h2>${r.Name}</h2>
            <p><strong>${r.OriginalCategory || r.Category}</strong></p>
            <p>${r.Description}</p>
            <p>${r.Contact || ""}</p>
            <a href="${r.Link}" target="_blank">Visit Website</a>
          `;
          onlineContainer.appendChild(card);

          if (firstOnlineRender) {
            card.addEventListener("animationend", () => card.classList.remove("initial-load"), { once: true });
          }
        }
      });

      firstOnlineRender = false;
    }

    renderOnlineCards("all", "");

    if (categoryFilter) {
      categoryFilter.addEventListener("change", () => {
        const val = categoryFilter.value;
        const query = onlineSearch ? onlineSearch.value : "";
        renderOnlineCards(val, query);
      });
    }

    if (onlineSearch) {
      onlineSearch.addEventListener("input", () => {
        const val = categoryFilter ? categoryFilter.value : "all";
        renderOnlineCards(val, onlineSearch.value);
      });
    }
  }

  if (!bounds.isEmpty()) {
    if (markers.length === 1) {
      map.setCenter(markers[0].getPosition());
      map.setZoom(12);
    } else {
      map.fitBounds(bounds);
    }
  } else {
    map.setCenter({ lat: 56.1304, lng: -106.3468 });
    map.setZoom(4);
  }
}

async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 56.1304, lng: -106.3468 },
    zoom: 4,
    minZoom: 3,
    maxZoom: 12,
    restriction: {
      latLngBounds: { north: 83.11, south: 41.60, west: -141.2, east: -52.60 },
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

  const categorySelect = document.getElementById("resource-category");
  if (categorySelect) {
    const categories = [...new Set(resources.map(r => r.Category).filter(Boolean))];
    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = resources.find(r => r.Category === cat)?.OriginalCategory || cat;
      categorySelect.appendChild(option);
    });
  }

  const questionnaireForm = document.getElementById("questionnaire-form");
  const skipBtn = document.getElementById("skip-questionnaire");
  const backBtn = document.getElementById("back-to-questionnaire");

  if (questionnaireForm) {
    questionnaireForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = document.getElementById("resource-type").value;
      const category = document.getElementById("resource-category").value;

      let filtered = resources;

      if (type === "online") {
        filtered = filtered.filter(r => r.OnlineOnly.toLowerCase() === "yes");
        document.getElementById("map-description").style.display = "none";
        document.getElementById("map-container").style.display = "none";
        document.getElementById("search-form").style.display = "none";
        document.getElementById("province-name").style.display = "none";
        document.getElementById("online-resources-section").style.display = "block";
      } else if (type === "inperson") {
        filtered = filtered.filter(r => r.OnlineOnly.toLowerCase() !== "yes");
        document.getElementById("map-description").style.display = "block";
        document.getElementById("map-container").style.display = "block";
        document.getElementById("search-form").style.display = "flex";
        document.getElementById("province-name").style.display = "block";
        document.getElementById("online-resources-section").style.display = "none";
      } else {
        filtered = resources;
        document.getElementById("map-description").style.display = "block";
        document.getElementById("map-container").style.display = "block";
        document.getElementById("search-form").style.display = "flex";
        document.getElementById("province-name").style.display = "block";
        document.getElementById("online-resources-section").style.display = "block";
      }

      const onlineCategorySelect = document.getElementById("online-category");
      if (onlineCategorySelect) {
        onlineCategorySelect.innerHTML = "";

        if (category === "any") {
          const optionAll = document.createElement("option");
          optionAll.value = "all";
          optionAll.textContent = "All Categories";
          optionAll.selected = true;
          onlineCategorySelect.appendChild(optionAll);

          const categories = [...new Set(resources.map(r => r.Category).filter(Boolean))];
          categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat;
            option.textContent = resources.find(r => r.Category === cat)?.OriginalCategory || cat;
            onlineCategorySelect.appendChild(option);
          });
        } else {
          filtered = filtered.filter(r => r.Category === category);
          const option = document.createElement("option");
          option.value = category;
          option.textContent = resources.find(r => r.Category === category)?.OriginalCategory || category;
          option.selected = true;
          onlineCategorySelect.appendChild(option);
        }
      }

      renderResourcesOnMap(filtered);
      document.getElementById("questionnaire").style.display = "none";
      document.getElementById("resourcesList").style.display = "block";
      if (backBtn) backBtn.style.display = "inline-block";
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      document.getElementById("questionnaire").style.display = "none";
      document.getElementById("map-container").style.display = "block";
      document.getElementById("resourcesList").style.display = "block";
      document.getElementById("search-form").style.display = "flex";
      document.getElementById("province-name").style.display = "block";
      document.getElementById("online-resources-section").style.display = "block";

      const onlineCategorySelect = document.getElementById("online-category");
      if (onlineCategorySelect) {
        onlineCategorySelect.innerHTML = "";
        const optionAll = document.createElement("option");
        optionAll.value = "all";
        optionAll.textContent = "All Categories";
        optionAll.selected = true;
        onlineCategorySelect.appendChild(optionAll);

        const categories = [...new Set(resources.map(r => r.Category).filter(Boolean))];
        categories.forEach(cat => {
          const option = document.createElement("option");
          option.value = cat;
          option.textContent = resources.find(r => r.Category === cat)?.OriginalCategory || cat;
          onlineCategorySelect.appendChild(option);
        });
      }

      renderResourcesOnMap(resources);
      if (backBtn) backBtn.style.display = "none";
    });
  }

  if (backBtn) {
    backBtn.style.display = "none";
    backBtn.classList.add("styled-back-btn");
    backBtn.addEventListener("click", () => {
      document.getElementById("resourcesList").style.display = "none";
      document.getElementById("map-container").style.display = "none";
      document.getElementById("province-name").style.display = "none";
      document.getElementById("map-description").style.display = "none";
      document.getElementById("search-form").style.display = "none";
      document.getElementById("online-resources-section").style.display = "none";
      document.getElementById("questionnaire").style.display = "block";
      backBtn.style.display = "none";
    });
  }

  const locationButton = document.createElement("button");
  locationButton.className = "custom-location-btn";
  locationButton.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i>`;
  locationButton.style.background = "#fff";
  locationButton.style.border = "2px solid #ccc";
  locationButton.style.borderRadius = "50%";
  locationButton.style.width = "40px";
  locationButton.style.height = "40px";
  locationButton.style.display = "flex";
  locationButton.style.alignItems = "center";
  locationButton.style.justifyContent = "center";
  locationButton.style.cursor = "pointer";
  locationButton.style.margin = "10px";
  locationButton.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  locationButton.title = "Zoom to your location";

  let userMarker = null;

  locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    if (input.value.trim().length > 0) {
      input.value = "";
      icon.classList.add("disabled");
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      renderResourcesOnMap(resources);
    }

    runGeolocation(true);
    setTimeout(() => runGeolocation(false), 200);
  });

  function runGeolocation(skipMarker) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!skipMarker) {
          if (userMarker) {
            userMarker.setPosition(userPos);
          } else {
            userMarker = new google.maps.Marker({
              position: userPos,
              map,
              title: "You are here",
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4285F4",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2
              }
            });
          }
        }
        map.setCenter(userPos);
        map.setZoom(14);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton);

  const form = document.getElementById("search-form");
  const input = document.getElementById("map-search");
  const icon = document.querySelector(".search-icon");
  const clearBtn = document.getElementById("clear-search");
  icon.classList.add("disabled");

  function runSearch() {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      renderResourcesOnMap(resources);
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      return;
    }
    icon.classList.add("active", "toggled");
    icon.style.display = "none";
    clearBtn.style.display = "block";

    const queryWords = query.split(/\s+/);

    const onlineResources = resources.filter(r => r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes");
    const inPersonMatches = resources.filter(r => {
      if (r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes") return false;
      const combined = `
        ${String(r.Name || "")}
        ${String(r.City || "")}
        ${String(r.Province || "")}
        ${String(r.Category || "")}
        ${String(r.Address || "")}
        ${String(r.Contact || "")}
      `.toLowerCase();
      return queryWords.every(word => combined.includes(word));
    });

    const matched = [...inPersonMatches, ...onlineResources];
    renderResourcesOnMap(matched);

    if (inPersonMatches.length === 1 && inPersonMatches[0].Latitude && inPersonMatches[0].Longitude) {
      map.setCenter({ lat: inPersonMatches[0].Latitude, lng: inPersonMatches[0].Longitude });
      map.setZoom(12);
    } else if (inPersonMatches.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      inPersonMatches.forEach(r => {
        if (r.Latitude && r.Longitude) {
          bounds.extend({ lat: r.Latitude, lng: r.Longitude });
        }
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds);
    }
  }

  input.addEventListener("input", () => {
    if (input.value.trim().length === 0) {
      icon.classList.add("disabled");
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      renderResourcesOnMap(resources);
    } else {
      icon.classList.remove("disabled");
      icon.classList.add("active");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value.trim().length > 0) {
      runSearch();
      icon.style.display = "none";
      clearBtn.style.display = "block";
    }
  });

  icon.addEventListener("click", () => {
    if (icon.classList.contains("disabled")) return;
    if (icon.classList.contains("toggled")) {
      input.value = "";
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      renderResourcesOnMap(resources);
      return;
    }
    if (input.value.trim().length === 0) return;
    runSearch();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    icon.classList.add("disabled");
    icon.classList.remove("active", "toggled");
    icon.style.display = "block";
    clearBtn.style.display = "none";
    renderResourcesOnMap(resources);
  });

  runGeolocation(true);
  setTimeout(() => runGeolocation(false), 200);
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
