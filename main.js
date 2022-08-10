//
// Define rotate to north control.
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var RotateNorthControl = /** @class */ (function (_super) {
    __extends(RotateNorthControl, _super);
    /**
     * @param {Object} [opt_options] Control options.
     */
    function RotateNorthControl(opt_options) {
        var _this = this;
        var options = opt_options || {};
        var button = document.createElement('button');
        button.innerHTML = 'N';
        var element = document.createElement('div');
        element.className = 'rotate-north ol-unselectable ol-control';
        element.appendChild(button);
        _this = _super.call(this, {
            element: element,
            target: options.target
        }) || this;
        button.addEventListener('click', _this.handleRotateNorth.bind(_this), false);
        return _this;
    }
    RotateNorthControl.prototype.handleRotateNorth = function () {
        this.getMap().getView().setRotation(0);
    };
    return RotateNorthControl;
}(ol.control.Control));
//
// Create map, giving it a rotate to north control.
//
var maxExtent = [25, 35.5, 45, 42.5];
var centerpos = [31, 43.5];
var newpos = ol.proj.transform(centerpos, 'EPSG:4326', 'EPSG:900913');
var baseLayerOSM = new ol.layer.Tile({
    source: new ol.source.OSM(),
    isBaseLayer: true
});
var map = new ol.Map({
    layers: [baseLayerOSM],
    target: 'map',
    view: new ol.View({
        extent: ol.proj.transformExtent(maxExtent, 'EPSG:4326', 'EPSG:900913'),
        projection: 'EPSG:900913',
        center: newpos,
        minZoom: 6,
        zoom: 0
    })
});
