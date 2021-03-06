const getGoogleMapsApiKey = async () => {
  const response = await fetch("/.env.json");
  return (await response.json()).googleMapApiKey;
};

const getCoordinates = async () => {
  const response = await fetch("/input/coordinates.json");
  if (response.ok) {
    return await response.json();
  }

  return [];
};

const loadGoogleMapsScript = async (googleMapApiKey, callbackFuncName) => {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapApiKey}&callback=${callbackFuncName}`;
  script.id = "googleMaps";
  document.body.appendChild(script);
};

const setupCoordinatesSelector = coordinates => {
  const select = document.getElementById("select-coordinates");

  select.innerHTML = "";

  coordinates.forEach(area => {
    var option = document.createElement("option");
    option.value = area.name;
    option.innerHTML = area.name;
    select.appendChild(option);
  });

  select.addEventListener("change", event => {
    loadMap(coordinates.find(x => x.name === event.target.value).area);
  });
};

async function googleMapsScriptLoaded(coordinates) {
  coordinates = coordinates || (await getCoordinates());
  if (!coordinates || coordinates.length < 1) {
    return;
  }
  setupCoordinatesSelector(coordinates);
  loadMap(coordinates[0].area);
}

const getBoundsForCoordinates = coordinates => {
  const bounds = new google.maps.LatLngBounds();
  coordinates.forEach(coordinate => bounds.extend(coordinate));
  return bounds;
};

const createMap = bounds => {
  return new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: bounds.getCenter().toJSON(),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false
  });
};

const createPolygon = coordinates => {
  return new google.maps.Polygon({
    paths: coordinates,
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35,
    editable: true
  });
};

const loadMap = async coordinates => {
  logCoordinates(coordinates);
  const bounds = getBoundsForCoordinates(coordinates);
  const map = createMap(bounds);
  const polygon = createPolygon(coordinates);

  const path = polygon.getPath();
  google.maps.event.addListener(path, "insert_at", polygonChanged);
  google.maps.event.addListener(path, "remove_at", polygonChanged);
  google.maps.event.addListener(path, "set_at", polygonChanged);

  polygon.setMap(map);
  map.fitBounds(bounds);
};

function polygonChanged() {
  const coordinates = this.getArray().map(x => x.toJSON());
  logCoordinates(coordinates);
}

const setupViewCoordinates = () => {
  const button = document.getElementById("view-coordinates");
  button.addEventListener("click", toggleViewCoordinatesOverlay);
};

const toggleViewCoordinatesOverlay = () => {
  const log = document.getElementById("log");
  const style = getComputedStyle(log);
  log.style.display = style.display === "none" ? "block" : "none";
};

const logCoordinates = coordinates => {
  var element = document.getElementById("log-coordinates");
  element.textContent = JSON.stringify(coordinates, null, 2);
};

const setupUploadCoordinates = () => {
  const upload = document.getElementById("upload");
  upload.addEventListener("change", handleUploadedFile);

  const uploadAction = document.getElementById("upload-action");
  uploadAction.addEventListener("click", () => {
    upload.click();
  });
};

const handleUploadedFile = event => {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(evt) {
    const data = JSON.parse(evt.target.result);
    googleMapsScriptLoaded(data);
  };
  reader.readAsBinaryString(file);
};

(async () => {
  const googleMapApiKey = await getGoogleMapsApiKey();

  const callbackFuncName = googleMapsScriptLoaded.name;
  await loadGoogleMapsScript(googleMapApiKey, callbackFuncName);

  setupViewCoordinates();
  setupUploadCoordinates();
})();
