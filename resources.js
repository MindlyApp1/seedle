
const excelFilePath = "assets/canadianMentalHealthResources.xlsx";

let resources = [];
let map;
let markers = [];

let firstOnlineRender = true;
let universityMarkers = [];
let universities = [];
let currentUni = null;
let currentType = null;

const categoryColorMap = {};
let colorIndex = 0;

const distinctColors = [
  "#FF1744", "#00E676", "#FFEA00", "#2979FF", "#FF9100", "#D500F9",
  "#00E5FF", "#FF4081", "#76FF03", "#FF6D00", "#0091EA", "#C51162",
  "#64DD17", "#FFD600", "#AA00FF", "#FF3D00", "#00B8D4", "#AEEA00",
  "#6200EA", "#FFAB00"
];

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
      Longitude: row.Longitude && !isNaN(parseFloat(row.Longitude)) ? parseFloat(row.Longitude) : null,
      OHIP: row.OHIP !== undefined ? String(row.OHIP).trim() : "",
      UHIP: row.UHIP !== undefined ? String(row.UHIP).trim() : "",
    };
  });
}

async function loadUniversities() {
  const response = await fetch("assets/canadianUniversitiesAndColleges.xlsx");
  if (!response.ok) return [];
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return json.map(u => ({
    Name: u.University || "",
    City: u.City || "",
    Address: u.Address || "",
    Latitude: u.Latitude && !isNaN(parseFloat(u.Latitude)) ? parseFloat(u.Latitude) : null,
    Longitude: u.Longitude && !isNaN(parseFloat(u.Longitude)) ? parseFloat(u.Longitude) : null
  }));
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

function getCategoryColor(category) {
  const normalized = (category || "").toLowerCase().trim();
  if (!normalized) return "#808080";

  if (categoryColorMap[normalized]) return categoryColorMap[normalized];

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

      let distanceText = "";

      if (currentType === "inperson" && currentUni) {
        const uni = universities.find(u => u.Name === currentUni);
        if (uni && uni.Latitude && uni.Longitude) {
          const dist = getDistanceKm(uni.Latitude, uni.Longitude, r.Latitude, r.Longitude);
          distanceText = `<p class="info-distance">${dist} km from campus</p>`;
        } else {
          distanceText = `<p class="info-distance">Distance from campus unavailable</p>`;
        }
      }

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div class="info-card">
            <h2 class="info-title">${r.Name}</h2>
            <p class="info-category"><strong>${r.Category}</strong></p>
            <p class="info-description">${r.Description}</p>
            <p class="info-address">${r.Address || ""}</p>
            ${distanceText}

            ${r["Phone Number"] ? `<p class="info-contact">Phone: ${r["Phone Number"]}</p>` : ""}
            ${r.Email ? `<p class="info-contact">Email: ${r.Email}</p>` : ""}
            ${r.Hours ? `<p class="info-contact">Hours: ${r.Hours}</p>` : ""}

            <p><strong>OHIP Coverage:</strong> ${r.OHIP || "Not provided"}</p>
            <p><strong>UHIP Coverage:</strong> ${r.UHIP || "Not provided"}</p>


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
            <p>${r.Address || ""}</p>

            ${r["Phone Number"] ? `<p>Phone: ${r["Phone Number"]}</p>` : ""}
            ${r.Email ? `<p>Email: ${r.Email}</p>` : ""}
            ${r.Hours ? `<p>Hours: ${r.Hours}</p>` : ""}

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
      if (!window.preventAutoZoom) {
        if (markers.length === 1) {
          map.setCenter(markers[0].getPosition());
          map.setZoom(12);
        } else {
          map.fitBounds(bounds);
        }
      }
    } else {
      const uniSelect = document.getElementById("university-select");
      const selectedUni = uniSelect ? uniSelect.value : null;

      if (selectedUni) {
        const uni = universities.find(u => u.Name === selectedUni);
        if (uni && uni.Latitude && uni.Longitude) {
          map.setCenter({ lat: uni.Latitude, lng: uni.Longitude });
          map.setZoom(13);
        }
      }

      else {
        map.setCenter({ lat: 56.1304, lng: -106.3468 });
        map.setZoom(4);
      }
    }
}

function renderUniversitiesOnMap(universities, selectedUni = "all") {
  if (!map || !universities.length) return;

  universityMarkers.forEach(m => m.setMap(null));
  universityMarkers = [];

  let unisToShow = universities;
  if (selectedUni !== "all") {
    unisToShow = universities.filter(
      u => u.Name && u.Name.toLowerCase().trim() === selectedUni.toLowerCase().trim()
    );
  }

  const uniIcon = {
    path: "M12 2L1 7v2h22V7L12 2zm-1 7v9H7v-9H4v9H2v2h20v-2h-2v-9h-3v9h-4V9h-2z",
    fillColor: "#1E88E5",
    fillOpacity: 1,
    strokeColor: "#0D47A1",
    strokeWeight: 1.5,
    scale: 1.6,
    anchor: new google.maps.Point(12, 24)
  };

  let singleMarker = null;
  let singleInfo = null;

  unisToShow.forEach(u => {
    if (!u.Latitude || !u.Longitude) return;

    const marker = new google.maps.Marker({
      position: { lat: u.Latitude, lng: u.Longitude },
      map,
      title: u.Name,
      icon: uniIcon,
      zIndex: 5
    });

    const info = new google.maps.InfoWindow({
      content: `
        <div class="info-card">
          <h2>${u.Name}</h2>
          <p>${u.Address || ""}</p>
          <p>${u.City || ""}</p>
        </div>`
    });

    marker.addListener("click", () => {
      info.open(map, marker);
      map.panTo(marker.getPosition());
    });

    if (unisToShow.length === 1) {
      singleMarker = marker;
      singleInfo = info;
    }

    universityMarkers.push(marker);
  });

  if (unisToShow.length === 1 && unisToShow[0].Latitude && unisToShow[0].Longitude) {
    const target = unisToShow[0];
    map.setCenter({ lat: target.Latitude, lng: target.Longitude });
    map.setZoom(12);

    if (singleMarker && singleInfo) {
      singleInfo.open(map, singleMarker);
      singleMarker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => singleMarker.setAnimation(null), 1500);
    }
  }
}

async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 56.1304, lng: -106.3468 },
    zoom: 4,
    minZoom: 3,
    maxZoom: 18,
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
  universities = await loadUniversities();
  
  renderUniversitiesOnMap(universities);

  const allCategories = [...new Set(resources.map(r => r.Category).filter(Boolean))];
  allCategories.forEach(cat => getCategoryColor(cat));

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
  if (backBtn) {
    backBtn.style.display = "none";
    backBtn.classList.add("styled-back-btn");
  }


  if (questionnaireForm) {
    const typeSelect = document.getElementById("resource-type");
    const uniWrapper = document.getElementById("university-wrapper");
    const uniSelect = document.getElementById("university-select");

    universities.forEach(u => {
      const option = document.createElement("option");
      option.value = u.Name;
      option.textContent = u.Name;
      uniSelect.appendChild(option);
    });

    typeSelect.addEventListener("change", () => {
      const isInPerson = typeSelect.value === "inperson";
      uniWrapper.style.display = isInPerson ? "block" : "none";
      uniSelect.required = isInPerson;
    });

    uniSelect.addEventListener("change", () => {
      if (typeSelect.value === "inperson") {
        updateCategoryDropdown(uniSelect.value);
      }
    });

    questionnaireForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const type = typeSelect.value;
      const selectedUni = uniSelect.value;

      if (type === "inperson") {
        currentType = "inperson";
        currentUni = selectedUni;
      } else if (type === "online") {
        currentType = "online";
        currentUni = null;
      }

      if (!type) {
        alert("Please choose Online or In-person to continue.");
        return;
      }

      if (type === "inperson" && !selectedUni) {
        alert("Please select your university before continuing.");
        uniSelect.focus();
        return;
      }

      const mainHeading = document.querySelector(".resources-container h1");
      const mapDescription = document.getElementById("map-description");

      if (type === "online") {
        mainHeading.textContent = "Online Resources";
        mapDescription.textContent = "Explore accessible mental health supports you can use anytime, anywhere.";
      } else if (type === "inperson") {
        if (selectedUni) {
          mapDescription.textContent = `Explore trusted in-person resources near ${selectedUni} on the map below.`;
        }
      }

      let filtered = resources;

      if (type === "online") {
        filtered = filtered.filter(r => r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes");

        mainHeading.textContent = "Online Resources";
        mapDescription.textContent = "Explore accessible mental health supports you can use anytime, anywhere.";

        document.getElementById("map-container").style.display = "none";
        document.getElementById("map-description").style.display = "block";
        document.getElementById("province-name").style.display = "none";

        document.getElementById("online-resources-section").style.display = "block";
        document.getElementById("inperson-resources-section").style.display = "none";
        document.getElementById("search-form").style.display = "none";

        renderResourcesOnMap(filtered);
      }

      else if (type === "inperson") {
        filtered = filtered.filter(r => r.OnlineOnly.toLowerCase() !== "yes");

        if (selectedUni) {
          const uni = universities.find(
            u => u.Name && u.Name.toLowerCase().trim() === selectedUni.toLowerCase().trim()
          );

          if (uni && uni.Latitude && uni.Longitude) {
            filtered = filtered.filter(r =>
              r.Latitude &&
              r.Longitude &&
              getDistanceKm(uni.Latitude, uni.Longitude, r.Latitude, r.Longitude) <= 25
            );
            renderUniversitiesOnMap([uni], uni.Name);
            map.setCenter({ lat: uni.Latitude, lng: uni.Longitude });
            map.setZoom(13);
          }
        }

        document.getElementById("online-resources-section").style.display = "none";
        document.getElementById("map-description").style.display = "block";
        document.getElementById("map-container").style.display = "block";
        document.getElementById("search-form").style.display = "flex";
        document.getElementById("province-name").style.display = "block";

        document.getElementById("questionnaire").style.display = "none";

        renderResourcesOnMap(filtered);

      }

      if (type === "inperson") {
        updateCategoryDropdown(selectedUni);
      }

      document.getElementById("questionnaire").style.display = "none";
      document.getElementById("resourcesList").style.display = "block";

      if (type === "online" || type === "inperson") {
        backBtn.style.display = "inline-block";
        backBtn.classList.add("styled-back-btn");
      }

      document.getElementById("map-description").style.display = "block";

    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.querySelector(".resources-container h1").textContent = "Resources";
      document.getElementById("map-description").textContent =
        "Explore trusted in-person resources across Canadian universities on the map below.";

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

  const form = document.getElementById("search-form");
  const input = document.getElementById("map-search");
  const icon = document.querySelector(".search-icon");
  const clearBtn = document.getElementById("clear-search");
  icon.classList.add("disabled");

  const mapCategorySelect = document.getElementById("map-category");

  function updateCategoryDropdown(selectedUni = "all") {
    mapCategorySelect.innerHTML = `<option value="all">All Categories</option>`;

    let filteredResources = resources.filter(
      r => !r.OnlineOnly || r.OnlineOnly.toLowerCase() !== "yes"
    );

    if (selectedUni !== "all") {
      const uni = universities.find(u => u.Name === selectedUni);
      if (uni && uni.Latitude && uni.Longitude) {
        filteredResources = filteredResources.filter(r =>
          r.Latitude && r.Longitude &&
          getDistanceKm(uni.Latitude, uni.Longitude, r.Latitude, r.Longitude) <= 25
        );
      }
    }

    const categories = [...new Set(filteredResources.map(r => r.Category).filter(Boolean))];

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent =
        filteredResources.find(r => r.Category === cat)?.OriginalCategory || cat;
      mapCategorySelect.appendChild(option);
    });
  }

  if (mapCategorySelect) {
    mapCategorySelect.innerHTML = `<option value="all">All Categories</option>`;

    mapCategorySelect.addEventListener("change", () => {
      const selectedCategory = mapCategorySelect.value;
      const typeSelect = document.getElementById("resource-type");
      const uniSelect = document.getElementById("university-select");
      const selectedUni = uniSelect ? uniSelect.value : "all";
      const type = typeSelect ? typeSelect.value : "";
      let filtered = [...resources];

      if (type === "online") {
        filtered = filtered.filter(r => r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes");
      } else if (type === "inperson") {
        filtered = filtered.filter(r => !r.OnlineOnly || r.OnlineOnly.toLowerCase() !== "yes");

        if (selectedUni && selectedUni !== "all") {
          const uni = universities.find(u => u.Name === selectedUni);
          if (uni && uni.Latitude && uni.Longitude) {
            filtered = filtered.filter(r =>
              r.Latitude &&
              r.Longitude &&
              getDistanceKm(uni.Latitude, uni.Longitude, r.Latitude, r.Longitude) <= 25
            );
          }
        }
      }

      if (selectedCategory !== "all") {
        filtered = filtered.filter(r => r.Category === selectedCategory);
      }

      window.preventAutoZoom = true;
      renderResourcesOnMap(filtered);
      window.preventAutoZoom = false;
    });
  }

  function getActiveFilteredResources() {
    let filtered = [...resources];

    if (currentType === "online") {
      filtered = filtered.filter(r => r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes");
    } else if (currentType === "inperson" && currentUni) {
      const uni = universities.find(u => u.Name === currentUni);
      if (uni && uni.Latitude && uni.Longitude) {
        filtered = filtered.filter(r =>
          r.Latitude &&
          r.Longitude &&
          getDistanceKm(uni.Latitude, uni.Longitude, r.Latitude, r.Longitude) <= 25
        );
      }
    }

    return filtered;
  }

  function runSearch() {
    const query = input.value.trim().toLowerCase();

    if (!query) {
      const filtered = getActiveFilteredResources();
      renderResourcesOnMap(filtered);
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      return;
    }

    const baseResources = getActiveFilteredResources();
    icon.classList.add("active", "toggled");
    icon.style.display = "none";
    clearBtn.style.display = "block";

    const queryWords = query.split(/\s+/);

    const matched = baseResources.filter(r => {
      const combined = `
        ${String(r.Name || "")}
        ${String(r.City || "")}
        ${String(r.Province || "")}
        ${String(r.Category || "")}
        ${String(r.Address || "")}
        ${String(r["Phone Number"] || "")}
        ${String(r.Email || "")}
        ${String(r.Hours || "")}
        ${String(r.Description || "")}
      `.toLowerCase();
      return queryWords.every(word => combined.includes(word));
    });

    renderResourcesOnMap(matched);

    function findResourceMarker(lat, lng) {
      return markers.find(
        m =>
          Math.abs(m.getPosition().lat() - lat) < 0.0001 &&
          Math.abs(m.getPosition().lng() - lng) < 0.0001
      );
    }

    if (matched.length === 1 && matched[0].Latitude && matched[0].Longitude) {
      const r = matched[0];
      const marker = findResourceMarker(r.Latitude, r.Longitude);
      if (marker) {
        google.maps.event.trigger(marker, "click");
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => marker.setAnimation(null), 1500);
        map.setCenter({ lat: r.Latitude, lng: r.Longitude });
        map.setZoom(14);
      }
      return;
    }

    if (matched.length > 1) {
      const q = query.toLowerCase();
      const scored = matched.map(r => {
        const name = r.Name?.toLowerCase() || "";
        const address = r.Address?.toLowerCase() || "";
        const desc = r.Description?.toLowerCase() || "";
        const score =
          (name.includes(q) ? 3 : 0) +
          (address.includes(q) ? 2 : 0) +
          (desc.includes(q) ? 1 : 0);
        return { r, score };
      });

      const best = scored.sort((a, b) => b.score - a.score)[0];
      const chosen = best?.r;

      if (chosen && chosen.Latitude && chosen.Longitude && best.score > 0) {
        const marker = findResourceMarker(chosen.Latitude, chosen.Longitude);
        if (marker) {
          google.maps.event.trigger(marker, "click");
          marker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => marker.setAnimation(null), 1500);
          map.setCenter({ lat: chosen.Latitude, lng: chosen.Longitude });
          map.setZoom(14);
        }
      }
    }

    window.preventAutoZoom = true;
  }

  input.addEventListener("input", () => {
    if (input.value.trim().length === 0) {
      icon.classList.add("disabled");
      icon.classList.remove("active", "toggled");
      icon.style.display = "block";
      clearBtn.style.display = "none";
      const filtered = getActiveFilteredResources();
      renderResourcesOnMap(filtered);
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
      const filtered = getActiveFilteredResources();
      renderResourcesOnMap(filtered);
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
    const filtered = getActiveFilteredResources();
    renderResourcesOnMap(filtered);
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
