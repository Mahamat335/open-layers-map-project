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
/**
 * @module ol/source/TileImage
 */
import EventType from '../events/EventType.js';
import ImageTile from '../ImageTile.js';
import ReprojTile from '../reproj/Tile.js';
import TileCache from '../TileCache.js';
import TileState from '../TileState.js';
import UrlTile from './UrlTile.js';
import { ENABLE_RASTER_REPROJECTION } from '../reproj/common.js';
import { equivalent, get as getProjection } from '../proj.js';
import { getKey, getKeyZXY } from '../tilecoord.js';
import { getForProjection as getTileGridForProjection } from '../tilegrid.js';
import { getUid } from '../util.js';
/**
 * @typedef {Object} Options
 * @property {import("./Source.js").AttributionLike} [attributions] Attributions.
 * @property {boolean} [attributionsCollapsible=true] Attributions are collapsible.
 * @property {number} [cacheSize] Initial tile cache size. Will auto-grow to hold at least the number of tiles in the viewport.
 * @property {null|string} [crossOrigin] The `crossOrigin` attribute for loaded images.  Note that
 * you must provide a `crossOrigin` value if you want to access pixel data with the Canvas renderer.
 * See https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image for more detail.
 * @property {boolean} [imageSmoothing=true] Deprecated.  Use the `interpolate` option instead.
 * @property {boolean} [interpolate=true] Use interpolated values when resampling.  By default,
 * linear interpolation is used when resampling.  Set to false to use the nearest neighbor instead.
 * @property {boolean} [opaque=false] Whether the layer is opaque.
 * @property {import("../proj.js").ProjectionLike} [projection] Projection. Default is the view projection.
 * @property {number} [reprojectionErrorThreshold=0.5] Maximum allowed reprojection error (in pixels).
 * Higher values can increase reprojection performance, but decrease precision.
 * @property {import("./Source.js").State} [state] Source state.
 * @property {typeof import("../ImageTile.js").default} [tileClass] Class used to instantiate image tiles.
 * Default is {@link module:ol/ImageTile~ImageTile}.
 * @property {import("../tilegrid/TileGrid.js").default} [tileGrid] Tile grid.
 * @property {import("../Tile.js").LoadFunction} [tileLoadFunction] Optional function to load a tile given a URL. The default is
 * ```js
 * function(imageTile, src) {
 *   imageTile.getImage().src = src;
 * };
 * ```
 * @property {number} [tilePixelRatio=1] The pixel ratio used by the tile service. For example, if the tile
 * service advertizes 256px by 256px tiles but actually sends 512px
 * by 512px images (for retina/hidpi devices) then `tilePixelRatio`
 * should be set to `2`.
 * @property {import("../Tile.js").UrlFunction} [tileUrlFunction] Optional function to get tile URL given a tile coordinate and the projection.
 * @property {string} [url] URL template. Must include `{x}`, `{y}` or `{-y}`, and `{z}` placeholders.
 * A `{?-?}` template pattern, for example `subdomain{a-f}.domain.com`, may be
 * used instead of defining each one separately in the `urls` option.
 * @property {Array<string>} [urls] An array of URL templates.
 * @property {boolean} [wrapX] Whether to wrap the world horizontally. The default, is to
 * request out-of-bounds tiles from the server. When set to `false`, only one
 * world will be rendered. When set to `true`, tiles will be requested for one
 * world only, but they will be wrapped horizontally to render multiple worlds.
 * @property {number} [transition] Duration of the opacity transition for rendering.
 * To disable the opacity transition, pass `transition: 0`.
 * @property {string} [key] Optional tile key for proper cache fetching
 * @property {number|import("../array.js").NearestDirectionFunction} [zDirection=0]
 * Choose whether to use tiles with a higher or lower zoom level when between integer
 * zoom levels. See {@link module:ol/tilegrid/TileGrid~TileGrid#getZForResolution}.
 */
/**
 * @classdesc
 * Base class for sources providing images divided into a tile grid.
 *
 * @fires import("./Tile.js").TileSourceEvent
 * @api
 */
var TileImage = /** @class */ (function (_super) {
    __extends(TileImage, _super);
    /**
     * @param {!Options} options Image tile options.
     */
    function TileImage(options) {
        var _this = this;
        var interpolate = options.imageSmoothing !== undefined ? options.imageSmoothing : true;
        if (options.interpolate !== undefined) {
            interpolate = options.interpolate;
        }
        _this = _super.call(this, {
            attributions: options.attributions,
            cacheSize: options.cacheSize,
            opaque: options.opaque,
            projection: options.projection,
            state: options.state,
            tileGrid: options.tileGrid,
            tileLoadFunction: options.tileLoadFunction
                ? options.tileLoadFunction
                : defaultTileLoadFunction,
            tilePixelRatio: options.tilePixelRatio,
            tileUrlFunction: options.tileUrlFunction,
            url: options.url,
            urls: options.urls,
            wrapX: options.wrapX,
            transition: options.transition,
            interpolate: interpolate,
            key: options.key,
            attributionsCollapsible: options.attributionsCollapsible,
            zDirection: options.zDirection,
        }) || this;
        /**
         * @protected
         * @type {?string}
         */
        _this.crossOrigin =
            options.crossOrigin !== undefined ? options.crossOrigin : null;
        /**
         * @protected
         * @type {typeof ImageTile}
         */
        _this.tileClass =
            options.tileClass !== undefined ? options.tileClass : ImageTile;
        /**
         * @protected
         * @type {!Object<string, TileCache>}
         */
        _this.tileCacheForProjection = {};
        /**
         * @protected
         * @type {!Object<string, import("../tilegrid/TileGrid.js").default>}
         */
        _this.tileGridForProjection = {};
        /**
         * @private
         * @type {number|undefined}
         */
        _this.reprojectionErrorThreshold_ = options.reprojectionErrorThreshold;
        /**
         * @private
         * @type {boolean}
         */
        _this.renderReprojectionEdges_ = false;
        return _this;
    }
    /**
     * @return {boolean} Can expire cache.
     */
    TileImage.prototype.canExpireCache = function () {
        if (!ENABLE_RASTER_REPROJECTION) {
            return _super.prototype.canExpireCache.call(this);
        }
        if (this.tileCache.canExpireCache()) {
            return true;
        }
        else {
            for (var key in this.tileCacheForProjection) {
                if (this.tileCacheForProjection[key].canExpireCache()) {
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @param {!Object<string, boolean>} usedTiles Used tiles.
     */
    TileImage.prototype.expireCache = function (projection, usedTiles) {
        if (!ENABLE_RASTER_REPROJECTION) {
            _super.prototype.expireCache.call(this, projection, usedTiles);
            return;
        }
        var usedTileCache = this.getTileCacheForProjection(projection);
        this.tileCache.expireCache(this.tileCache == usedTileCache ? usedTiles : {});
        for (var id in this.tileCacheForProjection) {
            var tileCache = this.tileCacheForProjection[id];
            tileCache.expireCache(tileCache == usedTileCache ? usedTiles : {});
        }
    };
    /**
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @return {number} Gutter.
     */
    TileImage.prototype.getGutterForProjection = function (projection) {
        if (ENABLE_RASTER_REPROJECTION &&
            this.getProjection() &&
            projection &&
            !equivalent(this.getProjection(), projection)) {
            return 0;
        }
        else {
            return this.getGutter();
        }
    };
    /**
     * @return {number} Gutter.
     */
    TileImage.prototype.getGutter = function () {
        return 0;
    };
    /**
     * Return the key to be used for all tiles in the source.
     * @return {string} The key for all tiles.
     */
    TileImage.prototype.getKey = function () {
        var key = _super.prototype.getKey.call(this);
        if (!this.getInterpolate()) {
            key += ':disable-interpolation';
        }
        return key;
    };
    /**
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @return {boolean} Opaque.
     */
    TileImage.prototype.getOpaque = function (projection) {
        if (ENABLE_RASTER_REPROJECTION &&
            this.getProjection() &&
            projection &&
            !equivalent(this.getProjection(), projection)) {
            return false;
        }
        else {
            return _super.prototype.getOpaque.call(this, projection);
        }
    };
    /**
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @return {!import("../tilegrid/TileGrid.js").default} Tile grid.
     */
    TileImage.prototype.getTileGridForProjection = function (projection) {
        if (!ENABLE_RASTER_REPROJECTION) {
            return _super.prototype.getTileGridForProjection.call(this, projection);
        }
        var thisProj = this.getProjection();
        if (this.tileGrid && (!thisProj || equivalent(thisProj, projection))) {
            return this.tileGrid;
        }
        else {
            var projKey = getUid(projection);
            if (!(projKey in this.tileGridForProjection)) {
                this.tileGridForProjection[projKey] =
                    getTileGridForProjection(projection);
            }
            return this.tileGridForProjection[projKey];
        }
    };
    /**
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @return {import("../TileCache.js").default} Tile cache.
     */
    TileImage.prototype.getTileCacheForProjection = function (projection) {
        if (!ENABLE_RASTER_REPROJECTION) {
            return _super.prototype.getTileCacheForProjection.call(this, projection);
        }
        var thisProj = this.getProjection();
        if (!thisProj || equivalent(thisProj, projection)) {
            return this.tileCache;
        }
        else {
            var projKey = getUid(projection);
            if (!(projKey in this.tileCacheForProjection)) {
                this.tileCacheForProjection[projKey] = new TileCache(this.tileCache.highWaterMark);
            }
            return this.tileCacheForProjection[projKey];
        }
    };
    /**
     * @param {number} z Tile coordinate z.
     * @param {number} x Tile coordinate x.
     * @param {number} y Tile coordinate y.
     * @param {number} pixelRatio Pixel ratio.
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @param {string} key The key set on the tile.
     * @return {!ImageTile} Tile.
     * @private
     */
    TileImage.prototype.createTile_ = function (z, x, y, pixelRatio, projection, key) {
        var tileCoord = [z, x, y];
        var urlTileCoord = this.getTileCoordForTileUrlFunction(tileCoord, projection);
        var tileUrl = urlTileCoord
            ? this.tileUrlFunction(urlTileCoord, pixelRatio, projection)
            : undefined;
        var tile = new this.tileClass(tileCoord, tileUrl !== undefined ? TileState.IDLE : TileState.EMPTY, tileUrl !== undefined ? tileUrl : '', this.crossOrigin, this.tileLoadFunction, this.tileOptions);
        tile.key = key;
        tile.addEventListener(EventType.CHANGE, this.handleTileChange.bind(this));
        return tile;
    };
    /**
     * @param {number} z Tile coordinate z.
     * @param {number} x Tile coordinate x.
     * @param {number} y Tile coordinate y.
     * @param {number} pixelRatio Pixel ratio.
     * @param {import("../proj/Projection.js").default} projection Projection.
     * @return {!(ImageTile|ReprojTile)} Tile.
     */
    TileImage.prototype.getTile = function (z, x, y, pixelRatio, projection) {
        var sourceProjection = this.getProjection();
        if (!ENABLE_RASTER_REPROJECTION ||
            !sourceProjection ||
            !projection ||
            equivalent(sourceProjection, projection)) {
            return this.getTileInternal(z, x, y, pixelRatio, sourceProjection || projection);
        }
        else {
            var cache = this.getTileCacheForProjection(projection);
            var tileCoord = [z, x, y];
            var tile = void 0;
            var tileCoordKey = getKey(tileCoord);
            if (cache.containsKey(tileCoordKey)) {
                tile = cache.get(tileCoordKey);
            }
            var key = this.getKey();
            if (tile && tile.key == key) {
                return tile;
            }
            else {
                var sourceTileGrid = this.getTileGridForProjection(sourceProjection);
                var targetTileGrid = this.getTileGridForProjection(projection);
                var wrappedTileCoord = this.getTileCoordForTileUrlFunction(tileCoord, projection);
                var newTile = new ReprojTile(sourceProjection, sourceTileGrid, projection, targetTileGrid, tileCoord, wrappedTileCoord, this.getTilePixelRatio(pixelRatio), this.getGutter(), function (z, x, y, pixelRatio) {
                    return this.getTileInternal(z, x, y, pixelRatio, sourceProjection);
                }.bind(this), this.reprojectionErrorThreshold_, this.renderReprojectionEdges_, this.getInterpolate());
                newTile.key = key;
                if (tile) {
                    newTile.interimTile = tile;
                    newTile.refreshInterimChain();
                    cache.replace(tileCoordKey, newTile);
                }
                else {
                    cache.set(tileCoordKey, newTile);
                }
                return newTile;
            }
        }
    };
    /**
     * @param {number} z Tile coordinate z.
     * @param {number} x Tile coordinate x.
     * @param {number} y Tile coordinate y.
     * @param {number} pixelRatio Pixel ratio.
     * @param {!import("../proj/Projection.js").default} projection Projection.
     * @return {!(ImageTile|ReprojTile)} Tile.
     * @protected
     */
    TileImage.prototype.getTileInternal = function (z, x, y, pixelRatio, projection) {
        var tile = null;
        var tileCoordKey = getKeyZXY(z, x, y);
        var key = this.getKey();
        if (!this.tileCache.containsKey(tileCoordKey)) {
            tile = this.createTile_(z, x, y, pixelRatio, projection, key);
            this.tileCache.set(tileCoordKey, tile);
        }
        else {
            tile = this.tileCache.get(tileCoordKey);
            if (tile.key != key) {
                // The source's params changed. If the tile has an interim tile and if we
                // can use it then we use it. Otherwise we create a new tile.  In both
                // cases we attempt to assign an interim tile to the new tile.
                var interimTile = tile;
                tile = this.createTile_(z, x, y, pixelRatio, projection, key);
                //make the new tile the head of the list,
                if (interimTile.getState() == TileState.IDLE) {
                    //the old tile hasn't begun loading yet, and is now outdated, so we can simply discard it
                    tile.interimTile = interimTile.interimTile;
                }
                else {
                    tile.interimTile = interimTile;
                }
                tile.refreshInterimChain();
                this.tileCache.replace(tileCoordKey, tile);
            }
        }
        return tile;
    };
    /**
     * Sets whether to render reprojection edges or not (usually for debugging).
     * @param {boolean} render Render the edges.
     * @api
     */
    TileImage.prototype.setRenderReprojectionEdges = function (render) {
        if (!ENABLE_RASTER_REPROJECTION ||
            this.renderReprojectionEdges_ == render) {
            return;
        }
        this.renderReprojectionEdges_ = render;
        for (var id in this.tileCacheForProjection) {
            this.tileCacheForProjection[id].clear();
        }
        this.changed();
    };
    /**
     * Sets the tile grid to use when reprojecting the tiles to the given
     * projection instead of the default tile grid for the projection.
     *
     * This can be useful when the default tile grid cannot be created
     * (e.g. projection has no extent defined) or
     * for optimization reasons (custom tile size, resolutions, ...).
     *
     * @param {import("../proj.js").ProjectionLike} projection Projection.
     * @param {import("../tilegrid/TileGrid.js").default} tilegrid Tile grid to use for the projection.
     * @api
     */
    TileImage.prototype.setTileGridForProjection = function (projection, tilegrid) {
        if (ENABLE_RASTER_REPROJECTION) {
            var proj = getProjection(projection);
            if (proj) {
                var projKey = getUid(proj);
                if (!(projKey in this.tileGridForProjection)) {
                    this.tileGridForProjection[projKey] = tilegrid;
                }
            }
        }
    };
    return TileImage;
}(UrlTile));
/**
 * @param {ImageTile} imageTile Image tile.
 * @param {string} src Source.
 */
function defaultTileLoadFunction(imageTile, src) {
    /** @type {HTMLImageElement|HTMLVideoElement} */ (imageTile.getImage()).src =
        src;
}
export default TileImage;
//# sourceMappingURL=TileImage.js.map