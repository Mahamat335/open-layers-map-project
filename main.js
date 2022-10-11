import GeoJSON from 'ol/format/GeoJSON';
import Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import View from 'ol/View';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import {Draw, Modify, Snap} from 'ol/interaction';
import {GeometryCollection, LineString, Point, Polygon} from 'ol/geom';
import {circular} from 'ol/geom/Polygon';
import {getDistance} from 'ol/sphere';
import {transform} from 'ol/proj';
import {Control, defaults as defaultControls} from 'ol/control';
import {transform} from 'ol/proj';
import {transformExtent} from 'ol/proj';
import { Feature } from 'ol/Feature';
import {Fill, RegularShape, Stroke, Style, Text} from 'ol/style';
import Circle from 'ol/geom/Circle';
import { Feature } from "ol";
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from 'ol/proj';
import { Feature } from 'ol/Feature';
import {Fill, RegularShape, Stroke, Style, Text} from 'ol/style';
import Circle from 'ol/geom/Circle';
import { Feature } from "ol";
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from 'ol/proj';
import Fill from 'ol/style/Fill';

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
  style: function (feature) {
    const geometry = feature.getGeometry();
    return geometry.getType() === 'GeometryCollection' ? geodesicStyle : style;
  },
});

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
    source: new VectorSource({
      format: new GeoJSON(),
      url: './data/Turkey_detay.json',
    }),
  })

  var drawLayer = new VectorLayer({
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
      drawLayer,
    ],
    view: new View({
      extent: transformExtent(maxExtent, 'EPSG:4326', 'EPSG:900913'),
      projection : 'EPSG:900913', // OSM projection
      center : newpos,
      minZoom:3,
      zoom: 3
    }),
  });
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
  denizLayer.setVisible(false);
  gollerLayer.setVisible(false);
  illerLayer.setVisible(false);
  ilcelerLayer.setVisible(false);
const defaultStyle = new Modify({source: source})
  .getOverlay()
  .getStyleFunction();

//deneme
drawLayer.setZIndex(1);

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
          first = transform(polygon[0], projection, 'EPSG:4326');
          last = transform(
            polygon[(polygon.length - 1) / 2],
            projection,
            'EPSG:4326'
          );
          radius = getDistance(first, last) / 2;
        } else {
          first = transform(center, projection, 'EPSG:4326');
          last = transform(modifyPoint, projection, 'EPSG:4326');
          radius = getDistance(first, last);
        }
        const circle = circular(
          transform(center, projection, 'EPSG:4326'),
          radius,
          128
        );
        circle.transform('EPSG:4326', projection);
        geometries[0].setCoordinates(circle.getCoordinates());
        
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

var value;
let draw, snap; 
const PointButton = document.getElementById('Point');
const LineStringButton = document.getElementById('LineString');
const PolygonButton = document.getElementById('Polygon');
const CircleButton = document.getElementById('Circle');
const GeodesicButton = document.getElementById('Geodesic');

function addInteractions() {
  if(!value)
    return 0;
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

PointButton.onclick = function(){
  value = "Point";
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
}
LineStringButton.onclick = function(){
  value = "LineString";
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
}
PolygonButton.onclick = function(){
  value = "Polygon";
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
}
CircleButton.onclick = function(){
  value = "Circle";
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
}
GeodesicButton.onclick = function(){
  value = "Geodesic";
  map.removeInteraction(draw);
  map.removeInteraction(snap);
  addInteractions();
}

addInteractions();
map.addControl(new Control({element: PointButton}));
map.addControl(new Control({element: PolygonButton}));
map.addControl(new Control({element: LineStringButton}));
map.addControl(new Control({element: CircleButton}));
map.addControl(new Control({element: GeodesicButton}));

//var centerLongitudeLatitude = fromLonLat([39, 39]);
//console.log(transform(centerLongitudeLatitude, "EPSG:3857","EPSG:4326"));

var cemberSource =new VectorSource({
  projection: 'EPSG:4326'
  
});
var layer = new VectorLayer({
  source: cemberSource,
  style: [
    new Style({
      stroke: new Stroke({
        color: 'red',
        width: 3
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)'
      })
    })
  ]
});
map.addLayer(layer);
layer.setZIndex(1);
const ucaklar = [];
const yonler = [];
const izlerUcak = [];
const etiketler = [];
const speedVectors = [];
for(let i = 0; i<15; i++){
  ucaklar.push(new Feature(new Circle(fromLonLat([34, 39]), 400)));
  speedVectors.push(new Feature(new LineString([fromLonLat([34, 39]), fromLonLat([36, 39])])));
  etiketler.push(new Feature(new Circle(fromLonLat([34, 39]), 0)));
  speedVectors[i].setStyle(new Style({
    stroke: new Stroke({
      color: 'red',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(0, 255, 0, 0.1)'
    })
  }));
  etiketler[i].setStyle(new Style({
    
    text: new Text({
      text: i.toString(),
      //scale: 0.5,
      fill: new Fill({
        color: '#000000'
      }),
      stroke: new Stroke({
        color: '#FFFF99',
        width: 3.5
      })
    })
  }));
  yonler.push(Math.random());
  yonler.push((Math.random())*-1);
  izlerUcak.push([]);
}
const interval = setInterval(() => {
  
  
  for(let i = 0; i<ucaklar.length; i++){

    etiketler[i].getGeometry().setCenter(ucaklar[i].getGeometry().getCenter());
    let izUcak = new Feature(new Circle(ucaklar[i].getGeometry().getCenter(), 100));
    izlerUcak[i].push(izUcak);
    if(izlerUcak[i].length>4){
      izlerUcak[i].shift();
      
      izlerUcak[i][0].setStyle(new Style({
        stroke: new Stroke({
          color: 'red',
          width: 1
        }),
        fill: new Fill({
          color: 'rgba(0, 255, 0, 0.1)'
        })
      }));
      izlerUcak[i][1].setStyle(new Style({
        stroke: new Stroke({
          color: 'red',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 255, 0, 0.1)'
        })
      }));
     }

    let coord = transform(ucaklar[i].getGeometry().getCenter(), "EPSG:3857","EPSG:4326"); 
    let coordLabel = [];
    coordLabel.push(coord[0]);
    coordLabel.push(coord[0]);

    let speedVectorPoint = [];
    if(coord[0]<26||coord[0]>45)
      yonler[i*2]*=-1;
      
    
    if(coord[1]<36||coord[1]>42)
      yonler[i*2+1]*=-1;
    
      if(i%2){
        coord[0]+=yonler[i*2]/4;
        coord[1]-=yonler[i*2+1]/4;

        speedVectorPoint[0] = coord[0]+yonler[i*2];
        speedVectorPoint[1] = coord[1]-yonler[i*2+1];
      }else{
        coord[0]-=yonler[i*2]/4;
        coord[1]+=yonler[i*2+1]/4;

        speedVectorPoint[0] = coord[0]-yonler[i*2];
        speedVectorPoint[1] = coord[1]+yonler[i*2+1];
      }
    coordLabel[0]= coord[0]+0.015;
    coordLabel[1]= coord[1]+0.015;
    ucaklar[i].getGeometry().setCenter(transform(coord, "EPSG:4326","EPSG:3857"));
    etiketler[i].getGeometry().setCenter(transform(coordLabel, "EPSG:4326","EPSG:3857"));
    speedVectors[i].getGeometry().setCoordinates([ucaklar[i].getGeometry().getCenter(), transform(speedVectorPoint, "EPSG:4326","EPSG:3857")]);
  }
  cemberSource.clear();
  cemberSource.addFeatures(ucaklar);
  cemberSource.addFeatures(etiketler);
  cemberSource.addFeatures(speedVectors);
  for(let i = 0; i<ucaklar.length; i++){
    cemberSource.addFeatures(izlerUcak[i]);
  }
}, 1000);