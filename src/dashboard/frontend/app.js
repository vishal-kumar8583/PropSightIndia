/* ============================================================
   PropSight India — app.js
   Self-contained dashboard logic for index.html
   ============================================================ */

// ── COLOR HELPERS ────────────────────────────────────────────
function gvsColor(gvs) {
  const c = Math.min(100, Math.max(0, gvs || 0));
  if (c < 25) return `hsl(${220 + c * 0.4},85%,${55 + c * 0.2}%)`;
  if (c < 50) return `hsl(${210 - (c - 25) * 3.2},80%,52%)`;
  if (c < 75) return `hsl(${130 - (c - 50) * 2.4},75%,45%)`;
  return `hsl(${40 - (c - 75) * 1.6},85%,50%)`;
}

function gvsHex(gvs) {
  const c = Math.min(100, Math.max(0, gvs || 0));
  let h, s, l;
  if (c < 25)      { h = 220 + c * 0.4;        s = 85; l = 55 + c * 0.2; }
  else if (c < 50) { h = 210 - (c - 25) * 3.2; s = 80; l = 52; }
  else if (c < 75) { h = 130 - (c - 50) * 2.4; s = 75; l = 45; }
  else             { h = 40  - (c - 75) * 1.6;  s = 85; l = 50; }
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const col = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * col).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function gvsLabel(gvs) {
  if (gvs >= 80) return 'Hot';
  if (gvs >= 65) return 'Growing';
  if (gvs >= 50) return 'Stable';
  if (gvs >= 35) return 'Slow';
  return 'Cold';
}

// ── ZONE DATA ────────────────────────────────────────────────
const ZONES = [
  {id:"Bandra-Kurla Complex",state:"Maharashtra",city:"Mumbai",lat:19.0596,lng:72.8656,gvs:91,flags:["Appreciating","Undervalued"],stale:false,infra:["Metro Line 3 (BKC Station)","Eastern Freeway Extension","BKC Smart City Project"],velRTM:2.1,velUC:1.8,yieldDelta:0.8,absorption:0.72},
  {id:"Andheri-West",state:"Maharashtra",city:"Mumbai",lat:19.1197,lng:72.8464,gvs:82,flags:["Appreciating"],stale:false,infra:["Metro Line 1 Andheri","Airport Proximity Zone","SEEPZ SEZ Expansion"],velRTM:1.6,velUC:1.4,yieldDelta:0.5,absorption:0.68},
  {id:"Powai",state:"Maharashtra",city:"Mumbai",lat:19.1176,lng:72.9060,gvs:67,flags:[],stale:false,infra:["IIT Bombay Research Park","LBS Marg Widening","Hiranandani Smart Township"],velRTM:0.9,velUC:0.8,yieldDelta:0.2,absorption:0.61},
  {id:"Thane-West",state:"Maharashtra",city:"Thane",lat:19.2183,lng:72.9781,gvs:74,flags:["Undervalued"],stale:false,infra:["Metro Line 4","Thane-Belapur Road Upgrade","Thane Creek Sanctuary"],velRTM:1.1,velUC:1.0,yieldDelta:0.6,absorption:0.65},
  {id:"Navi Mumbai",state:"Maharashtra",city:"Navi Mumbai",lat:19.0330,lng:73.0297,gvs:78,flags:["Appreciating"],stale:false,infra:["Navi Mumbai Intl Airport","Navi Mumbai Metro","CIDCO Smart City"],velRTM:1.4,velUC:1.3,yieldDelta:0.4,absorption:0.70},
  {id:"Chembur",state:"Maharashtra",city:"Mumbai",lat:19.0522,lng:72.8994,gvs:61,flags:[],stale:false,infra:["Monorail Extension","Eastern Freeway","BPCL Refinery Redevelopment"],velRTM:0.7,velUC:0.6,yieldDelta:0.1,absorption:0.58},
  {id:"Borivali-North",state:"Maharashtra",city:"Mumbai",lat:19.2307,lng:72.8567,gvs:55,flags:["Appreciating"],stale:false,infra:["Metro Line 2A","Sanjay Gandhi NP Buffer","WEH Upgrade"],velRTM:0.6,velUC:0.5,yieldDelta:0.0,absorption:0.55},
  {id:"Kurla",state:"Maharashtra",city:"Mumbai",lat:19.0726,lng:72.8795,gvs:44,flags:["Undervalued"],stale:true,infra:["Metro Line 3 Kurla","LBS Marg Redevelopment","Kurla Commercial Hub"],velRTM:0.4,velUC:0.3,yieldDelta:0.5,absorption:0.50},
  {id:"Hinjewadi",state:"Maharashtra",city:"Pune",lat:18.5912,lng:73.7380,gvs:80,flags:["Appreciating"],stale:false,infra:["Pune Metro Phase 1","Hinjewadi-Shivajinagar Metro","Rajiv Gandhi IT Park Phase 3"],velRTM:1.5,velUC:1.4,yieldDelta:0.4,absorption:0.69},
  {id:"Kharadi",state:"Maharashtra",city:"Pune",lat:18.5512,lng:73.9442,gvs:69,flags:["Undervalued"],stale:false,infra:["Nagar Road Upgrade","EON IT Park Expansion","Metro Phase 2"],velRTM:1.0,velUC:0.9,yieldDelta:0.6,absorption:0.63},
  {id:"Wakad",state:"Maharashtra",city:"Pune",lat:18.6010,lng:73.7610,gvs:62,flags:[],stale:false,infra:["Metro Line 3","Wakad-Hinjewadi Connector","Wakad Smart Township"],velRTM:0.8,velUC:0.7,yieldDelta:0.2,absorption:0.59},
  {id:"Gurugram-Sector-54",state:"Haryana",city:"Gurugram",lat:28.4421,lng:77.0595,gvs:88,flags:["Appreciating"],stale:false,infra:["Rapid Metro Extension","NH-48 Widening","Cyber City Phase 3"],velRTM:1.9,velUC:1.7,yieldDelta:0.7,absorption:0.74},
  {id:"Dwarka-Expressway",state:"Haryana",city:"Gurugram",lat:28.5921,lng:77.0460,gvs:83,flags:["Appreciating"],stale:false,infra:["Dwarka Expressway Operational","Metro Phase 4","Diplomatic Enclave 2"],velRTM:1.7,velUC:1.5,yieldDelta:0.5,absorption:0.71},
  {id:"Noida-Sector-62",state:"Uttar Pradesh",city:"Noida",lat:28.6270,lng:77.3649,gvs:76,flags:["Appreciating","Undervalued"],stale:false,infra:["Aqua Line Metro","Noida-GN Expressway","IT Park Expansion"],velRTM:1.3,velUC:1.2,yieldDelta:0.7,absorption:0.67},
  {id:"Greater-Noida-West",state:"Uttar Pradesh",city:"Greater Noida",lat:28.5706,lng:77.4311,gvs:59,flags:["Undervalued"],stale:false,infra:["Aqua Line Extension","Yamuna Expressway","Sharda University Expansion"],velRTM:0.7,velUC:0.6,yieldDelta:0.6,absorption:0.56},
  {id:"Whitefield",state:"Karnataka",city:"Bengaluru",lat:12.9698,lng:77.7499,gvs:85,flags:["Appreciating"],stale:false,infra:["Purple Line Extension","Outer Ring Road Upgrade","ITPB Phase 4"],velRTM:1.8,velUC:1.6,yieldDelta:0.6,absorption:0.73},
  {id:"Sarjapur-Road",state:"Karnataka",city:"Bengaluru",lat:12.9010,lng:77.6960,gvs:79,flags:["Appreciating","Undervalued"],stale:false,infra:["Sarjapur Road Widening","Metro Phase 3","Eco World SEZ"],velRTM:1.5,velUC:1.3,yieldDelta:0.8,absorption:0.70},
  {id:"Hebbal",state:"Karnataka",city:"Bengaluru",lat:13.0358,lng:77.5970,gvs:71,flags:["Appreciating"],stale:false,infra:["Bellary Road Flyover","Green Line Metro","Manyata Tech Park Expansion"],velRTM:1.1,velUC:1.0,yieldDelta:0.3,absorption:0.64},
  {id:"Electronic-City",state:"Karnataka",city:"Bengaluru",lat:12.8399,lng:77.6770,gvs:64,flags:[],stale:false,infra:["Elevated Expressway","Metro Phase 2","Infosys Campus Expansion"],velRTM:0.8,velUC:0.7,yieldDelta:0.1,absorption:0.60},
  {id:"Gachibowli",state:"Telangana",city:"Hyderabad",lat:17.4401,lng:78.3489,gvs:87,flags:["Appreciating"],stale:false,infra:["ORR Connectivity","Financial District Expansion","Metro Phase 2"],velRTM:1.9,velUC:1.7,yieldDelta:0.6,absorption:0.75},
  {id:"Kondapur",state:"Telangana",city:"Hyderabad",lat:17.4700,lng:78.3600,gvs:73,flags:["Undervalued"],stale:false,infra:["Metro Blue Line","Jubilee Hills Road Upgrade","Mindspace SEZ Phase 2"],velRTM:1.1,velUC:1.0,yieldDelta:0.7,absorption:0.65},
  {id:"Miyapur",state:"Telangana",city:"Hyderabad",lat:17.4960,lng:78.3560,gvs:58,flags:[],stale:false,infra:["Metro Red Line Terminal","PVNR Expressway","Miyapur Township"],velRTM:0.7,velUC:0.6,yieldDelta:0.2,absorption:0.54},
  {id:"OMR-Sholinganallur",state:"Tamil Nadu",city:"Chennai",lat:12.9010,lng:80.2279,gvs:77,flags:["Appreciating"],stale:false,infra:["Metro Phase 2 Extension","OMR Elevated Corridor","TIDEL Park Expansion"],velRTM:1.3,velUC:1.2,yieldDelta:0.4,absorption:0.68},
  {id:"Perungudi",state:"Tamil Nadu",city:"Chennai",lat:12.9600,lng:80.2400,gvs:65,flags:["Undervalued"],stale:false,infra:["Metro Line 2","Perungudi IT Corridor","SIPCOT Expansion"],velRTM:0.9,velUC:0.8,yieldDelta:0.6,absorption:0.61},
  {id:"GIFT-City",state:"Gujarat",city:"Gandhinagar",lat:23.1500,lng:72.6800,gvs:92,flags:["Appreciating","Undervalued"],stale:false,infra:["GIFT Metro Connectivity","IFSC Banking Hub","Smart City Phase 2"],velRTM:2.3,velUC:2.1,yieldDelta:0.9,absorption:0.78},
  {id:"SG-Highway",state:"Gujarat",city:"Ahmedabad",lat:23.0300,lng:72.5100,gvs:75,flags:["Appreciating"],stale:false,infra:["Metro Phase 2","SG Highway Widening","Bopal Township"],velRTM:1.2,velUC:1.1,yieldDelta:0.4,absorption:0.66},
  {id:"Mahindra-SEZ",state:"Rajasthan",city:"Jaipur",lat:26.8500,lng:75.8000,gvs:63,flags:["Undervalued"],stale:false,infra:["Jaipur Metro Phase 2","Delhi-Mumbai Industrial Corridor","Mahindra World City"],velRTM:0.8,velUC:0.7,yieldDelta:0.6,absorption:0.57},
  {id:"New-Town-Rajarhat",state:"West Bengal",city:"Kolkata",lat:22.5800,lng:88.4700,gvs:68,flags:["Appreciating"],stale:false,infra:["Metro Line 6","New Town Smart City","IT Hub Expansion"],velRTM:1.0,velUC:0.9,yieldDelta:0.3,absorption:0.62},
];

// ── STATE AGGREGATION ────────────────────────────────────────
function buildStateData(zones) {
  const m = {};
  zones.forEach(z => {
    if (!m[z.state]) m[z.state] = { name: z.state, zones: [], avgGvs: 0, hot: 0, undervalued: 0, appreciating: 0 };
    m[z.state].zones.push(z);
  });
  Object.values(m).forEach(s => {
    s.avgGvs = Math.round(s.zones.reduce((a, z) => a + z.gvs, 0) / s.zones.length);
    s.hot = s.zones.filter(z => z.gvs >= 70).length;
    s.undervalued = s.zones.filter(z => z.flags.includes('Undervalued')).length;
    s.appreciating = s.zones.filter(z => z.flags.includes('Appreciating')).length;
  });
  return m;
}

const STATE_DATA = buildStateData(ZONES);
const STATE_NAME_MAP = {
  "Maharashtra":"Maharashtra","Haryana":"Haryana","Uttar Pradesh":"Uttar Pradesh",
  "Karnataka":"Karnataka","Telangana":"Telangana","Tamil Nadu":"Tamil Nadu",
  "Gujarat":"Gujarat","Rajasthan":"Rajasthan","West Bengal":"West Bengal"
};

// ── APP STATE ────────────────────────────────────────────────
let map = null;
let geoLayer = null;
let zoneMarkers = [];
let activeState = null;
let activeFlags = new Set();
let chartInstance = null;
let projectionHorizon = 24;

// ── MAP INIT ─────────────────────────────────────────────────
function initMap() {
  map = L.map('map', { center: [22, 80], zoom: 5, zoomControl: false });
  currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// ── GEOJSON CHOROPLETH ───────────────────────────────────────
function getStateName(props) {
  return props.NAME_1 || props.name || props.ST_NM || '';
}

function matchStateName(rawName) {
  if (!rawName) return null;
  const n = rawName.trim();
  if (STATE_DATA[n]) return n;
  const lower = n.toLowerCase();
  for (const key of Object.keys(STATE_DATA)) {
    if (key.toLowerCase() === lower) return key;
  }
  for (const key of Object.keys(STATE_DATA)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return key;
  }
  return null;
}

function styleFeature(feature, selected) {
  const name = getStateName(feature.properties);
  const matched = matchStateName(name);
  const sd = matched ? STATE_DATA[matched] : null;
  const gvs = sd ? sd.avgGvs : 0;
  const isSelected = selected && matched === selected;
  return {
    fillColor: sd ? gvsHex(gvs) : '#cbd5e1',
    fillOpacity: isSelected ? 0.85 : 0.65,
    color: isSelected ? '#1d4ed8' : '#ffffff',
    weight: isSelected ? 2.5 : 0.8
  };
}

function refreshGeoStyles() {
  if (!geoLayer) return;
  geoLayer.eachLayer(layer => {
    if (layer.feature) layer.setStyle(styleFeature(layer.feature, activeState));
  });
}

function loadIndiaMap() {
  const primary = 'https://raw.githubusercontent.com/Subhash9325/GeoJson-Data-of-Indian-States/master/Indian_States';
  const fallback = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';
  fetch(primary)
    .then(r => { if (!r.ok) throw new Error('primary failed'); return r.json(); })
    .catch(() => fetch(fallback).then(r => r.json()))
    .then(data => renderGeoJSON(data))
    .catch(err => console.warn('GeoJSON load failed:', err));
}

function renderGeoJSON(data) {
  if (geoLayer) { map.removeLayer(geoLayer); geoLayer = null; }
  geoLayer = L.geoJSON(data, {
    style: feature => styleFeature(feature, activeState),
    onEachFeature(feature, layer) {
      const name = getStateName(feature.properties);
      const matched = matchStateName(name);
      const sd = matched ? STATE_DATA[matched] : null;
      layer.on('mouseover', function() {
        const hint = document.getElementById('map-hint');
        if (hint) {
          hint.innerHTML = sd
            ? '<strong>' + matched + '</strong><br>GVS ' + sd.avgGvs + ' &middot; ' + gvsLabel(sd.avgGvs) + '<br>' + sd.zones.length + ' zones tracked'
            : '<strong>' + name + '</strong><br>No data available';
        }
        if (matched !== activeState) layer.setStyle({ fillOpacity: 0.95, weight: 2, color: '#ffffff' });
      });
      layer.on('mouseout', function() {
        if (matched !== activeState) layer.setStyle(styleFeature(feature, activeState));
      });
      layer.on('click', function() {
        if (matched) selectState(matched, layer);
      });
    }
  }).addTo(map);
}

// ── ZONE MARKERS ─────────────────────────────────────────────
function clearZoneMarkers() {
  zoneMarkers.forEach(m => map.removeLayer(m));
  zoneMarkers = [];
}

function renderZoneMarkers(stateName) {
  clearZoneMarkers();
  const zones = ZONES.filter(z => z.state === stateName);
  zones.forEach((zone, i) => {
    const color = gvsHex(zone.gvs);
    const svgIcon = L.divIcon({
      className: '',
      html: '<div style="position:relative;width:28px;height:28px;animation:fadeUp .4s ease-out ' + (i * 80) + 'ms both">'
        + '<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">'
        + '<circle cx="14" cy="14" r="12" fill="' + color + '" fill-opacity="0.2" stroke="' + color + '" stroke-width="1.5">'
        + '<animate attributeName="r" values="12;16;12" dur="2.5s" repeatCount="indefinite"/>'
        + '<animate attributeName="fill-opacity" values="0.2;0;0.2" dur="2.5s" repeatCount="indefinite"/>'
        + '</circle>'
        + '<circle cx="14" cy="14" r="7" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>'
        + '<text x="14" y="18" text-anchor="middle" font-size="7" font-weight="800" fill="#fff" font-family="Inter,sans-serif">' + zone.gvs + '</text>'
        + '</svg></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const flagsHtml = zone.flags.map(f =>
      '<span style="background:' + (f === 'Appreciating' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)') + ';color:' + (f === 'Appreciating' ? '#059669' : '#d97706') + ';padding:2px 6px;border-radius:4px;font-weight:700;margin-right:4px">' + f + '</span>'
    ).join('');
    const popupHtml = '<div style="padding:14px 16px;min-width:200px;font-family:Inter,sans-serif">'
      + '<div style="font-size:0.85rem;font-weight:800;color:#0f172a;margin-bottom:4px">&#128205; ' + zone.id + '</div>'
      + '<div style="font-size:0.72rem;color:#64748b;margin-bottom:10px">' + zone.city + ' &middot; ' + zone.state + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
      + '<span style="font-size:1.4rem;font-weight:900;color:' + color + '">' + zone.gvs + '</span>'
      + '<span style="font-size:0.72rem;color:#64748b">' + gvsLabel(zone.gvs) + '</span>'
      + '</div>'
      + '<div style="height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;margin-bottom:8px">'
      + '<div style="height:100%;width:' + zone.gvs + '%;background:' + color + ';border-radius:2px"></div>'
      + '</div>'
      + '<div style="font-size:0.68rem;color:#64748b">' + flagsHtml + (zone.stale ? '<span style="color:#dc2626;font-weight:700">&#9888; Stale</span>' : '') + '</div>'
      + '</div>';
    const marker = L.marker([zone.lat, zone.lng], { icon: svgIcon });
    marker.bindPopup(popupHtml, { maxWidth: 260 });
    marker.addTo(map);
    zoneMarkers.push(marker);
  });
}

// ── STATE LIST ───────────────────────────────────────────────
function renderStateList() {
  const container = document.getElementById('state-list');
  if (!container) return;
  let states = Object.values(STATE_DATA).sort((a, b) => b.avgGvs - a.avgGvs);
  if (activeFlags.size > 0) {
    states = states.filter(s =>
      [...activeFlags].every(flag => s.zones.some(z => z.flags.includes(flag)))
    );
  }
  container.innerHTML = states.map((s, i) => {
    const color = gvsHex(s.avgGvs);
    const isActive = s.name === activeState;
    return '<div class="state-card' + (isActive ? ' active' : '') + '"'
      + ' style="--sc:' + color + ';animation:fadeUp .35s ease-out ' + (i * 60) + 'ms both"'
      + ' onclick="selectStateByName(\'' + s.name.replace(/'/g, "\\'") + '\')">'
      + '<div class="sc-top">'
      + '<div class="sc-left">'
      + '<div class="sc-name">' + s.name + '</div>'
      + '<div class="sc-meta">' + s.zones.length + ' zones &middot; ' + gvsLabel(s.avgGvs) + '</div>'
      + '</div>'
      + '<div class="sc-score" style="color:' + color + '">' + s.avgGvs + '</div>'
      + '</div>'
      + '<div class="sc-bar-bg"><div class="sc-bar-fill" style="width:' + s.avgGvs + '%;background:' + color + '"></div></div>'
      + '</div>';
  }).join('');
}

// ── STATE PANEL ──────────────────────────────────────────────
function renderStatePanel(stateName) {
  const sd = STATE_DATA[stateName];
  if (!sd) return;
  const ph = document.getElementById('rp-ph');
  const content = document.getElementById('rp-content');
  if (ph) ph.style.display = 'none';
  if (!content) return;
  content.style.display = 'block';
  content.style.animation = 'none';
  void content.offsetWidth;
  content.style.animation = 'slideIn .35s cubic-bezier(.4,0,.2,1)';

  let zones = sd.zones.slice().sort((a, b) => b.gvs - a.gvs);
  if (activeFlags.size > 0) {
    zones = zones.filter(z => [...activeFlags].every(flag => z.flags.includes(flag)));
  }

  const avg = arr => arr.reduce((a, v) => a + v, 0) / arr.length;
  const avgVelRTM = avg(sd.zones.map(z => z.velRTM)).toFixed(2);
  const avgVelUC  = avg(sd.zones.map(z => z.velUC)).toFixed(2);
  const avgYield  = avg(sd.zones.map(z => z.yieldDelta)).toFixed(2);
  const avgAbsorb = Math.round(avg(sd.zones.map(z => z.absorption)) * 100);

  const mc = v => parseFloat(v) > 1 ? 'up' : parseFloat(v) > 0 ? 'na' : 'down';
  const infraIcons = ['&#128647;','&#128739;','&#127959;','&#127970;','&#128161;','&#127750;'];

  const zoneRows = zones.map((z, i) => {
    const col = gvsHex(z.gvs);
    return '<div class="zone-row" style="animation-delay:' + (i * 60) + 'ms" onclick="zoomToZone(\'' + z.id.replace(/'/g, "\\'") + '\')">'
      + '<div class="zr-top"><div class="zr-name">' + z.id + '</div><div class="zr-score" style="color:' + col + '">' + z.gvs + '</div></div>'
      + '<div class="zr-bar-bg"><div class="zr-bar-fill" style="width:' + z.gvs + '%;background:' + col + '"></div></div>'
      + '<div class="zr-bottom">'
      + (z.flags.includes('Appreciating') ? '<span class="zr-flag zr-flag-a">&#8593; Appreciating</span>' : '')
      + (z.flags.includes('Undervalued')  ? '<span class="zr-flag zr-flag-u">&#8377; Undervalued</span>'  : '')
      + (z.stale ? '<span class="zr-stale">&#9888; Stale</span>' : '')
      + '<span class="zr-city">' + z.city + '</span>'
      + '</div></div>';
  }).join('');

  const infraItems = sd.zones.flatMap((z, zi) =>
    z.infra.map((item, ii) => {
      const idx = (zi * z.infra.length + ii) % infraIcons.length;
      return '<div class="infra-item" style="animation-delay:' + ((zi * z.infra.length + ii) * 50) + 'ms">'
        + '<div class="ii-icon">' + infraIcons[idx] + '</div>'
        + '<div><div class="ii-text">' + item + '</div><div class="ii-sub">' + z.id + ' &middot; ' + z.city + '</div></div>'
        + '</div>';
    })
  ).join('');

  content.innerHTML =
    '<div class="state-hero">'
    + '<div class="sh-top">'
    + '<div><div class="sh-name">' + sd.name + '</div><div class="sh-sub">' + sd.zones.length + ' micro-markets &middot; ' + gvsLabel(sd.avgGvs) + '</div></div>'
    + '<div class="sh-gvs"><div class="sh-gvs-n">' + sd.avgGvs + '</div><div class="sh-gvs-l">GVS</div></div>'
    + '</div>'
    + '<div class="sh-stats">'
    + '<div class="sh-stat"><div class="sh-stat-v">' + sd.zones.length + '</div><div class="sh-stat-l">Zones</div></div>'
    + '<div class="sh-stat"><div class="sh-stat-v">' + sd.hot + '</div><div class="sh-stat-l">Hot (&ge;70)</div></div>'
    + '<div class="sh-stat"><div class="sh-stat-v">' + sd.undervalued + '</div><div class="sh-stat-l">Undervalued</div></div>'
    + '</div></div>'

    + '<div class="metrics-grid">'
    + '<div class="metric-card"><div class="mc-label">Price Velocity RTM</div><div class="mc-value ' + mc(avgVelRTM) + '">+' + avgVelRTM + '%/mo</div><div class="mc-sub">Avg across zones</div></div>'
    + '<div class="metric-card"><div class="mc-label">Velocity Under Construction</div><div class="mc-value ' + mc(avgVelUC) + '">+' + avgVelUC + '%/mo</div><div class="mc-sub">Avg across zones</div></div>'
    + '<div class="metric-card"><div class="mc-label">Yield Delta</div><div class="mc-value ' + (parseFloat(avgYield) > 0.4 ? 'up' : parseFloat(avgYield) > 0 ? 'na' : 'down') + '">+' + avgYield + '%</div><div class="mc-sub">Rental yield change</div></div>'
    + '<div class="metric-card"><div class="mc-label">Absorption Rate</div><div class="mc-value ' + (avgAbsorb >= 65 ? 'up' : avgAbsorb >= 50 ? 'na' : 'down') + '">' + avgAbsorb + '%</div><div class="mc-sub">Inventory absorbed</div></div>'
    + '</div>'

    + '<div class="zone-section"><div class="sec-title">Zone Rankings</div>' + zoneRows + '</div>'

    + '<div class="chart-section"><div class="sec-title">GVS Distribution</div><div class="chart-wrap"><canvas id="sc"></canvas></div></div>'

    + '<div class="infra-section"><div class="sec-title">Infrastructure Pipeline</div>' + infraItems + '</div>';

  requestAnimationFrame(() => renderZoneChart(sd.zones));
}

// ── CHART ────────────────────────────────────────────────────
function renderZoneChart(zones) {
  const canvas = document.getElementById('sc');
  if (!canvas) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const sorted = zones.slice().sort((a, b) => b.gvs - a.gvs);
  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(z => z.id.replace(/-/g, ' ')),
      datasets: [{
        data: sorted.map(z => z.gvs),
        backgroundColor: sorted.map(z => gvsHex(z.gvs) + 'cc'),
        borderColor: sorted.map(z => gvsHex(z.gvs)),
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' GVS ' + ctx.raw + ' \u00b7 ' + gvsLabel(ctx.raw) } }
      },
      scales: {
        x: { ticks: { font: { size: 9, family: 'Inter' }, color: '#64748b', maxRotation: 35 }, grid: { display: false } },
        y: { min: 0, max: 100, ticks: { font: { size: 9, family: 'Inter' }, color: '#64748b', stepSize: 25 }, grid: { color: '#f1f5f9' } }
      }
    }
  });
}

// ── SELECT STATE ─────────────────────────────────────────────
function selectState(stateName, layer) {
  activeState = stateName;
  refreshGeoStyles();
  renderStateList();
  renderStatePanel(stateName);
  renderZoneMarkers(stateName);
  if (layer && layer.getBounds) {
    map.flyToBounds(layer.getBounds(), { padding: [40, 40], duration: 0.8 });
  }
}

function selectStateByName(name) {
  if (!geoLayer) {
    const zones = ZONES.filter(z => z.state === name);
    if (zones.length) {
      const lat = zones.reduce((a, z) => a + z.lat, 0) / zones.length;
      const lng = zones.reduce((a, z) => a + z.lng, 0) / zones.length;
      map.flyTo([lat, lng], 8, { duration: 0.8 });
    }
    activeState = name;
    renderStateList();
    renderStatePanel(name);
    renderZoneMarkers(name);
    return;
  }
  let found = false;
  geoLayer.eachLayer(layer => {
    if (found || !layer.feature) return;
    const matched = matchStateName(getStateName(layer.feature.properties));
    if (matched === name) { found = true; selectState(name, layer); }
  });
  if (!found) {
    const zones = ZONES.filter(z => z.state === name);
    if (zones.length) {
      const lat = zones.reduce((a, z) => a + z.lat, 0) / zones.length;
      const lng = zones.reduce((a, z) => a + z.lng, 0) / zones.length;
      map.flyTo([lat, lng], 8, { duration: 0.8 });
    }
    activeState = name;
    refreshGeoStyles();
    renderStateList();
    renderStatePanel(name);
    renderZoneMarkers(name);
  }
}

// ── ZOOM TO ZONE ─────────────────────────────────────────────
function zoomToZone(id) {
  const zone = ZONES.find(z => z.id === id);
  if (!zone) return;
  map.flyTo([zone.lat, zone.lng], 14, { duration: 1.0 });
  setTimeout(() => {
    const marker = zoneMarkers.find(m => {
      const ll = m.getLatLng();
      return Math.abs(ll.lat - zone.lat) < 0.001 && Math.abs(ll.lng - zone.lng) < 0.001;
    });
    if (marker) marker.openPopup();
  }, 1300);
}

// ── FLAG TOGGLE ──────────────────────────────────────────────
function toggleFlag(flag) {
  if (activeFlags.has(flag)) activeFlags.delete(flag);
  else activeFlags.add(flag);
  const chipA = document.getElementById('chip-a');
  const chipU = document.getElementById('chip-u');
  if (chipA) chipA.classList.toggle('active', activeFlags.has('Appreciating'));
  if (chipU) chipU.classList.toggle('active', activeFlags.has('Undervalued'));
  renderStateList();
  if (activeState) renderStatePanel(activeState);
}

// ── NAV STATS ────────────────────────────────────────────────
function updateNavStats() {
  const el = id => document.getElementById(id);
  if (el('s-states')) el('s-states').textContent = Object.keys(STATE_DATA).length;
  if (el('s-zones'))  el('s-zones').textContent  = ZONES.length;
  if (el('s-hot'))    el('s-hot').textContent    = ZONES.filter(z => z.gvs >= 70).length;
  if (el('s-avg'))    el('s-avg').textContent    = Math.round(ZONES.reduce((a, z) => a + z.gvs, 0) / ZONES.length);
}

// ── HORIZON SLIDER ───────────────────────────────────────────
function initHorizonSlider() {
  const slider = document.getElementById('hs');
  const display = document.getElementById('hv');
  if (!slider || !display) return;
  slider.addEventListener('input', () => {
    projectionHorizon = parseInt(slider.value, 10);
    display.textContent = projectionHorizon + ' months';
    if (activeState) renderStatePanel(activeState);
  });
}

// ── LOADING OVERLAY ──────────────────────────────────────────
function hideLoading() {
  const overlay = document.getElementById('lo');
  if (!overlay) return;
  overlay.classList.add('hidden');
  setTimeout(() => { overlay.style.display = 'none'; }, 500);
}

// ═══════════════════════════════════════════════════════════
// FEATURE: MODAL SYSTEM
// ═══════════════════════════════════════════════════════════
function openModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) { el.classList.add('open'); onModalOpen(id); }
}
function closeModal(id) {
  const el = document.getElementById('modal-' + id);
  if (el) el.classList.remove('open');
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
function onModalOpen(id) {
  if (id === 'search') { runSearch(); document.getElementById('search-input').focus(); }
  if (id === 'compare') { populateCompareSelect(); renderCompareTable(); }
  if (id === 'watchlist') { populateWLSelect(); renderWatchlist(); renderNotifFeed(); }
  if (id === 'timeline') { renderTimelineZoneBtns(); }
}
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// FEATURE 1: ROI CALCULATOR
// ═══════════════════════════════════════════════════════════
function calcROI() {
  const budget = parseFloat(document.getElementById('roi-budget').value) || 50;
  const horizon = parseInt(document.getElementById('roi-horizon').value);
  const riskPref = document.getElementById('roi-risk').value;

  // Score zones by ROI potential
  const scored = ZONES.map(z => {
    const growthRate = z.velRTM * 12 * horizon; // % over horizon
    const rentalYield = z.absorption * 4 * horizon; // rental income %
    const totalReturn = growthRate + rentalYield;
    const risk = z.gvs >= 75 ? 'low' : z.gvs >= 55 ? 'med' : 'high';
    const riskScore = risk === 'low' ? 3 : risk === 'med' ? 2 : 1;
    const riskMatch = riskPref === 'low' ? riskScore : riskPref === 'high' ? (4 - riskScore) : 2;
    const score = (z.gvs * 0.4) + (totalReturn * 0.4) + (riskMatch * 5);
    const projectedValue = budget * (1 + totalReturn / 100);
    const payback = (budget / (z.absorption * 4 * budget / 100)).toFixed(1);
    return { ...z, totalReturn: totalReturn.toFixed(1), projectedValue: projectedValue.toFixed(1), payback, risk, score };
  });

  const filtered = riskPref === 'low'
    ? scored.filter(z => z.risk === 'low')
    : riskPref === 'high'
    ? scored.filter(z => z.risk !== 'low')
    : scored;

  const top = filtered.sort((a, b) => b.score - a.score).slice(0, 5);
  const avgReturn = (top.reduce((s, z) => s + parseFloat(z.totalReturn), 0) / top.length).toFixed(1);
  const bestZone = top[0];

  document.getElementById('roi-summary').innerHTML =
    '<div class="roi-card"><div class="roi-card-v" style="color:#059669">+' + avgReturn + '%</div><div class="roi-card-l">Avg Return</div></div>' +
    '<div class="roi-card"><div class="roi-card-v">₹' + (budget * (1 + avgReturn/100)).toFixed(0) + 'L</div><div class="roi-card-l">Projected Value</div></div>' +
    '<div class="roi-card"><div class="roi-card-v" style="color:var(--blue)">' + top.length + '</div><div class="roi-card-l">Matching Zones</div></div>';

  document.getElementById('roi-recs').innerHTML = top.map((z, i) =>
    '<div class="roi-rec">' +
    '<div class="roi-rec-rank">' + (i+1) + '</div>' +
    '<div class="roi-rec-info">' +
    '<div class="roi-rec-name">' + z.id + '</div>' +
    '<div class="roi-rec-meta">' + z.city + ' · ' + z.state + ' · GVS ' + z.gvs + '</div>' +
    '</div>' +
    '<div class="roi-rec-right">' +
    '<div class="roi-rec-ret">+' + z.totalReturn + '%</div>' +
    '<div class="roi-rec-risk risk-' + z.risk + '">' + (z.risk === 'low' ? '🟢 Low Risk' : z.risk === 'med' ? '🟡 Medium' : '🔴 High Risk') + '</div>' +
    '</div></div>'
  ).join('');

  document.getElementById('roi-results').classList.add('show');
}

// ═══════════════════════════════════════════════════════════
// FEATURE 2: ZONE COMPARISON
// ═══════════════════════════════════════════════════════════
let compareZones = [];
let compareChartInst = null;

function populateCompareSelect() {
  const sel = document.getElementById('compare-select');
  if (sel.options.length > 1) return;
  ZONES.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.id; opt.textContent = z.id + ' (' + z.city + ')';
    sel.appendChild(opt);
  });
}

function addToCompare() {
  const sel = document.getElementById('compare-select');
  const id = sel.value;
  if (!id || compareZones.includes(id) || compareZones.length >= 4) return;
  compareZones.push(id);
  sel.value = '';
  renderCompareTags();
  renderCompareTable();
}

function removeFromCompare(id) {
  compareZones = compareZones.filter(z => z !== id);
  renderCompareTags();
  renderCompareTable();
}

function renderCompareTags() {
  document.getElementById('compare-tags').innerHTML = compareZones.map(id =>
    '<div class="compare-tag">' + id +
    '<span class="compare-tag-x" onclick="removeFromCompare(\'' + id + '\')">✕</span></div>'
  ).join('') || '<span style="font-size:0.78rem;color:var(--muted)">Add up to 4 zones to compare</span>';
}

function renderCompareTable() {
  const wrap = document.getElementById('compare-table-wrap');
  if (!compareZones.length) { wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.85rem">Select zones above to compare</div>'; return; }
  const zones = compareZones.map(id => ZONES.find(z => z.id === id)).filter(Boolean);
  const rows = [
    ['GVS Score', z => '<div class="ct-score" style="color:' + gvsColor(z.gvs) + '">' + z.gvs + '</div><div class="ct-bar"><div class="ct-bar-fill" style="width:' + z.gvs + '%;background:' + gvsHex(z.gvs) + '"></div></div>'],
    ['City', z => z.city],
    ['State', z => z.state],
    ['Trend', z => gvsLabel(z.gvs)],
    ['Price Velocity RTM', z => '<span style="color:#059669;font-weight:700">+' + z.velRTM + '%/mo</span>'],
    ['Price Velocity UC', z => '<span style="color:#059669;font-weight:700">+' + z.velUC + '%/mo</span>'],
    ['Rental Yield Delta', z => '<span style="color:' + (z.yieldDelta > 0.4 ? '#059669' : '#d97706') + ';font-weight:700">+' + z.yieldDelta + '%</span>'],
    ['Absorption Rate', z => Math.round(z.absorption * 100) + '%'],
    ['Flags', z => z.flags.map(f => '<span class="ct-flag ' + (f === 'Appreciating' ? 'zr-flag-a' : 'zr-flag-u') + '">' + f + '</span>').join('') || '—'],
    ['Data Status', z => z.stale ? '<span style="color:#dc2626;font-weight:700">⚠ Stale</span>' : '<span style="color:#059669;font-weight:700">✓ Fresh</span>'],
  ];
  wrap.innerHTML = '<table class="compare-table"><thead><tr><th>Metric</th>' +
    zones.map(z => '<th>' + z.id + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(([label, fn]) => '<tr><td style="font-weight:600;color:var(--muted);font-size:0.72rem">' + label + '</td>' + zones.map(z => '<td>' + fn(z) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';

  // Radar-style bar chart
  if (compareChartInst) { compareChartInst.destroy(); compareChartInst = null; }
  const ctx = document.getElementById('compare-chart');
  if (ctx && zones.length) {
    const colors = ['#1d4ed8','#10b981','#f59e0b','#ef4444'];
    compareChartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['GVS', 'Vel RTM×10', 'Vel UC×10', 'Yield×20', 'Absorption×100'],
        datasets: zones.map((z, i) => ({
          label: z.id,
          data: [z.gvs, z.velRTM * 10, z.velUC * 10, z.yieldDelta * 20, z.absorption * 100],
          backgroundColor: colors[i] + '99', borderColor: colors[i], borderWidth: 1.5, borderRadius: 4
        }))
      },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { position: 'top', labels: { font: { size: 11, family: 'Inter' }, boxWidth: 12 } } },
        scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, grid: { color: '#f1f5f9' } } }
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════
// FEATURE 3: SMART SEARCH
// ═══════════════════════════════════════════════════════════
let searchFlags = new Set();

function updateSearchRange() {
  document.getElementById('sf-min-v').textContent = document.getElementById('sf-min').value;
  document.getElementById('sf-max-v').textContent = document.getElementById('sf-max').value;
  runSearch();
}

function toggleSearchFlag(flag) {
  if (searchFlags.has(flag)) searchFlags.delete(flag);
  else searchFlags.add(flag);
  document.getElementById('sf-chip-a').classList.toggle('active', searchFlags.has('Appreciating'));
  document.getElementById('sf-chip-u').classList.toggle('active', searchFlags.has('Undervalued'));
  runSearch();
}

function runSearch() {
  const q = (document.getElementById('search-input').value || '').toLowerCase();
  const minGvs = parseInt(document.getElementById('sf-min').value || 0);
  const maxGvs = parseInt(document.getElementById('sf-max').value || 100);
  let results = ZONES.filter(z => {
    const matchQ = !q || z.id.toLowerCase().includes(q) || z.city.toLowerCase().includes(q) || z.state.toLowerCase().includes(q);
    const matchGvs = z.gvs >= minGvs && z.gvs <= maxGvs;
    const matchFlags = searchFlags.size === 0 || [...searchFlags].every(f => z.flags.includes(f));
    return matchQ && matchGvs && matchFlags;
  }).sort((a, b) => b.gvs - a.gvs);

  const el = document.getElementById('search-results');
  if (!results.length) { el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.85rem">No zones match your criteria</div>'; return; }
  el.innerHTML = results.map(z => {
    const col = gvsHex(z.gvs);
    return '<div class="sr-item" onclick="closeModal(\'search\');selectStateByName(\'' + z.state + '\')">' +
      '<div class="sr-score" style="background:' + col + '">' + z.gvs + '</div>' +
      '<div class="sr-info">' +
      '<div class="sr-name">' + z.id + '</div>' +
      '<div class="sr-meta">📍 ' + z.city + ' · ' + z.state + ' · ' + gvsLabel(z.gvs) + '</div>' +
      '<div class="sr-flags">' + z.flags.map(f => '<span class="sr-flag sr-flag-' + (f === 'Appreciating' ? 'a' : 'u') + '">' + f + '</span>').join('') + '</div>' +
      '</div>' +
      '<div class="sr-gvs-bar"><div class="sr-bar-bg"><div class="sr-bar-fill" style="width:' + z.gvs + '%;background:' + col + '"></div></div>' +
      '<div style="font-size:0.62rem;color:var(--muted);text-align:right;margin-top:3px">GVS ' + z.gvs + '</div></div>' +
      '</div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// FEATURE 4: WATCHLIST & ALERTS
// ═══════════════════════════════════════════════════════════
let watchlist = JSON.parse(localStorage.getItem('ps-watchlist') || '[]');
const NOTIFICATIONS = [
  { zone: 'GIFT-City', text: 'GVS jumped from 88 → 92 after IFSC Banking Hub announcement', time: '2h ago', type: 'up' },
  { zone: 'Whitefield', text: 'Purple Line Metro extension approved — GVS impact expected +5pts', time: '5h ago', type: 'up' },
  { zone: 'Gurugram-Sector-54', text: 'New CLU change declared for mixed-use development', time: '1d ago', type: 'up' },
  { zone: 'Kurla', text: 'Data staleness alert — last update was 2 days ago', time: '2d ago', type: 'down' },
  { zone: 'Gachibowli', text: 'Rental absorption rate crossed 75% threshold', time: '3d ago', type: 'up' },
];

function populateWLSelect() {
  const sel = document.getElementById('wl-zone-select');
  if (sel.options.length > 1) return;
  ZONES.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z.id; opt.textContent = z.id + ' (' + z.city + ')';
    sel.appendChild(opt);
  });
}

function addToWatchlist() {
  const sel = document.getElementById('wl-zone-select');
  const id = sel.value;
  if (!id || watchlist.includes(id)) return;
  watchlist.push(id);
  localStorage.setItem('ps-watchlist', JSON.stringify(watchlist));
  sel.value = '';
  renderWatchlist();
  updateWLCount();
}

function removeFromWatchlist(id) {
  watchlist = watchlist.filter(z => z !== id);
  localStorage.setItem('ps-watchlist', JSON.stringify(watchlist));
  renderWatchlist();
  updateWLCount();
}

function updateWLCount() {
  const el = document.getElementById('wl-count');
  if (el) { el.textContent = watchlist.length; el.style.display = watchlist.length ? 'inline' : 'none'; }
}

function renderWatchlist() {
  const el = document.getElementById('wl-list');
  if (!watchlist.length) {
    el.innerHTML = '<div class="wl-empty"><div class="wl-ico">⭐</div><div>No zones in watchlist yet.<br>Add zones to track their GVS.</div></div>';
    return;
  }
  el.innerHTML = watchlist.map(id => {
    const z = ZONES.find(z => z.id === id);
    if (!z) return '';
    const col = gvsHex(z.gvs);
    const notif = NOTIFICATIONS.find(n => n.zone === id);
    return '<div class="wl-item">' +
      '<div class="wl-score" style="background:' + col + '">' + z.gvs + '</div>' +
      '<div class="wl-info">' +
      '<div class="wl-name">' + z.id + '</div>' +
      '<div class="wl-meta">📍 ' + z.city + ' · ' + z.state + ' · ' + gvsLabel(z.gvs) + '</div>' +
      (notif ? '<div class="wl-alert">🔔 ' + notif.text.substring(0, 60) + '…</div>' : '') +
      '</div>' +
      '<button class="wl-remove" onclick="removeFromWatchlist(\'' + id + '\')">Remove</button>' +
      '</div>';
  }).join('');
}

function renderNotifFeed() {
  const el = document.getElementById('notif-list');
  const relevant = NOTIFICATIONS.filter(n => watchlist.length === 0 || watchlist.includes(n.zone));
  const all = watchlist.length === 0 ? NOTIFICATIONS : relevant;
  el.innerHTML = all.map(n =>
    '<div class="notif-item">' +
    '<div class="notif-dot" style="background:' + (n.type === 'up' ? '#10b981' : '#ef4444') + '"></div>' +
    '<div><div class="notif-text"><strong>' + n.zone + '</strong> — ' + n.text + '</div>' +
    '<div class="notif-time">' + n.time + '</div></div></div>'
  ).join('') || '<div style="color:var(--muted);font-size:0.8rem;padding:10px 0">No alerts yet</div>';
}

// ═══════════════════════════════════════════════════════════
// FEATURE 5: MARKET TREND TIMELINE
// ═══════════════════════════════════════════════════════════
let timelineZone = null;
let timelineChartInst = null;

const TIMELINE_EVENTS = {
  'GIFT-City': [
    { month: 'Jan 24', text: 'IFSC Banking Hub Phase 1 announced', delta: '+4', type: 'up' },
    { month: 'Mar 24', text: 'Metro connectivity approved by state govt', delta: '+3', type: 'up' },
    { month: 'Jun 24', text: 'Smart City Phase 2 tender floated', delta: '+2', type: 'up' },
    { month: 'Sep 24', text: 'Global fintech firms sign MoU for offices', delta: '+5', type: 'up' },
    { month: 'Dec 24', text: 'Q4 absorption rate hits 78%', delta: '+2', type: 'up' },
  ],
  'Whitefield': [
    { month: 'Feb 24', text: 'Purple Line Metro extension approved', delta: '+3', type: 'up' },
    { month: 'Apr 24', text: 'ITPB Phase 4 construction begins', delta: '+2', type: 'up' },
    { month: 'Jul 24', text: 'Outer Ring Road widening completed', delta: '+4', type: 'up' },
    { month: 'Oct 24', text: 'New tech campus leases signed', delta: '+2', type: 'up' },
  ],
  'Gachibowli': [
    { month: 'Jan 24', text: 'Financial District Phase 2 master plan released', delta: '+3', type: 'up' },
    { month: 'May 24', text: 'Metro Phase 2 alignment confirmed', delta: '+4', type: 'up' },
    { month: 'Aug 24', text: 'ORR toll plaza removed — connectivity boost', delta: '+2', type: 'up' },
    { month: 'Nov 24', text: 'Absorption rate crosses 75%', delta: '+3', type: 'up' },
  ],
};

function generateHistoricalGVS(zone) {
  const base = zone.gvs - 15;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months.map((m, i) => {
    const trend = (zone.gvs - base) / 11;
    const noise = (Math.random() - 0.5) * 4;
    return Math.min(100, Math.max(0, Math.round(base + trend * i + noise)));
  });
}

function renderTimelineZoneBtns() {
  const el = document.getElementById('timeline-zone-btns');
  const topZones = ZONES.slice().sort((a, b) => b.gvs - a.gvs).slice(0, 8);
  el.innerHTML = topZones.map(z =>
    '<button class="tz-btn' + (timelineZone === z.id ? ' active' : '') + '" onclick="selectTimelineZone(\'' + z.id + '\')">' + z.id + '</button>'
  ).join('');
  if (!timelineZone && topZones.length) selectTimelineZone(topZones[0].id);
}

function selectTimelineZone(id) {
  timelineZone = id;
  document.querySelectorAll('.tz-btn').forEach(b => b.classList.toggle('active', b.textContent === id));
  renderTimelineChart(id);
  renderTimelineEvents(id);
}

function renderTimelineChart(id) {
  const zone = ZONES.find(z => z.id === id);
  if (!zone) return;
  const ctx = document.getElementById('timeline-chart');
  if (!ctx) return;
  if (timelineChartInst) { timelineChartInst.destroy(); timelineChartInst = null; }
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const historical = generateHistoricalGVS(zone);
  const color = gvsHex(zone.gvs);
  timelineChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'GVS Score',
        data: historical,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' GVS: ' + ctx.raw + ' · ' + gvsLabel(ctx.raw) } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' } },
        y: { min: 0, max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b', stepSize: 25 } }
      }
    }
  });
}

function renderTimelineEvents(id) {
  const events = TIMELINE_EVENTS[id] || [
    { month: 'Q1 24', text: 'Infrastructure tender announced for zone', delta: '+2', type: 'up' },
    { month: 'Q2 24', text: 'Listing density increased 18% YoY', delta: '+1', type: 'up' },
    { month: 'Q3 24', text: 'Rental absorption rate improved', delta: '+2', type: 'up' },
    { month: 'Q4 24', text: 'Price velocity accelerated to current level', delta: '+3', type: 'up' },
  ];
  document.getElementById('timeline-events').innerHTML = events.map(e =>
    '<div class="te-item">' +
    '<div class="te-month">' + e.month + '</div>' +
    '<div class="te-text">' + e.text + '</div>' +
    '<div class="te-badge te-' + e.type + '">' + e.delta + ' GVS</div>' +
    '</div>'
  ).join('');
}

// Init watchlist count on load

// PANEL TOGGLE
function toggleLeftPanel() {
  var body = document.querySelector('.app-body');
  var panel = document.querySelector('.left-panel');
  var icon = document.getElementById('panel-toggle-icon');
  var text = document.getElementById('panel-toggle-text');
  var isCollapsed = body.classList.toggle('left-collapsed');
  if (isCollapsed) {
    panel.style.width = '0';
    panel.style.overflow = 'hidden';
    if (icon) icon.textContent = '▶';
    if (text) text.textContent = 'Show Panel';
  } else {
    panel.style.width = '300px';
    panel.style.overflow = '';
    if (icon) icon.textContent = '◀';
    if (text) text.textContent = 'Hide Panel';
  }
  setTimeout(function(){ if(typeof map !== 'undefined' && map) map.invalidateSize(); }, 360);
}

// BOOT
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  updateNavStats();
  renderStateList();
  initHorizonSlider();
  loadIndiaMap();
  updateWLCount();
  runSearch();
  renderLeaderboard();
  renderMapStatsBar();

  setTimeout(hideLoading, 600);
});
// ── MAP ENHANCEMENTS ─────────────────────────────────────────
var currentTileLayer = null;
var MAP_TILES = {
  voyager:   'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark:      'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
};

function switchMapStyle(style) {
  if (!map) return;
  if (currentTileLayer) map.removeLayer(currentTileLayer);
  var url = MAP_TILES[style] || MAP_TILES.voyager;
  currentTileLayer = L.tileLayer(url, { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 });
  currentTileLayer.addTo(map);
  currentTileLayer.bringToBack();
  // Update button states
  ['voyager','satellite','dark'].forEach(function(s) {
    var btn = document.getElementById('ms-' + s);
    if (btn) btn.classList.toggle('active', s === style);
  });
}

function renderLeaderboard() {
  var top5 = ZONES.slice().sort(function(a,b){ return b.gvs - a.gvs; }).slice(0, 5);
  var ranks = ['🥇','🥈','🥉','4','5'];
  var rankClass = ['gold','silver','bronze','',''];
  var el = document.getElementById('lb-items');
  if (!el) return;
  el.innerHTML = top5.map(function(z, i) {
    var color = gvsHex(z.gvs);
    return '<div class="lb-item" onclick="selectStateByName(\'' + z.state + '\')">' +
      '<span class="lb-rank ' + rankClass[i] + '">' + ranks[i] + '</span>' +
      '<span class="lb-dot" style="background:' + color + '"></span>' +
      '<span class="lb-name">' + z.id + '</span>' +
      '<span class="lb-score" style="color:' + color + '">' + z.gvs + '</span>' +
      '</div>';
  }).join('');
}

function renderMapStatsBar() {
  var hot = ZONES.filter(function(z){ return z.gvs >= 70; }).length;
  var avg = Math.round(ZONES.reduce(function(s,z){ return s+z.gvs; }, 0) / ZONES.length);
  var top = ZONES.slice().sort(function(a,b){ return b.gvs-a.gvs; })[0];
  var states = Object.keys(STATE_DATA).length;
  var set = function(id, v) { var e = document.getElementById(id); if(e) e.textContent = v; };
  set('msb-tracked', ZONES.length);
  set('msb-hot', hot);
  set('msb-avg', avg);
  set('msb-top', top ? top.id.split('-')[0] : '—');
  set('msb-states', states);
}
function toggleDrawer() {
  var drawer = document.getElementById('map-drawer');
  if (drawer) {
    drawer.classList.toggle('open');
    setTimeout(function(){ if(map) map.invalidateSize(); }, 320);
  }
}
// ── COMING SOON PANEL FOR UNTRACKED STATES ───────────────────
var STATE_INFO = {
  "Andhra Pradesh":    { capital:"Amaravati",   gdp:"₹9.7L Cr",  pop:"4.9 Cr", highlight:"Amaravati Smart City, Vizag Industrial Corridor", icon:"🌊" },
  "Arunachal Pradesh": { capital:"Itanagar",    gdp:"₹0.3L Cr",  pop:"0.14 Cr",highlight:"Eco-tourism, Hydro Power Projects", icon:"🏔️" },
  "Assam":             { capital:"Dispur",       gdp:"₹3.8L Cr",  pop:"3.1 Cr", highlight:"Guwahati Smart City, Tea & Oil Industry", icon:"🍵" },
  "Bihar":             { capital:"Patna",        gdp:"₹6.3L Cr",  pop:"10.4 Cr",highlight:"Patna Metro, Darbhanga Airport", icon:"🏛️" },
  "Chhattisgarh":      { capital:"Raipur",       gdp:"₹3.4L Cr",  pop:"2.6 Cr", highlight:"Raipur Smart City, Steel & Mining Hub", icon:"⛏️" },
  "Goa":               { capital:"Panaji",       gdp:"₹0.9L Cr",  pop:"0.15 Cr",highlight:"Tourism, IT Parks, Mopa Airport", icon:"🏖️" },
  "Himachal Pradesh":  { capital:"Shimla",       gdp:"₹1.7L Cr",  pop:"0.69 Cr",highlight:"Hydro Power, Apple Economy, Tourism", icon:"🍎" },
  "Jharkhand":         { capital:"Ranchi",       gdp:"₹3.4L Cr",  pop:"3.3 Cr", highlight:"Ranchi Smart City, Mining & Steel", icon:"🏭" },
  "Kerala":            { capital:"Thiruvananthapuram", gdp:"₹8.6L Cr", pop:"3.3 Cr", highlight:"Kochi Metro, IT Corridor, Smart City", icon:"🌴" },
  "Madhya Pradesh":    { capital:"Bhopal",       gdp:"₹9.4L Cr",  pop:"7.3 Cr", highlight:"Indore Smart City, DMIC Corridor", icon:"🌾" },
  "Manipur":           { capital:"Imphal",       gdp:"₹0.3L Cr",  pop:"0.28 Cr",highlight:"Act East Policy, Imphal Airport Expansion", icon:"🌿" },
  "Meghalaya":         { capital:"Shillong",     gdp:"₹0.3L Cr",  pop:"0.3 Cr", highlight:"Tourism, Shillong Smart City", icon:"☁️" },
  "Mizoram":           { capital:"Aizawl",       gdp:"₹0.2L Cr",  pop:"0.11 Cr",highlight:"Bamboo Industry, Border Trade", icon:"🎋" },
  "Nagaland":          { capital:"Kohima",       gdp:"₹0.2L Cr",  pop:"0.2 Cr", highlight:"Hornbill Festival, Organic Farming", icon:"🦅" },
  "Odisha":            { capital:"Bhubaneswar",  gdp:"₹6.2L Cr",  pop:"4.2 Cr", highlight:"Bhubaneswar Smart City, Steel & Mining", icon:"🏗️" },
  "Punjab":            { capital:"Chandigarh",   gdp:"₹5.9L Cr",  pop:"2.8 Cr", highlight:"Ludhiana Industrial Hub, Amritsar Airport", icon:"🌾" },
  "Sikkim":            { capital:"Gangtok",      gdp:"₹0.3L Cr",  pop:"0.06 Cr",highlight:"Organic State, Hydro Power, Tourism", icon:"🏔️" },
  "Tripura":           { capital:"Agartala",     gdp:"₹0.7L Cr",  pop:"0.37 Cr",highlight:"Agartala Smart City, Natural Gas", icon:"🌿" },
  "Uttarakhand":       { capital:"Dehradun",     gdp:"₹2.7L Cr",  pop:"1.0 Cr", highlight:"Dehradun Smart City, Pharma Hub", icon:"🏔️" },
  "Jammu and Kashmir": { capital:"Srinagar",     gdp:"₹1.9L Cr",  pop:"1.2 Cr", highlight:"Tourism Revival, Srinagar Smart City", icon:"❄️" },
  "Ladakh":            { capital:"Leh",          gdp:"₹0.2L Cr",  pop:"0.03 Cr",highlight:"Solar Energy, Tourism, Border Trade", icon:"☀️" },
  "Delhi":             { capital:"New Delhi",    gdp:"₹9.0L Cr",  pop:"1.9 Cr", highlight:"Delhi Metro Expansion, Smart City", icon:"🏙️" },
  "Chandigarh":        { capital:"Chandigarh",   gdp:"₹0.4L Cr",  pop:"0.11 Cr",highlight:"Smart City, IT Hub, Education", icon:"🌳" },
  "Puducherry":        { capital:"Puducherry",   gdp:"₹0.3L Cr",  pop:"0.13 Cr",highlight:"Tourism, IT Parks, French Heritage", icon:"🏛️" },
};

function showComingSoonPanel(stateName, layer) {
  var info = STATE_INFO[stateName] || { capital: stateName, gdp: "N/A", pop: "N/A", highlight: "Data collection in progress", icon: "📍" };

  // Highlight the state on map
  if (layer) layer.setStyle({ fillOpacity: 0.7, weight: 2, color: '#f59e0b' });

  // Show right panel
  var ph = document.getElementById('rp-ph');
  var content = document.getElementById('rp-content');
  if (ph) ph.style.display = 'none';
  if (!content) return;
  content.style.display = 'block';
  content.style.animation = 'none';
  void content.offsetWidth;
  content.style.animation = 'slideIn .35s cubic-bezier(.4,0,.2,1)';

  content.innerHTML =
    '<div style="padding:18px 18px 16px;background:linear-gradient(135deg,#1e3a8a,#1d4ed8,#2563eb);position:relative;overflow:hidden">' +
    '<div style="position:absolute;top:-30px;right:-30px;width:100px;height:100px;background:rgba(255,255,255,.05);border-radius:50%"></div>' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;position:relative;z-index:1">' +
    '<div>' +
    '<div style="font-size:1.1rem;font-weight:900;color:#fff;letter-spacing:-.02em">' + info.icon + ' ' + stateName + '</div>' +
    '<div style="font-size:0.72rem;color:rgba(255,255,255,.6);margin-top:3px">Capital: ' + info.capital + '</div>' +
    '</div>' +
    '<div style="background:rgba(245,158,11,.2);border:1px solid rgba(245,158,11,.4);border-radius:8px;padding:5px 10px;font-size:0.7rem;font-weight:700;color:#fcd34d">🔜 Coming Soon</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;position:relative;z-index:1">' +
    '<div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:8px;text-align:center">' +
    '<div style="font-size:1rem;font-weight:800;color:#fff">' + info.gdp + '</div>' +
    '<div style="font-size:0.58rem;color:rgba(255,255,255,.55);margin-top:1px">State GDP</div>' +
    '</div>' +
    '<div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:8px;text-align:center">' +
    '<div style="font-size:1rem;font-weight:800;color:#fff">' + info.pop + '</div>' +
    '<div style="font-size:0.58rem;color:rgba(255,255,255,.55);margin-top:1px">Population</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="padding:14px 16px;border-bottom:1px solid #dbeafe">' +
    '<div style="font-size:0.65rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">Growth Highlights</div>' +
    '<div style="background:#f8faff;border:1.5px solid #dbeafe;border-radius:10px;padding:10px 12px;font-size:0.78rem;color:#0f172a;line-height:1.5">' +
    '🏗️ ' + info.highlight +
    '</div>' +
    '</div>' +

    '<div style="padding:14px 16px;border-bottom:1px solid #dbeafe">' +
    '<div style="font-size:0.65rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">What\'s Coming</div>' +
    '<div style="display:flex;flex-direction:column;gap:7px">' +
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8faff;border:1px solid #dbeafe;border-radius:8px"><span style="font-size:0.9rem">📊</span><span style="font-size:0.75rem;color:#0f172a;font-weight:600">Growth Velocity Score tracking</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8faff;border:1px solid #dbeafe;border-radius:8px"><span style="font-size:0.9rem">🏗️</span><span style="font-size:0.75rem;color:#0f172a;font-weight:600">Infrastructure project monitoring</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8faff;border:1px solid #dbeafe;border-radius:8px"><span style="font-size:0.9rem">📈</span><span style="font-size:0.75rem;color:#0f172a;font-weight:600">Real estate price trend analysis</span></div>' +
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8faff;border:1px solid #dbeafe;border-radius:8px"><span style="font-size:0.9rem">🗺️</span><span style="font-size:0.75rem;color:#0f172a;font-weight:600">Zone-level micro-market data</span></div>' +
    '</div>' +
    '</div>' +

    '<div style="padding:14px 16px">' +
    '<div style="font-size:0.72rem;color:#64748b;margin-bottom:10px">Want ' + stateName + ' data sooner? Let us know.</div>' +
    '<button onclick="requestStateData(\'' + stateName + '\')" id="req-btn-' + stateName.replace(/\s/g,'-') + '" style="width:100%;padding:11px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:none;border-radius:10px;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:\'Inter\',sans-serif;transition:all .2s" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">🚀 Request ' + stateName + ' Data</button>' +
    '<div id="req-msg-' + stateName.replace(/\s/g,'-') + '" style="display:none;margin-top:8px;text-align:center;font-size:0.75rem;font-weight:600;color:#059669">✅ Request noted! We\'ll prioritize ' + stateName + '.</div>' +
    '</div>';
}

function requestStateData(stateName) {
  var key = stateName.replace(/\s/g, '-');
  var btn = document.getElementById('req-btn-' + key);
  var msg = document.getElementById('req-msg-' + key);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  if (msg) msg.style.display = 'block';
}