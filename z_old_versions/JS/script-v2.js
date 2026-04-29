// Function to increase text size dynamically
function increaseTextSize() {
  const storyContainer = document.getElementById("story-text-container");
  // --------------------------------------------------
  // ADJUSTABLE: Font size increment
  // --------------------------------------------------
  const currentSize = window.getComputedStyle(storyContainer).fontSize;
  const newSize = parseFloat(currentSize) * 1.1;
  storyContainer.style.fontSize = newSize + "px";
}

// ---------------------------------------------------------
// PART 1: Map Setup & Variables

// ADJUSTABLE: Map Center [Latitude, Longitude] and Zoom
// --------------------------------------------------
const concordCoords = [35.4087, -80.5816];
const initialZoom = 12;

const map = L.map("map").setView(concordCoords, initialZoom);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors & CartoDB",
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

// --------------------------------------------------------------------------------
// PART 2: Styling and Popup Functions

// ADJUSTABLE: Colors for Income Change Choropleth & Neighborhood Circles
// --------------------------------------------------------------------------------
function getIncomeColor(incomeChange) {
  if (incomeChange === null || incomeChange === undefined) return "#cccccc"; // No data
  return incomeChange > 5000
    ? "#006d2c"
    : incomeChange > 0
      ? "#31a354"
      : incomeChange > -5000
        ? "#fb6a4a"
        : "#de2d26";
}

// Calculates a 5-color "Natural Breaks" (Equal Interval) scale for Income
function getIncomeColor(d) {
  if (d === null) return "#555555"; // Grey for missing/null data

  const range = maxIncome - minIncome;
  const step = range / 5;

  if (d >= minIncome + 4 * step) return "#1a9641"; // Dark Green (Highest Increase)
  if (d >= minIncome + 3 * step) return "#a6d96a"; // Light Green
  if (d >= minIncome + 2 * step) return "#ffffbf"; // Yellow
  if (d >= minIncome + 1 * step) return "#fdae61"; // Orange
  return "#d7191c"; // Red (Lowest Increase)
}

// REPLACED styleTract in script-v1.js with the below
function styleTract(feature) {
  const props = feature.properties;
  let borderColor = "#999999"; // Default fallback

  // Apply bright, thick borders based on Neighborhood ID
  if (props.NeighID === "High") borderColor = "#28a745"; // Green
  if (props.NeighID === "Home") borderColor = "#fd7e14"; // Orange
  if (props.NeighID === "Low") borderColor = "#00bfff"; // Bright Blue

  return {
    fillColor: getIncomeColor(props.income_change),
    color: borderColor,
    weight: 4, // Semi-thicker circle/border
    opacity: 1,
    fillOpacity: 0.8,
  };
}

function buildBarChartHTML(demoDataInput) {
  if (!demoDataInput || demoDataInput.length === 0)
    return "<p>No demographic data available.</p>";

  let demoData;
  // If it's a string, parse it. If it's already an object/array, just use it!
  if (typeof demoDataInput === "string") {
    demoData = JSON.parse(demoDataInput);
  } else {
    demoData = demoDataInput;
  }

  let html = '<div style="margin-top: 10px; font-family: sans-serif;">';
  html += "👨‍👩‍👧‍👦 <strong>Top 3 Demographic</strong> Changes (%)<br>";

  demoData.forEach((item) => {
    // Calculate a safe width for the CSS bar (cap at 100% width for layout purposes)
    const displayWidth = Math.min(Math.abs(item.pct_change), 100);
    const barColor = item.pct_change >= 0 ? "#4285F4" : "#EA4335"; // Blue for +, Red for -

    // Tooltip text showing Estimate and MOE
    const hoverText = `2013: ${item.est_13} (±${item.moe_13}) | 2021: ${item.est_21} (±${item.moe_21})`;

    html += `<div style="margin-bottom: 8px;" title="${hoverText}">`;
    html += `<span style="font-size: 12px;">${item.group}: ${item.pct_change}%</span><br>`;
    html += `<div style="width: 100%; background: #ddd; height: 10px; border-radius: 2px;">`;
    html += `<div style="width: ${displayWidth}%; background: ${barColor}; height: 10px; border-radius: 2px;"></div>`;
    html += `</div></div>`;
  });

  html +=
    '<small style="color: gray;"><i>Hover over bars for exact counts & Margins of Error</i></small></div>';
  return html;
}

// REMOVED old addFeatures function (in script-v1.js), replaced with below
function addFeatures(feature, layer) {
  const props = feature.properties;
  const propChange = props.property_value_change;

  // --- 1. Clean up the Census Tract name string ---
  // Splits "Census Tract 425.02, Cabarrus..." at the comma, keeping only the first part
  const cleanTract = props.Census_Tract.split(",")[0];

  // --- 2. Check for missing boundary data ---
  if (props.income_change === null || propChange === null) {
    const fallbackHTML = `
      <div style="font-family: sans-serif; max-width: 250px;">
        <strong>${props.NeighID} Neighborhood</strong>: ${cleanTract}<br>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 8px 0;">
        <p style="color: #d9534f; font-weight: bold; margin-bottom: 0; font-size: 0.9em;">
          <em>Data unavailable for 2013 comparison due to 2020 Census boundary changes.</em>
        </p>
      </div>
    `;
    layer.bindPopup(fallbackHTML);
    return;
  }

  // --- 3. Build the Popup Content FIRST ---
  let popupContent = `<div style="min-width: 200px; font-family: sans-serif;">`;
  popupContent += `<b>${props.NeighID} Neighborhood</b>: ${cleanTract}<br><hr style="margin: 5px 0;">`;

  const incStr = `$${props.income_change.toLocaleString()}`;
  const propStr = `$${propChange.toLocaleString()}`;

  popupContent += `💵 <b>Income</b> Change: +${incStr}<br>`;
  popupContent += `🏘️ <b>Property Value</b> Change: +${propStr}<br>`;
  popupContent += buildBarChartHTML(props.top_3_demographics);
  popupContent += `</div>`;

  // Bind to the underlying polygon
  layer.bindPopup(popupContent);

  // --- 4. Dynamic House Icon Sizing & Interactivity ---
  if (propChange !== null && propChange !== undefined) {
    const minSize = 16; // Smallest house size
    const maxSize = 48; // Largest house size
    let iconSize = minSize;

    // Scale the house size on a continuum based on the raw dollar amount
    if (maxProp > minProp) {
      iconSize =
        minSize +
        ((propChange - minProp) / (maxProp - minProp)) * (maxSize - minSize);
    }

    let iconHtml =
      propChange >= 0
        ? `<div style="font-size: ${iconSize}px; color: #ffffff; opacity: 1; text-shadow: 2px 2px 4px #000; line-height: 1;">🏠</div>`
        : `<div style="font-size: ${iconSize}px; color: #FFFF00; opacity: 1; transform: rotate(180deg); text-shadow: 2px 2px 4px #000; line-height: 1;">🏠</div>`;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: "custom-house-icon",
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2], // Keeps houses perfectly centered as they grow
    });

    if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      // Make the icon interactive and bind the exact same popup to it!
      const marker = L.marker(center, {
        icon: customIcon,
        interactive: true,
      }).addTo(map);
      marker.bindPopup(popupContent);
    }
  }
}

// ---------------------------------------------------------
// PART 3: Data Fetching (The core engine)

// Load the combined GeoJSON created by your Python script
// ---------------------------------------------------------
// Global variables to hold min/max values for our dynamic sizing/coloring
let minIncome = Infinity,
  maxIncome = -Infinity;
let minProp = Infinity,
  maxProp = -Infinity;

// REPLACED old version with the below (see script-v1.js for previous - Changed so can do
// things like only show the levels of increases opposed to showing decreases
// in property value & income.

fetch("combined_neighborhoods_processed.geojson")
  .then((response) => response.json())
  .then((data) => {
    // 1. Find the highest and lowest values in the dataset
    data.features.forEach((f) => {
      const inc = f.properties.income_change;
      const prop = f.properties.property_value_change;

      if (inc !== null) {
        if (inc < minIncome) minIncome = inc;
        if (inc > maxIncome) maxIncome = inc;
      }
      if (prop !== null) {
        if (prop < minProp) minProp = prop;
        if (prop > maxProp) maxProp = prop;
      }
    });

    // 2. Draw the map
    const geojsonLayer = L.geoJSON(data, {
      style: styleTract,
      onEachFeature: addFeatures,
    }).addTo(map);

    // 3. Auto-zoom to fit the neighborhoods with roughly 1.5 inches of padding
    map.fitBounds(geojsonLayer.getBounds(), { padding: [75, 75] });
  })
  .catch((error) => console.log("Error loading GeoJSON:", error));

// ---------------------------------------------------------
// PART 4: User Interface & Button Logic
// ---------------------------------------------------------

// --- Story Section Navigation Logic ---
let currentStep = 0;

function changeStep(direction) {
  const steps = document.querySelectorAll(".story-step");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  // 1. Remove the "active" class from the current step
  steps[currentStep].classList.remove("active");

  // 2. Change the step number (adds 1 for Next, subtracts 1 for Prev)
  currentStep += direction;

  // 3. Add the "active" class to the new step
  steps[currentStep].classList.add("active");

  // 4. Turn buttons on/off based on where we are
  prevBtn.disabled = currentStep === 0; // Disable Prev on first step
  nextBtn.disabled = currentStep === steps.length - 1; // Disable Next on last step
}
