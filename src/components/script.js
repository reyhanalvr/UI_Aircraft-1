    // Inisialisasi peta
    var map = L.map('map').setView([0, 0], 2);
    var mapBounds = L.latLngBounds();

    // Tambahkan tile layer menggunakan OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; OpenStreetMap contributors',
        maxZoom: 18,
    }).addTo(map);

    // Buat layer grup untuk marker pesawat
    var aircraftLayer = L.layerGroup().addTo(map);

    // Buat layer grup untuk polyline gerakan pesawat
    var aircraftMovementLayer = L.layerGroup().addTo(map);

    // Tambahkan fitur Leaflet.Draw untuk menggambar, mengedit, dan menghapus objek
    var drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({
        draw: {
        rectangle:true,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polygon: false},
        edit: {
            featureGroup: drawnItems,
            remove: true,
        },
    });
    map.addControl(drawControl);

    // Fungsi untuk menampilkan koordinat bbox
    function showBoundingBoxCoordinates(bounds) {
    // Dapatkan koordinat bbox yang dibulatkan
    var roundedBounds = bounds.toBBoxString();



    // Tampilkan koordinat bbox pada elemen HTML
    var bboxCoordinatesElement = document.getElementById('bbox-coordinates');
    bboxCoordinatesElement.innerHTML = `${bounds.toBBoxString()}`;

    // Tampilkan popup dengan koordinat bbox
    var layer = L.rectangle(bounds);
    layer.bindPopup(`BBox: ${bounds.toBBoxString()}`).openPopup();
    drawnItems.addLayer(layer);

    // Perbarui posisi pesawat yang berada di dalam bbox
    updateAircraftPositions(bounds);

    mapBounds.extend(bounds);
}

    // Event listener untuk menangani peristiwa draw:created
    function drawCreatedHandler(event) {

        drawnItems.clearLayers();

        var layer = event.layer;
        drawnItems.addLayer(layer);
        var bounds = layer.getBounds();
        showBoundingBoxCoordinates(bounds);
        map.fitBounds(bounds);
    }

    // Event listener untuk peristiwa draw:created
    map.on('draw:created', drawCreatedHandler);

    // Event listener untuk menangani peristiwa draw:deleted
    function drawDeletedHandler(event) {
        var layers = event.layers;
        layers.eachLayer(function (layer) {
            drawnItems.removeLayer(layer);
            aircraftMovementLayer.clearLayers();
        });

        // Kosongkan hasil koordinat bbox pada elemen HTML
        var bboxCoordinatesElement = document.getElementById('bbox-coordinates');
        bboxCoordinatesElement.innerHTML = "";
    }

    // Event listener untuk peristiwa draw:deleted
    map.on('draw:deleted', drawDeletedHandler);
    function copyBoundingBoxCoordinates() {
        var bboxCoordinatesElement = document.getElementById('bbox-coordinates');
        var bboxCoordinates = bboxCoordinatesElement.textContent;
    
    navigator.clipboard.writeText(bboxCoordinates)
        .then(function() {
        alert('Koordinat berhasil disalin!');
        })
        .catch(function(error) {
        console.error('Error:', error);
        });
    }

    
    function updateAircraftPositions(bounds) {
        fetch('/aircraft')  // Menggunakan URL relatif
            .then(response => response.json())
            .then(data => {
                // Hapus marker pesawat yang ada
                aircraftLayer.clearLayers();

                // Tambahkan marker untuk pesawat yang berada di dalam bbox
                data.forEach(aircraft => {
                    var icao24 = aircraft[0];
                    var latitude = aircraft[1];
                    var longitude = aircraft[2];
                    var altitude = aircraft[3];
                    var heading = aircraft[4];

                    // Periksa apakah latitude adalah nilai yang valid
                    if (latitude !== null) {

                        // Periksa apakah pesawat berada di dalam bbox jika bounds didefinisikan
                        if (bounds && latitude >= bounds.getSouthWest().lat &&
                            latitude <= bounds.getNorthEast().lat &&
                            longitude >= bounds.getSouthWest().lng &&
                            longitude <= bounds.getNorthEast().lng) {

                            // Buat marker pesawat
                            var marker = L.marker([latitude, longitude]).addTo(aircraftLayer);

                            // Tambahkan event listener untuk menampilkan popup saat marker diklik
                            marker.on('click', function () {
                                var popupContent = `
                                    <strong>ICAO24:</strong> ${icao24}<br>
                                    <strong>Latitude:</strong> ${latitude}<br>
                                    <strong>Longitude:</strong> ${longitude}<br>
                                    <strong>Altitude:</strong> ${altitude}<br>
                                    <button class="button button-show" onclick="showAircraftMovement('${icao24}', ${latitude}, ${longitude}, ${heading})">Tampilkan Gerakan</button>
                                `;
                                marker.bindPopup(popupContent).openPopup();
                            });
                        }
                    }
                });
            })
            .catch(error => console.error('Error:', error));
    }


