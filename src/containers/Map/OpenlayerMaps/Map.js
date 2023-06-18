import React, { Component } from 'react';
import 'ol/ol.css';
import './Map.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import { Stroke, Style, Icon, Fill } from 'ol/style.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import Feature from 'ol/Feature.js';
import { fromLonLat } from 'ol/proj.js';
import LineString from 'ol/geom/LineString.js';
import { getVectorContext } from 'ol/render.js';
import { getWidth } from 'ol/extent.js';
import arc from 'arc';
import Point from 'ol/geom/Point.js';
import airplaneimg from './614.png';
import Draw from 'ol/interaction/Draw.js';
import { transformExtent } from 'ol/proj.js';
import Modify from 'ol/interaction/Modify.js';
import Overlay from 'ol/Overlay';

class MapComponent extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.airplanesSource = null;
    this.flightsSource = null;
    this.style = null;
    this.tileLayer = null;
    this.airplanesLayer = null;
    this.flightsLayer = null;
    this.pointsPerMs = 0.02;
    this.bboxRef = React.createRef();
    this.updateInterval = null;
    this.bboxSource = new VectorSource();
    this.bboxLayer = new VectorLayer({
      source: this.bboxSource,
      style: new Style({
        stroke: new Stroke({
          color: 'red',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.1)',
        }),
      }),
    });
    this.drawInteraction = new Draw({
      source: this.bboxSource,
      type: 'Polygon',
    });
    this.modifyInteraction = new Modify({
      source: this.bboxSource,
    });

    this.state = {
      coordinateInput: '',
      lamin: null,
      lomin: null,
      lamax: null,
      lomax: null,
    };
  }

  componentDidMount() {
    this.initializeMap();
    this.loadFlightsData();
  }

  componentWillUnmount() {
    clearInterval(this.updateInterval);
  }

  initializeMap() {
    this.tileLayer = new TileLayer({
      source: new OSM(),
    });
    this.map = new Map({
      layers: [this.tileLayer],
      target: this.mapRef.current,
      view: new View({
        center: [-11000000, 4600000],
        zoom: 2,
      }),
    });
    this.style = new Style({
      stroke: new Stroke({
        color: 'green',
        width: 2,
      }),
    });
    this.airplanesSource = new VectorSource();
    this.airplanesLayer = new VectorLayer({
      source: this.airplanesSource,
    });
    this.flightsSource = new VectorSource();
    this.flightsLayer = new VectorLayer({
      source: this.flightsSource,
      style: (feature) => {
        if (feature.get('finished')) {
          return this.style;
        }
        return null;
      },
    });
    this.map.addLayer(this.airplanesLayer);
    this.map.addLayer(this.flightsLayer);
    this.drawInteraction.on('drawstart', () => {
      this.setState({ drawing: true });
    });
    this.drawInteraction.on('drawend', (event) => {
      const bbox = event.feature.getGeometry().getExtent();
      this.updateBboxCoordinates(bbox);
    });
    this.modifyInteraction.on('modifyend', () => {
      const bbox = this.bboxSource.getFeatures()[0].getGeometry().getExtent();
      this.updateBboxCoordinates(bbox);
    });
    this.map.addInteraction(this.drawInteraction);
    this.map.addInteraction(this.modifyInteraction);
    this.map.on('moveend', () => {
      const center = this.map.getView().getCenter();
      const zoom = this.map.getView().getZoom();
      this.setState({ center, zoom });
    });
  }

fetchAircraftData(bbox) {
  const url = `data/openflights/flights.json`;
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not OK');
      }
      return response.json();
    })
    .then((json) => {
      const aircrafts = json.flights;
      const filteredAircrafts = aircrafts.filter((aircraft) => {
        const lon = aircraft.longitude;
        const lat = aircraft.latitude;
        return lon >= bbox.lonMin && lon <= bbox.lonMax && lat >= bbox.latMin && lat <= bbox.latMax;
      });
      this.addAircraftsToMap(filteredAircrafts);
      this.fitMapToAircrafts();

      filteredAircrafts.forEach((aircraft) => {
        const heading = aircraft.heading !== null ? aircraft.heading : 0;
        console.log(`Heading: ${heading}`);
        this.updateAircraftIconRotation(aircraft.icao24, heading);
      });
    })
    .catch((error) => {
      console.error('Error fetching aircraft data:', error);
      console.error('URL:', url);
    });
}

addAircraftsToMap(aircrafts) {
  this.airplanesSource.clear();
  aircrafts.forEach((aircraft) => {
    const lon = aircraft.longitude;
    const lat = aircraft.latitude;
    const heading = aircraft.heading !== null ? aircraft.heading : 0;
    const icao = aircraft.icao24;
    if (lon && lat) {
      const coordinates = fromLonLat([lon, lat]);
      const feature = new Feature({
        geometry: new Point(coordinates),
      });
      const airplaneIcon = new Style({
        image: new Icon({
          src: airplaneimg,
          scale: 0.03,
          rotation: (heading * Math.PI) / 180,
        }),
      });
      feature.setStyle(airplaneIcon);
      feature.setId(icao);
      this.airplanesSource.addFeature(feature);
      const marker = new Overlay({
        position: coordinates,
        positioning: 'center-center',
        element: createMarkerElement(icao, heading),
      });
      this.map.addOverlay(marker);
    }
  });

  function createMarkerElement(icao, heading) {
    const markerElement = document.createElement('div');
    markerElement.className = 'marker';

    const icaoText = document.createElement('div');
    icaoText.className = 'icao-text';
    icaoText.innerHTML = icao;
    markerElement.appendChild(icaoText);

    if (heading !== null) {
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.style.transform = `rotate(${heading}deg)`;
      markerElement.appendChild(arrow);
    }
    return markerElement;
  }
}

toggleIcaoVisibility = () => {
  const icaoTextElements = document.getElementsByClassName('icao-text');
  for (let i = 0; i < icaoTextElements.length; i++) {
    const icaoTextElement = icaoTextElements[i];
    icaoTextElement.style.display = icaoTextElement.style.display === 'none' ? 'block' : 'none';
  }
};

  fitMapToAircrafts() {
    const extent = this.airplanesSource.getExtent();
    this.map.getView().fit(extent, { padding: [50, 50, 50, 50] });
  }

  updateBboxCoordinates(bbox) {
    const [lonMin, latMin, lonMax, latMax] = transformExtent(bbox, 'EPSG:3857', 'EPSG:4326');
    this.bboxRef.current.value = `${lonMin},${latMin},${lonMax},${latMax}`;
  }

  updateAircraftIconRotation(featureId, heading) {
    const feature = this.airplanesSource.getFeatureById(featureId);
    if (feature) {
      const airplaneIcon = feature.getStyle();
      const iconImage = airplaneIcon.getImage();
      iconImage.setRotation((heading * Math.PI) / 180);
    }
  }

  handleShowAircrafts = () => {
    const bboxInput = this.bboxRef.current.value;
    const [lonMin, latMin, lonMax, latMax] = bboxInput.split(',');
    if (lonMin && latMin && lonMax && latMax) {
      const bbox = {
        lonMin: parseFloat(lonMin),
        latMin: parseFloat(latMin),
        lonMax: parseFloat(lonMax),
        latMax: parseFloat(latMax),
      };
      this.setState(
        {
          lamin: bbox.latMin,
          lomin: bbox.lonMin,
          lamax: bbox.latMax,
          lomax: bbox.lonMax,
        },
        () => {
          this.fetchAircraftData(bbox);
        }
      );
    }
  };
  
  loadFlightsData() {
    const url = 'data/openflights/aircraft.json';
    const fetchData = () => {
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((json) => {
          const flightsData = json.flights;
          const totalBatches = Math.ceil(flightsData.length / 10000);
  
          let batchIndex = 0;
          const loadNextBatch = () => {
            const startIndex = batchIndex * 10000;
            const endIndex = (batchIndex + 1) * 10000;
            const flightsBatch = flightsData.slice(startIndex, endIndex);
            this.loadFlightsBatch(flightsBatch);
  
            batchIndex++;
            if (batchIndex < totalBatches) {
              setTimeout(loadNextBatch, 20000);
            }
            this.map.render();
          };
          loadNextBatch();
        })
        .catch((error) => {
          console.error('Error fetching JSON:', error);
          console.error('URL:', url);
        });
    };
    fetchData();
    setInterval(fetchData, 5000);
  }

  loadFlightsBatch(flightsBatch) {
    const { lomin, lomax, lamin, lamax } = this.state;
    for (let i = 0; i < flightsBatch.length; ++i) {
      const flights = flightsBatch[i];
      const from = flights[0];
      const to = flights[flights.length - 1];
      if (from && from.length >= 2 && to && to.length >= 2) {
        const fromLonLat = from.map(coord => parseFloat(coord));
        const toLonLat = to.map(coord => parseFloat(coord));
        if (
          fromLonLat[1] >= lomin &&
          fromLonLat[1] <= lomax &&
          fromLonLat[0] >= lamin &&
          fromLonLat[0] <= lamax &&
          toLonLat[1] >= lomin &&
          toLonLat[1] <= lomax &&
          toLonLat[0] >= lamin &&
          toLonLat[0] <= lamax
        ) {
          const arcGenerator = new arc.GreatCircle(
            { x: fromLonLat[1], y: fromLonLat[0] },
            { x: toLonLat[1], y: toLonLat[0] },
          );
          const arcLine = arcGenerator.Arc(100, { offset: 10 });
          const features = [];
          arcLine.geometries.forEach((geometry) => {
            const line = new LineString(geometry.coords);
            line.transform('EPSG:4326', 'EPSG:3857');
            features.push(
              new Feature({
                geometry: line,
                finished: false,
              })
            );
          });
          this.addLater(features, i * 50);
        }
      }
    }
    this.tileLayer.on('postrender', this.animateFlights);
  }

  animateFlights = (event) => {
    const { lamin, lomin, lamax, lomax } = this.state;

    if (lamin !== null && lomin !== null && lamax !== null && lomax !== null) {
      const vectorContext = getVectorContext(event);
      const frameState = event.frameState;
      vectorContext.setStyle(this.style);

      const features = this.flightsSource.getFeatures();
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (!feature.get('finished')) {
          const coords = feature.getGeometry().getCoordinates();
          const elapsedTime = frameState.time - feature.get('start');
          if (elapsedTime >= 0) {
            const elapsedPoints = elapsedTime * this.pointsPerMs;
            if (elapsedPoints >= coords.length) {
              feature.set('finished', true);
            }
            const maxIndex = Math.min(elapsedPoints, coords.length);
            const currentLine = new LineString(coords.slice(0, maxIndex));
            const worldWidth = getWidth(this.map.getView().getProjection().getExtent());
            const offset = Math.floor(this.map.getView().getCenter()[0] / worldWidth);

            currentLine.translate(offset * worldWidth, 0);
            vectorContext.drawGeometry(currentLine);
            currentLine.translate(worldWidth, 0);
            vectorContext.drawGeometry(currentLine);
          }
        }
      }
      this.map.render();
    }
  };

  addLater(features, timeout) {
    window.setTimeout(() => {
      let start = Date.now();
      features.forEach((feature) => {
        feature.set('start', start);
        this.flightsSource.addFeature(feature);
        const duration =
          (feature.getGeometry().getCoordinates().length - 1) / this.pointsPerMs;
        start += duration;
      });
    }, timeout);
  }
  handleCoordinateInputChange = (event) => {
    this.setState({ coordinateInput: event.target.value });
  };

  handleCoordinateSubmit = () => {
  const { coordinateInput } = this.state;
  const coordinates = coordinateInput.split(',').map((coord) => parseFloat(coord.trim()));
  if (coordinates.length === 0 && !isNaN(coordinates[1]) && !isNaN(coordinates[3]) && !isNaN(coordinates[0]) && !isNaN(coordinates[2])) {
    this.removeBoundingBox();
    const view = this.map.getView();
    const center = fromLonLat(coordinates);
    view.setCenter(center);
    view.setZoom(2);
    this.setState(
      {
        lamin: coordinates[1] - 1,
        lomin: coordinates[0] - 1,
        lamax: coordinates[3] + 1,
        lomax: coordinates[2] + 1,
      },
      () => {
        this.drawBoundingBox();
      }
    );
  }
  };

  removeBoundingBox() {
  const layers = this.map.getLayers().getArray();
  const bboxLayers = layers.filter(layer => layer.get('name') === 'bboxLayer');
  bboxLayers.forEach(bboxLayer => {
    this.map.removeLayer(bboxLayer);
  });
  }

  drawBoundingBox() {
    const { lamin, lomin, lamax, lomax } = this.state;
    const bboxSource = new VectorSource();
    const bboxLayer = new VectorLayer({
      source: bboxSource,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 5,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)',
        }),
      }),
    });
    const bboxCoords = [
      [lomin, lamin],
      [lomin, lamax],
      [lomax, lamax],
      [lomax, lamin],
      [lomin, lamin],
    ];
    const bboxFeature = new Feature({
      geometry: new LineString(bboxCoords).transform('EPSG:4326', 'EPSG:3857'),
    });
    bboxSource.addFeature(bboxFeature);
    bboxLayer.set('name', 'bboxLayer');
    this.map.addLayer(bboxLayer);
  }

  render() {
    return (
      <div>
        <div ref={this.mapRef} className="map-container" />
        <div className="coordinate-input">
          <form>
            <input
              ref={this.bboxRef}
              type="text"
              name="coordinateInput"
              placeholder="Input bbox (lonmin,latmin,lonmax,latmax)"
              onChange={this.handleButtonClick}
            />
            <button type="button" onClick={this.handleButtonClick}>
              Go
            </button>
            <button type="button" onClick={this.toggleIcaoVisibility}>
              Hide/Show ICAO
            </button>
          </form>
        </div>
      </div>
    );
  }
  handleButtonClick = () => {
    this.handleShowAircrafts();
    this.handleCoordinateSubmit();
  };
}

export default MapComponent;