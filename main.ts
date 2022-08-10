
//
// Define rotate to north control.
//

class RotateNorthControl extends ol.control.Control {
    /**
     * @param {Object} [opt_options] Control options.
     */
    constructor(opt_options) {
      const options = opt_options || {};
  
      const button = document.createElement('button');
      button.innerHTML = 'N';
  
      const element = document.createElement('div');
      element.className = 'rotate-north ol-unselectable ol-control';
      element.appendChild(button);
  
      super({
        element: element,
        target: options.target,
      });
  
      button.addEventListener('click', this.handleRotateNorth.bind(this), false);
    }
  
    handleRotateNorth() {
      this.getMap().getView().setRotation(0);
    }
  }
  
  //
  // Create map, giving it a rotate to north control.
  //
  
  var maxExtent = [25, 35.5, 45, 42.5];
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
  