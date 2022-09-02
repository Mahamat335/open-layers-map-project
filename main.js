import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {Draw, Modify, Snap} from 'ol/interaction';
import {GeometryCollection, Point, Polygon} from 'ol/geom';
import {circular} from 'ol/geom/Polygon';
import {getDistance} from 'ol/sphere';
import {transform} from 'ol/proj';
import {Control, defaults as defaultControls} from 'ol/control';
import {transform} from 'ol/proj';
import {transformExtent} from 'ol/proj';

const geodesicStyle = new Style({
  geometry: function (feature) {
    return feature.get('modifyGeometry') || feature.getGeometry();
  },
  fill: new Fill({
    color: 'rgba(0, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: '#ff3333',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0)',
    }),
  }),
});

const style = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: '#33cc33',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 7,
    fill: new Fill({
      color: '#aacc33',
    }),
  }),
});

var maxExtent = [24, 34, 47, 44];
var centerpos = [29, 45.5];
var newpos = transform(centerpos,'EPSG:4326','EPSG:900913');

const source = new VectorSource({
  format: new GeoJSON(),
  url: './data/Turkey_detay.json',
  style: function (feature) {
    const geometry = feature.getGeometry();
    return geometry.getType() === 'GeometryCollection' ? geodesicStyle : style;
  },
});

/* const map = new Map({
  target: 'map-container',
  layers: [
    new VectorLayer({
      source: source,
    }),
  ],
  view: new View({
        extent: transformExtent(maxExtent, 'EPSG:4326', 'EPSG:900913'),
        projection : 'EPSG:900913', // OSM projection
        center : newpos,
        minZoom:3,
        zoom: 3
  }),
}); */

/////////////
const deniz = document.getElementById("deniz-button");
const gol = document.getElementById("goller-button");
const il = document.getElementById("iller-button");
const ilce = document.getElementById("ilceler-button");
deniz.onclick = function(){
  denizLayer.setVisible(!denizLayer.getVisible())
}

gol.onclick = function(){
  gollerLayer.setVisible(!gollerLayer.getVisible())
}

ilce.onclick = function(){
  ilcelerLayer.setVisible(!ilcelerLayer.getVisible())
}

il.onclick = function(){
  illerLayer.setVisible(!illerLayer.getVisible())
}
// get ref to div element - OpenLayers will render into this div
/* const mapElement = useRef(); */
  /* var tileLayer = new TileLayer({ source: new OSM() }) */
  var denizLayer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: './data/Deniz_region.json',
    }),
    style: new Style({fill: new Fill({color:"#006994"})}),
  })
  

  var gollerLayer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: './data/Goller_region.json',
    }),
    style: new Style({fill: new Fill({color:"#4BB6EF"})}),
  })

  var ilcelerLayer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: './data/Ilceler_region.json',
    }),
  })

  var illerLayer = new VectorLayer({
    source: new VectorSource({
      format: new GeoJSON(),
      url: './data/Iller_region.json',
    }),
  })

  var turkeyLayer = new VectorLayer({
    source: source,
    
  })

  const map = new Map({
    target: 'map-container',
    layers: [
      // USGS Topo
      turkeyLayer,
      denizLayer,
      illerLayer,
      ilcelerLayer,
      gollerLayer,
    ],
    view: new View({
      extent: transformExtent(maxExtent, 'EPSG:4326', 'EPSG:900913'),
      projection : 'EPSG:900913', // OSM projection
      center : newpos,
      minZoom:3,
      zoom: 3
    }),
  });
  
  //what happens when first rendered  
  /* useEffect(() => {
    map.setTarget(mapElement.current); */
    map.addControl(new Control({
      element:deniz
    }));
    map.addControl(new Control({
      element:gol
    }));
    map.addControl(new Control({
      element:il
    }));
    map.addControl(new Control({
      element:ilce
    }));
    /* 
  }); */
  denizLayer.setVisible(false);
  gollerLayer.setVisible(false);
  illerLayer.setVisible(false);
  ilcelerLayer.setVisible(false);
//////////////
const defaultStyle = new Modify({source: source})
  .getOverlay()
  .getStyleFunction();

const modify = new Modify({
  source: source,
  style: function (feature) {
    feature.get('features').forEach(function (modifyFeature) {
      const modifyGeometry = modifyFeature.get('modifyGeometry');
      if (modifyGeometry) {
        const modifyPoint = feature.getGeometry().getCoordinates();
        const geometries = modifyFeature.getGeometry().getGeometries();
        const polygon = geometries[0].getCoordinates()[0];
        const center = geometries[1].getCoordinates();
        const projection = map.getView().getProjection();
        let first, last, radius;
        if (modifyPoint[0] === center[0] && modifyPoint[1] === center[1]) {
          // center is being modified
          // get unchanged radius from diameter between polygon vertices
          first = transform(polygon[0], projection, 'EPSG:4326');
          last = transform(
            polygon[(polygon.length - 1) / 2],
            projection,
            'EPSG:4326'
          );
          radius = getDistance(first, last) / 2;
        } else {
          // radius is being modified
          first = transform(center, projection, 'EPSG:4326');
          last = transform(modifyPoint, projection, 'EPSG:4326');
          radius = getDistance(first, last);
        }
        // update the polygon using new center or radius
        const circle = circular(
          transform(center, projection, 'EPSG:4326'),
          radius,
          128
        );
        circle.transform('EPSG:4326', projection);
        geometries[0].setCoordinates(circle.getCoordinates());
        // save changes to be applied at the end of the interaction
        modifyGeometry.setGeometries(geometries);
      }
    });
    return defaultStyle(feature);
  },
});

modify.on('modifystart', function (event) {
  event.features.forEach(function (feature) {
    const geometry = feature.getGeometry();
    if (geometry.getType() === 'GeometryCollection') {
      feature.set('modifyGeometry', geometry.clone(), true);
    }
  });
});

modify.on('modifyend', function (event) {
  event.features.forEach(function (feature) {
    const modifyGeometry = feature.get('modifyGeometry');
    if (modifyGeometry) {
      feature.setGeometry(modifyGeometry);
      feature.unset('modifyGeometry', true);
    }
  });
});

map.addInteraction(modify);

let draw, snap; // global so we can remove them later
const typeSelect = document.getElementById('type');

function addInteractions() {
  let value = typeSelect.value;
  let geometryFunction;
  if (value === 'Geodesic') {
    value = 'Circle';
    geometryFunction = function (coordinates, geometry, projection) {
      if (!geometry) {
        geometry = new GeometryCollection([
          new Polygon([]),
          new Point(coordinates[0]),
        ]);
      }
      const geometries = geometry.getGeometries();
      const center = transform(coordinates[0], projection, 'EPSG:4326');
      const last = transform(coordinates[1], projection, 'EPSG:4326');
      const radius = getDistance(center, last);
      const circle = circular(center, radius, 128);
      circle.transform('EPSG:4326', projection);
      geometries[0].setCoordinates(circle.getCoordinates());
      geometry.setGeometries(geometries);
      return geometry;
    };
  }
  draw = new Draw({
    source: source,
    type: value,
    geometryFunction: geometryFunction,
  });
  map.addInteraction(draw);
  snap = new Snap({source: source});
  map.addInteraction(snap);
}

/**
 * Handle change event.
 */
typeSelect.onchange = function () {
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
};

addInteractions();

var typeControl = new Control({
  element: typeSelect
});

map.addControl(typeControl);

