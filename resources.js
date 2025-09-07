const excelFilePath = "assets/canadianMentalHealthResources.xlsx";

let resources = [];
let map;
let markers = [];
let userPos = null;

async function loadExcel() {
  const response = await fetch(excelFilePath);
  if (!response.ok) return [];
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return json.map(r => {
    return {
      ...r,
      OriginalCategory: r.Category ? r.Category.trim() : "",
      Category: r.Category ? r.Category.toLowerCase().trim().replace(/\s+/g, " ") : "",
      Name: r.Name ? r.Name.toLowerCase().trim().replace(/\s+/g, " ") : "",
      Latitude: r.Latitude && !isNaN(parseFloat(r.Latitude)) ? parseFloat(r.Latitude) : null,
      Longitude: r.Longitude && !isNaN(parseFloat(r.Longitude)) ? parseFloat(r.Longitude) : null
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
    const isOnline = r.OnlineOnly && r.OnlineOnly.toLowerCase() === "yes";
    const hasCoords = r.Latitude && r.Longitude;
    if (isOnline) {
      onlineList.push(r);
    } else if (hasCoords) {
      const marker = new google.maps.Marker({
        position: { lat: r.Latitude, lng: r.Longitude },
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
  if (onlineList.length > 0) {
    let onlineHeading = onlineSection.querySelector(".online-heading");
    let categoryFilter = onlineSection.querySelector("#online-category");
    let onlineContainer = onlineSection.querySelector(".resources-list");
    if (!onlineHeading) {
      onlineHeading = document.createElement("h2");
      onlineHeading.className = "online-heading";
      onlineHeading.textContent = "Online Resources";
      onlineSection.appendChild(onlineHeading);

      categoryFilter = document.createElement("select");
      categoryFilter.id = "online-category";
      categoryFilter.innerHTML = `<option value="all">All Categories</option>`;
      onlineSection.appendChild(categoryFilter);

      const categories = [...new Set(onlineList.map(r => r.Category).filter(Boolean))];
      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        const pretty = onlineList.find(r => r.Category === cat)?.OriginalCategory || cat;
        option.textContent = pretty;
        categoryFilter.appendChild(option);
      });

      onlineContainer = document.createElement("div");
      onlineContainer.className = "resources-list";
      onlineSection.appendChild(onlineContainer);

      categoryFilter.addEventListener("change", () => renderOnlineCards(categoryFilter.value));
    }
    function renderOnlineCards(selected) {
      let cards = onlineContainer.querySelectorAll(".resource-card");
      if (cards.length === 0) {
        onlineList.forEach((r) => {
          const distance =
            userPos && r.Latitude && r.Longitude
              ? getDistanceKm(userPos.lat, userPos.lng, r.Latitude, r.Longitude) + " km away"
              : "Distance unavailable";
          const card = document.createElement("div");
          card.className = "resource-card initial-load";
          card.setAttribute("data-category", r.Category);
          card.innerHTML = `
            <h2>${r.Name}</h2>
            <p><strong>${r.OriginalCategory || r.Category}</strong></p>
            <p>${r.Description}</p>
            <p>${r.Contact || ""}</p>
            <p><em>${r.City ? r.City + ", " : ""}${r.Province || ""}</em></p>
            <p class="info-distance">${distance}</p>
            <a href="${r.Link}" target="_blank">Visit Website</a>
          `;
          onlineContainer.appendChild(card);
          card.addEventListener("animationend", () => {
            card.classList.remove("initial-load");
          }, { once: true });
        });
        cards = onlineContainer.querySelectorAll(".resource-card");
      }
      cards.forEach(card => {
        const cat = card.getAttribute("data-category");
        if (selected === "all" || cat === selected) {
          card.style.display = "block";
          card.classList.remove("fade-in");
          void card.offsetWidth;
          card.classList.add("fade-in");
        } else {
          card.style.display = "none";
        }
      });
    }
    renderOnlineCards("all");
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
  renderResourcesOnMap(resources);

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
      (err) => {
        console.error(err);
        alert("Unable to get your location");
      },
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