var maxExtent = [26, 36, 45, 42];
var centerpos = [31, 43.5];
var newpos = ol.proj.transform(centerpos,'EPSG:4326','EPSG:900913');
var baseLayerOSM = new ol.layer.Tile({  
source: new ol.source.OSM(),
isBaseLayer:true    
});
var map = new ol.Map({
    layers: [baseLayerOSM],
    target: 'map',
    view: new ol.View({
        extent: ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:900913'),
        projection : 'EPSG:900913', // OSM projection
        center : newpos,
        minZoom:6,
        zoom: 0
    })
});

const toolbar = new olturf.Toolbar();
map.addControl(toolbar);