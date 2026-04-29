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
const concordCoords = [33.4087, -80.52];
const initialZoom = 12;

const map = L.map("map").setView(concordCoords, initialZoom);

// Add legend to Page 1
const page1Legend = L.control({ position: "bottomright" });
page1Legend.onAdd = buildLegendContent; // <-- Uses our new function!
page1Legend.addTo(map); // (Change 'map' if your Page 1 map variable has a different name)

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors & CartoDB",
  subdomains: "abcd",
  maxZoom: 19,
}).addTo(map);

// ---------------------------------------------------------
/// REUSABLE LEGEND FUNCTION: To build the legend HTML
// --------------------------------------------------
function buildLegendContent() {
  const div = L.DomUtil.create("div", "info legend");

  // --- 1. INCOME BREAKS (Now Red to Green!) ---
  const incomeGrades = [18183, 21119, 26495, 30029, 50177];
  const colors = ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"];

  let html = "<h4>Income Change</h4>";
  for (let i = 0; i < incomeGrades.length; i++) {
    let gradeStart = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(incomeGrades[i]);
    let gradeEnd = incomeGrades[i + 1]
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(incomeGrades[i + 1])
      : null;

    html +=
      '<i style="background:' +
      colors[i] +
      '"></i> ' +
      gradeStart +
      (gradeEnd ? " &ndash; " + gradeEnd + "<br>" : "+");
  }

  // --- 2. PROPERTY BREAKS (Now using Houses!) ---
  html += '<h4 style="margin-top: 15px;">Property Value Change</h4>';
  const propBreaks = [37690, 98960, 209310];

  // The sizes (in pixels) for the houses in the legend
  const houseSizes = [18, 27, 36];

  for (let i = 0; i < propBreaks.length; i++) {
    let propVal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(propBreaks[i]);

    // Draws a simple, scalable SVG house
    let houseIcon = `<svg width="${houseSizes[i]}" height="${houseSizes[i]}" viewBox="0 0 24 24" fill="#333" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L2 12H5V20H19V12H22L12 3Z"></path>
        </svg>`;

    html +=
      '<div style="display: flex; align-items: center; margin-bottom: 5px;">' +
      '<div style="width: 30px; display: flex; justify-content: center; margin-right: 5px;">' +
      houseIcon +
      "</div>" +
      "<span>" +
      propVal +
      "+</span>" +
      "</div>";
  }

  div.innerHTML = html;
  return div;
}

// --------------------------------------------------------------------------------
// PART 2: Styling and Popup Functions

// ADJUSTABLE: Colors for Income Change Choropleth & Neighborhood Circles
// --------------------------------------------------------------------------------
function getIncomeColor(incomeChange) {
  if (incomeChange === null || incomeChange === undefined) return "#cccccc"; // No data

  // Red to Green scale based on your exact Python Natural Breaks
  return incomeChange >= 50177
    ? "#1a9641" // Dark Green (Largest increase)
    : incomeChange >= 30029
      ? "#a6d96a" // Light Green
      : incomeChange >= 26495
        ? "#ffffbf" // Yellow
        : incomeChange >= 21119
          ? "#fdae61" // Orange
          : "#d7191c"; // Red (Smallest increase)
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

// REPLACED styleTract in script-v2.js with the below to make lines thin around tracts
// This replaces your old styleTract function
function styleTractInner(feature) {
  const props = feature.properties;

  return {
    fillColor: getIncomeColor(props.income_change),
    fillOpacity: 0.8,

    // Thin grey lines between the tracts so they don't compete with your new thick borders
    color: "#888888",
    weight: 1,
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

  // --- 3. Build the Popup Content FIRST (PAGE 1) ---
  let popupContent = `<div style="min-width: 200px; font-family: sans-serif;">`;
  popupContent += `<b>${props.NeighID} Neighborhood</b>: ${cleanTract}<br><hr style="margin: 5px 0;">`;

  const incStr = `$${props.income_change.toLocaleString()}`;
  const propStr = `$${propChange.toLocaleString()}`;

  popupContent += `💵 <b>Income</b> Change: +${incStr}<br>`;
  popupContent += `🏘️ <b>Property Value</b> Change: +${propStr}<br>`;
  popupContent += buildBarChartHTML(props.top_3_demographics);
  // Add this line at the bottom of your popupContent construction
  popupContent += `<hr style="margin: 8px 0;">`;
  popupContent += `<a href="#page2-anchor" style="color: #007bff; text-decoration: underline; font-weight: bold; cursor: pointer;" onclick="document.getElementById('neighborhood-select').value='${props.NeighID}'; updatePage2Map('${props.NeighID}');">View Neighborhood Details →</a>`;
  popupContent += `</div>`;

  // Bind to the underlying polygon
  layer.bindPopup(popupContent);

  // --- 4. Dynamic House Icon Sizing & Interactivity ---
  if (propChange !== null && propChange !== undefined) {
    // 1. Set size based on your EXACT 3 Python bins
    // New 50% larger sizes: 18px (Small), 27px (Medium), 36px (Large)
    let iconSize = 18;
    if (propChange >= 209310) {
      iconSize = 36; // Was 24
    } else if (propChange >= 98960) {
      iconSize = 27; // Was 18
    } else {
      iconSize = 18; // Was 12
    }

    // Update the SVG Icon (ensure width/height use the new iconSize)
    let iconHtml = `<div style="display: flex; justify-content: center; align-items: center; width: ${iconSize}px; height: ${iconSize}px;">
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="#1a1a1a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(1px 1px 1px rgba(255,255,255,0.8));">
                <path d="M12 3L2 12H5V20H19V12H22L12 3Z"></path>
            </svg>
        </div>`;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: "custom-house-icon",
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2], // Centering logic stays the same
    });

    if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();

      // Add the marker to the map
      const marker = L.marker(center, {
        icon: customIcon,
        interactive: true,
      }).addTo(map); // <--- Make sure this still says 'map' (or whatever your Page 1 map is called)

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

// REPLACED old version with the below (see script-v2.js - Changed so can
// put circles around each neighborhood using a Leaflet command.

// Load the base data
fetch("combined_neighborhoods_processed.geojson")
  .then((response) => response.json())
  .then((data) => {
    // 1. Find min/max values
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

    // 2. Draw the tracts (now with ZERO inner borders!)
    const geojsonLayer = L.geoJSON(data, {
      style: styleTractInner,
      onEachFeature: addFeatures,
    }).addTo(map);

    // 3. Find the borders of each neighborhood to draw our perfect circles
    const boundsDict = {};

    // Look at every tract and group its boundaries by Neighborhood ID
    geojsonLayer.eachLayer(function (layer) {
      const id = layer.feature.properties.NeighID;
      if (!id) return;

      if (!boundsDict[id]) {
        boundsDict[id] = L.latLngBounds(); // Create a new invisible box
      }
      boundsDict[id].extend(layer.getBounds()); // Stretch the box to fit the tract
    });

    // 4. Draw the perfect geometric circles!
    const circleColors = { High: "#28a745", Home: "#fd7e14", Low: "#00bfff" };

    for (const id in boundsDict) {
      const bounds = boundsDict[id];
      const center = bounds.getCenter(); // Find the exact middle of the neighborhood

      // Calculate a radius that covers the whole neighborhood
      // (Measures distance from the center to the top-right corner)
      const radius = center.distanceTo(bounds.getNorthEast());

      // Draw the perfect circle
      L.circle(center, {
        radius: radius * 0.8, // Shrunk to 80% so it's snug. Tweak this number if you want!
        color: circleColors[id] || "#999999",
        weight: 4, // Thick outline
        fillOpacity: 0, // Completely see-through inside
        interactive: false, // Don't block clicks to the houses below
      }).addTo(map);
    }

    // 5. Auto-zoom the map
    map.fitBounds(geojsonLayer.getBounds(), {
      padding: [40, 40],
      paddingBottomRight: [200, 0],
    });
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

// Listen for changes on the dropdown menu
document
  .getElementById("neighborhood-dropdown")
  .addEventListener("change", function (e) {
    const selectedValue = e.target.value;

    // Check which one they picked and load the right data/colors
    if (selectedValue === "High") {
      loadNeighborhoodPage("High", "High Neighborhood", "#28a745"); // Green
    } else if (selectedValue === "Home") {
      loadNeighborhoodPage("Home", "Home Neighborhood", "#fd7e14"); // Orange
    } else if (selectedValue === "Low") {
      loadNeighborhoodPage("Low", "Low Neighborhood", "#00bfff"); // Blue
    }

    // Reset the dropdown back to default so they can use it again later
    e.target.selectedIndex = 0;
  });

// =====================================================================
// PAGE 2 LOGIC: TABLE, MAP, AND PAGE SWITCHING
// =====================================================================

// To avoid redrawing things on top of each other (at least some of this does that, like Houses)
let globalTableData = [];
let mapPage2 = null;
let page2Layer = null;
let page2Legend = null;
let page2Houses = L.layerGroup();

// 1. Fetch the lightweight table data once when the page loads
fetch("table_data.json")
  .then((response) => response.json())
  .then((data) => {
    globalTableData = data;
  })
  .catch((error) => console.log("Error loading table data:", error));

// Function to switch from Page 1 to Page 2
function loadNeighborhoodPage(
  neighborhoodId,
  neighborhoodName,
  neighborhoodColor,
) {
  // a. Make PAGE 1 hidden safely
  const page1 = document.getElementById("page-1-container");
  page1.classList.remove("active-page");
  page1.classList.add("hidden-page");

  // b. Make PAGE 2 active safely
  const page2 = document.getElementById("page-2-container");
  page2.classList.remove("hidden-page");
  page2.classList.add("active-page");

  // c. Update the banner title text
  document.getElementById("selected-neighborhood-name").innerText =
    neighborhoodName;

  // d. Create an 80% opaque version of the color by adding "CC" to the hex code
  const transparentColor = neighborhoodColor + "A6";

  // e. Apply the transparent color to the banner
  document.getElementById("page-2-banner").style.backgroundColor =
    transparentColor;

  // f. Filter the data for only this neighborhood
  const filteredData = globalTableData.filter(
    (row) => row.NeighID === neighborhoodId,
  );

  // g. Build the table using the transparent color for the table header
  buildTable(filteredData, transparentColor);

  // h. Build/Update the Page 2 Map
  updatePage2Map(neighborhoodId);

  // i. Tells Leaflet the map box is visible now, please resize! (Fixes gray tile bug)
  setTimeout(() => {
    if (mapPage2) mapPage2.invalidateSize();
  }, 200);

  // j. Force the browser to scroll smoothly back to the very top of the page!
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 3. Function to go back to Page 1
function showPage1() {
  document
    .getElementById("page-2-container")
    .classList.replace("active-page", "hidden-page");
  document
    .getElementById("page-1-container")
    .classList.replace("hidden-page", "active-page");

  // Force the browser to scroll smoothly back to the top!
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 4. Function to Build the HTML Table dynamically
function buildTable(data, headerColor) {
  const tableHead = document.getElementById("table-header-row");
  const tableBody = document.getElementById("table-body");

  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  // Set header styling
  tableHead.style.backgroundColor = headerColor;
  tableHead.style.color = "#ffffff";

  // --- ADJUSTABLE: Column headers mapped exactly to your spreadsheet ---
  const columns = [
    {
      key: "ACS_period",
      name: "American Community Survey (ACS) period",
      title:
        "Estimated based on 5-year ACS survey. See www.census.gov/data/developers/data-sets/acs-5year.html for more info",
    },
    {
      key: "Census_Tract",
      name: "Census tract #",
      title: "Census tract identifier",
    }, // Set to number to remove trailing zeros if they exist
    ,
    {
      key: "med_incomeE",
      name: "Median income",
      title: "Median income",
      isCurrency: true,
    },
    {
      key: "MEDIAN_AssessedConverted",
      name: "Median assessed value of residences",
      title: "Based on Cabarrus County assessment data",
      isCurrency: true,
    },
    {
      key: "total_estimateE",
      name: "Total population",
      title: "Total population",
      isNumber: true,
    },
    {
      key: "white_aloneE",
      name: "White alone",
      title: "White alone",
      isNumber: true,
    },
    {
      key: "black_aloneE",
      name: "Black alone",
      title: "Black alone",
      isNumber: true,
    },
    {
      key: "AIAN_aloneE",
      name: "American Indian & Alaska Native",
      title: "American Indian & Alaska Native",
      isNumber: true,
    },
    {
      key: "asian_aloneE",
      name: "Asian alone",
      title: "Asian alone",
      isNumber: true,
    },
    {
      key: "NHPI_aloneE",
      name: "Native Hawaiian or Pacific Islander",
      title: "Native Hawaiian or Pacific Islander",
      isNumber: true,
    },
    {
      key: "some_other_raceE",
      name: "Some other race",
      title: "Some other race",
      isNumber: true,
    },
    {
      key: "two_or_more_racesE",
      name: "Two or more races",
      title: "Two or more races",
      isNumber: true,
    },
    {
      key: "hisp_latinoE",
      name: "Latino",
      title: "Latino",
      isNumber: true,
    },
  ];

  // Build Headers with HTML 'title' attribute for hover text
  columns.forEach((col) => {
    const th = document.createElement("th");
    th.innerText = col.name;
    th.title = col.title; // Adds the tooltip
    tableHead.appendChild(th);
  });

  // Since Python already sorted by Tract Ascending and Year Descending,
  // the rows will naturally alternate 2021, then 2013 for each tract!
  data.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((col) => {
      const td = document.createElement("td");
      let val = row[col.key];

      // --- NEW: Clean up Census Tract strings to just the number ---
      if (col.key === "Census_Tract" && typeof val === "string") {
        const match = val.match(/[\d.]+/); // Grabs the first group of numbers and decimals
        if (match) {
          val = match[0]; // Overwrites the long string with just "425.01"
        }
      }
      // -------------------------------------------------------------

      if (val === null || val === undefined) {
        td.innerText = "N/A";
      } else {
        if (col.isCurrency) {
          td.innerText = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(val);
        } else if (col.isNumber) {
          td.innerText = new Intl.NumberFormat("en-US").format(val);
        } else {
          td.innerText = val;
        }
      }
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

// 5. Function to create the zoomed-in map for Page 2
function updatePage2Map(neighborhoodId) {
  // If the map hasn't been created yet, initialize it
  if (!mapPage2) {
    mapPage2 = L.map("map-page-2").setView([35.408, -80.581], 13); // Default Concord center
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      },
    ).addTo(mapPage2);
  }

  // Remove the old neighborhood choropleth layer if it exists
  if (page2Layer) {
    mapPage2.removeLayer(page2Layer);
  }

  // WIPE THE OLD HOUSES: Clear out houses from the previous dropdown selection
  page2Houses.clearLayers();

  // Fetch the main map data again
  fetch("combined_neighborhoods_processed.geojson")
    .then((response) => response.json())
    .then((data) => {
      // FILTER: Only keep the tracts for the chosen neighborhood
      const filteredGeoJSON = {
        type: "FeatureCollection",
        features: data.features.filter(
          (f) => f.properties.NeighID === neighborhoodId,
        ),
      };

      // Draw the zoomed-in neighborhood
      page2Layer = L.geoJSON(filteredGeoJSON, {
        style: styleTractInner, // The global bin styling function

        // CUSTOM PAGE 2 FEATURE LOGIC: Draw the houses exactly like the legend
        onEachFeature: function (feature, layer) {
          // --- 1. Pull your exact Python variable ---
          let propChange = feature.properties.property_value_change;

          // --- SAFETY NET FOR MISSING DATA ---
          // If the data is blank, default to "No Data" so the map doesn't crash!
          let displayChange = "No Data";
          if (propChange !== null && propChange !== undefined) {
            displayChange = "$" + propChange.toLocaleString();
          }

          // --- 2. Build the Popup Content FIRST ---
          let props = feature.properties; // Defines 'props' so your code below works
          let cleanTract = props.Census_Tract || "Unknown";

          // Safety net for Income
          let incStr = "No Data";
          if (
            props.income_change !== null &&
            props.income_change !== undefined
          ) {
            incStr = "$" + props.income_change.toLocaleString();
          }

          // Safety net for Property Value (using the propChange variable from above)
          let propStr = "No Data";
          if (propChange !== null && propChange !== undefined) {
            propStr = "$" + propChange.toLocaleString();
          }

          // Build the HTML just like Page 1
          let popupContent = `<div style="min-width: 200px; font-family: sans-serif;">`;
          popupContent += `<b>${props.NeighID} Neighborhood</b>: ${cleanTract}<br><hr style="margin: 5px 0;">`;
          popupContent += `💵 <b>Income</b> Change: +${incStr}<br>`;
          popupContent += `🏘️ <b>Property Value</b> Change: +${propStr}<br>`;

          // Add the bar chart
          if (props.top_3_demographics) {
            popupContent += buildBarChartHTML(props.top_3_demographics);
          }

          popupContent += `</div>`;

          // Bind to the underlying polygon shape
          layer.bindPopup(popupContent);

          // --- 3. Only draw a house IF we actually have a number ---
          if (propChange !== null && propChange !== undefined) {
            // Size the house based on your 3 Natural Breaks
            // New 50% larger sizes: 18px (Small), 27px (Medium), 36px (Large)
            let iconSize = 18;
            if (propChange >= 209310) {
              iconSize = 36; // Was 24
            } else if (propChange >= 98960) {
              iconSize = 27; // Was 18
            } else {
              iconSize = 18; // Was 12
            }

            // Update the SVG Icon (ensure width/height use the new iconSize)
            let iconHtml = `<div style="display: flex; justify-content: center; align-items: center; width: ${iconSize}px; height: ${iconSize}px;">
            <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="#1a1a1a" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(1px 1px 1px rgba(255,255,255,0.8));">
                <path d="M12 3L2 12H5V20H19V12H22L12 3Z"></path>
            </svg>
        </div>`;

            const customIcon = L.divIcon({
              html: iconHtml,
              className: "custom-house-icon",
              iconSize: [iconSize, iconSize],
              iconAnchor: [iconSize / 2, iconSize / 2], // Centering logic stays the same
            });

            // Place the icon in the center of the tract
            if (
              feature.geometry.type === "Polygon" ||
              feature.geometry.type === "MultiPolygon"
            ) {
              const bounds = layer.getBounds();
              const center = bounds.getCenter();

              const marker = L.marker(center, {
                icon: customIcon,
                interactive: true,
              });

              marker.bindPopup(popupContent);

              // ADD TO OUR PAGE 2 LAYER GROUP
              page2Houses.addLayer(marker);
            }
          }
        },
      }).addTo(mapPage2);

      // ADD ALL NEW HOUSES TO THE MAP AT ONCE
      page2Houses.addTo(mapPage2);

      // Zoom the map to perfectly fit this specific neighborhood (Removed your duplicate line here!)
      mapPage2.fitBounds(page2Layer.getBounds(), { padding: [50, 50] });

      // ==========================================
      // ADD THE LEGEND TO PAGE 2
      // ==========================================
      if (!page2Legend) {
        page2Legend = L.control({ position: "bottomright" });
        page2Legend.onAdd = buildLegendContent; // <-- Uses the exact same function!
        page2Legend.addTo(mapPage2);
      }
    })
    .catch((error) => console.log("Error loading map 2 data:", error));
}

// Footer script
document.addEventListener("DOMContentLoaded", function () {
  fetch("footer.html")
    .then((response) => response.text())
    .then((data) => {
      document.getElementById("footer-placeholder").innerHTML = data;
    })
    .catch((err) => console.error("Error loading footer:", err));
});
