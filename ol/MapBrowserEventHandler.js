/**
 * @module ol/MapBrowserEventHandler
 */
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
import EventType from './events/EventType.js';
import MapBrowserEvent from './MapBrowserEvent.js';
import MapBrowserEventType from './MapBrowserEventType.js';
import PointerEventType from './pointer/EventType.js';
import Target from './events/Target.js';
import { PASSIVE_EVENT_LISTENERS } from './has.js';
import { VOID } from './functions.js';
import { getValues } from './obj.js';
import { listen, unlistenByKey } from './events.js';
var MapBrowserEventHandler = /** @class */ (function (_super) {
    __extends(MapBrowserEventHandler, _super);
    /**
     * @param {import("./PluggableMap.js").default} map The map with the viewport to listen to events on.
     * @param {number} [moveTolerance] The minimal distance the pointer must travel to trigger a move.
     */
    function MapBrowserEventHandler(map, moveTolerance) {
        var _this = _super.call(this, map) || this;
        /**
         * This is the element that we will listen to the real events on.
         * @type {import("./PluggableMap.js").default}
         * @private
         */
        _this.map_ = map;
        /**
         * @type {any}
         * @private
         */
        _this.clickTimeoutId_;
        /**
         * Emulate dblclick and singleclick. Will be true when only one pointer is active.
         * @type {boolean}
         */
        _this.emulateClicks_ = false;
        /**
         * @type {boolean}
         * @private
         */
        _this.dragging_ = false;
        /**
         * @type {!Array<import("./events.js").EventsKey>}
         * @private
         */
        _this.dragListenerKeys_ = [];
        /**
         * @type {number}
         * @private
         */
        _this.moveTolerance_ = moveTolerance === undefined ? 1 : moveTolerance;
        /**
         * The most recent "down" type event (or null if none have occurred).
         * Set on pointerdown.
         * @type {PointerEvent|null}
         * @private
         */
        _this.down_ = null;
        var element = _this.map_.getViewport();
        /**
         * @type {Array<PointerEvent>}
         * @private
         */
        _this.activePointers_ = [];
        /**
         * @type {!Object<number, Event>}
         * @private
         */
        _this.trackedTouches_ = {};
        _this.element_ = element;
        /**
         * @type {?import("./events.js").EventsKey}
         * @private
         */
        _this.pointerdownListenerKey_ = listen(element, PointerEventType.POINTERDOWN, _this.handlePointerDown_, _this);
        /**
         * @type {PointerEvent}
         * @private
         */
        _this.originalPointerMoveEvent_;
        /**
         * @type {?import("./events.js").EventsKey}
         * @private
         */
        _this.relayedListenerKey_ = listen(element, PointerEventType.POINTERMOVE, _this.relayMoveEvent_, _this);
        /**
         * @private
         */
        _this.boundHandleTouchMove_ = _this.handleTouchMove_.bind(_this);
        _this.element_.addEventListener(EventType.TOUCHMOVE, _this.boundHandleTouchMove_, PASSIVE_EVENT_LISTENERS ? { passive: false } : false);
        return _this;
    }
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.emulateClick_ = function (pointerEvent) {
        var newEvent = new MapBrowserEvent(MapBrowserEventType.CLICK, this.map_, pointerEvent);
        this.dispatchEvent(newEvent);
        if (this.clickTimeoutId_ !== undefined) {
            // double-click
            clearTimeout(this.clickTimeoutId_);
            this.clickTimeoutId_ = undefined;
            newEvent = new MapBrowserEvent(MapBrowserEventType.DBLCLICK, this.map_, pointerEvent);
            this.dispatchEvent(newEvent);
        }
        else {
            // click
            this.clickTimeoutId_ = setTimeout(
            /** @this {MapBrowserEventHandler} */
            function () {
                this.clickTimeoutId_ = undefined;
                var newEvent = new MapBrowserEvent(MapBrowserEventType.SINGLECLICK, this.map_, pointerEvent);
                this.dispatchEvent(newEvent);
            }.bind(this), 250);
        }
    };
    /**
     * Keeps track on how many pointers are currently active.
     *
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.updateActivePointers_ = function (pointerEvent) {
        var event = pointerEvent;
        var id = event.pointerId;
        if (event.type == MapBrowserEventType.POINTERUP ||
            event.type == MapBrowserEventType.POINTERCANCEL) {
            delete this.trackedTouches_[id];
            for (var pointerId in this.trackedTouches_) {
                if (this.trackedTouches_[pointerId].target !== event.target) {
                    // Some platforms assign a new pointerId when the target changes.
                    // If this happens, delete one tracked pointer. If there is more
                    // than one tracked pointer for the old target, it will be cleared
                    // by subsequent POINTERUP events from other pointers.
                    delete this.trackedTouches_[pointerId];
                    break;
                }
            }
        }
        else if (event.type == MapBrowserEventType.POINTERDOWN ||
            event.type == MapBrowserEventType.POINTERMOVE) {
            this.trackedTouches_[id] = event;
        }
        this.activePointers_ = getValues(this.trackedTouches_);
    };
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.handlePointerUp_ = function (pointerEvent) {
        this.updateActivePointers_(pointerEvent);
        var newEvent = new MapBrowserEvent(MapBrowserEventType.POINTERUP, this.map_, pointerEvent, undefined, undefined, this.activePointers_);
        this.dispatchEvent(newEvent);
        // We emulate click events on left mouse button click, touch contact, and pen
        // contact. isMouseActionButton returns true in these cases (evt.button is set
        // to 0).
        // See http://www.w3.org/TR/pointerevents/#button-states
        // We only fire click, singleclick, and doubleclick if nobody has called
        // event.preventDefault().
        if (this.emulateClicks_ &&
            !newEvent.defaultPrevented &&
            !this.dragging_ &&
            this.isMouseActionButton_(pointerEvent)) {
            this.emulateClick_(this.down_);
        }
        if (this.activePointers_.length === 0) {
            this.dragListenerKeys_.forEach(unlistenByKey);
            this.dragListenerKeys_.length = 0;
            this.dragging_ = false;
            this.down_ = null;
        }
    };
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @return {boolean} If the left mouse button was pressed.
     * @private
     */
    MapBrowserEventHandler.prototype.isMouseActionButton_ = function (pointerEvent) {
        return pointerEvent.button === 0;
    };
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.handlePointerDown_ = function (pointerEvent) {
        this.emulateClicks_ = this.activePointers_.length === 0;
        this.updateActivePointers_(pointerEvent);
        var newEvent = new MapBrowserEvent(MapBrowserEventType.POINTERDOWN, this.map_, pointerEvent, undefined, undefined, this.activePointers_);
        this.dispatchEvent(newEvent);
        // Store a copy of the down event
        this.down_ = /** @type {PointerEvent} */ ({});
        for (var property in pointerEvent) {
            var value = pointerEvent[property];
            this.down_[property] = typeof value === 'function' ? VOID : value;
        }
        if (this.dragListenerKeys_.length === 0) {
            var doc = this.map_.getOwnerDocument();
            this.dragListenerKeys_.push(listen(doc, MapBrowserEventType.POINTERMOVE, this.handlePointerMove_, this), listen(doc, MapBrowserEventType.POINTERUP, this.handlePointerUp_, this), 
            /* Note that the listener for `pointercancel is set up on
             * `pointerEventHandler_` and not `documentPointerEventHandler_` like
             * the `pointerup` and `pointermove` listeners.
             *
             * The reason for this is the following: `TouchSource.vacuumTouches_()`
             * issues `pointercancel` events, when there was no `touchend` for a
             * `touchstart`. Now, let's say a first `touchstart` is registered on
             * `pointerEventHandler_`. The `documentPointerEventHandler_` is set up.
             * But `documentPointerEventHandler_` doesn't know about the first
             * `touchstart`. If there is no `touchend` for the `touchstart`, we can
             * only receive a `touchcancel` from `pointerEventHandler_`, because it is
             * only registered there.
             */
            listen(this.element_, MapBrowserEventType.POINTERCANCEL, this.handlePointerUp_, this));
            if (this.element_.getRootNode && this.element_.getRootNode() !== doc) {
                this.dragListenerKeys_.push(listen(this.element_.getRootNode(), MapBrowserEventType.POINTERUP, this.handlePointerUp_, this));
            }
        }
    };
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.handlePointerMove_ = function (pointerEvent) {
        // Between pointerdown and pointerup, pointermove events are triggered.
        // To avoid a 'false' touchmove event to be dispatched, we test if the pointer
        // moved a significant distance.
        if (this.isMoving_(pointerEvent)) {
            this.updateActivePointers_(pointerEvent);
            this.dragging_ = true;
            var newEvent = new MapBrowserEvent(MapBrowserEventType.POINTERDRAG, this.map_, pointerEvent, this.dragging_, undefined, this.activePointers_);
            this.dispatchEvent(newEvent);
        }
    };
    /**
     * Wrap and relay a pointermove event.
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @private
     */
    MapBrowserEventHandler.prototype.relayMoveEvent_ = function (pointerEvent) {
        this.originalPointerMoveEvent_ = pointerEvent;
        var dragging = !!(this.down_ && this.isMoving_(pointerEvent));
        this.dispatchEvent(new MapBrowserEvent(MapBrowserEventType.POINTERMOVE, this.map_, pointerEvent, dragging));
    };
    /**
     * Flexible handling of a `touch-action: none` css equivalent: because calling
     * `preventDefault()` on a `pointermove` event does not stop native page scrolling
     * and zooming, we also listen for `touchmove` and call `preventDefault()` on it
     * when an interaction (currently `DragPan` handles the event.
     * @param {TouchEvent} event Event.
     * @private
     */
    MapBrowserEventHandler.prototype.handleTouchMove_ = function (event) {
        // Due to https://github.com/mpizenberg/elm-pep/issues/2, `this.originalPointerMoveEvent_`
        // may not be initialized yet when we get here on a platform without native pointer events.
        var originalEvent = this.originalPointerMoveEvent_;
        if ((!originalEvent || originalEvent.defaultPrevented) &&
            (typeof event.cancelable !== 'boolean' || event.cancelable === true)) {
            event.preventDefault();
        }
    };
    /**
     * @param {PointerEvent} pointerEvent Pointer
     * event.
     * @return {boolean} Is moving.
     * @private
     */
    MapBrowserEventHandler.prototype.isMoving_ = function (pointerEvent) {
        return (this.dragging_ ||
            Math.abs(pointerEvent.clientX - this.down_.clientX) >
                this.moveTolerance_ ||
            Math.abs(pointerEvent.clientY - this.down_.clientY) > this.moveTolerance_);
    };
    /**
     * Clean up.
     */
    MapBrowserEventHandler.prototype.disposeInternal = function () {
        if (this.relayedListenerKey_) {
            unlistenByKey(this.relayedListenerKey_);
            this.relayedListenerKey_ = null;
        }
        this.element_.removeEventListener(EventType.TOUCHMOVE, this.boundHandleTouchMove_);
        if (this.pointerdownListenerKey_) {
            unlistenByKey(this.pointerdownListenerKey_);
            this.pointerdownListenerKey_ = null;
        }
        this.dragListenerKeys_.forEach(unlistenByKey);
        this.dragListenerKeys_.length = 0;
        this.element_ = null;
        _super.prototype.disposeInternal.call(this);
    };
    return MapBrowserEventHandler;
}(Target));
export default MapBrowserEventHandler;
//# sourceMappingURL=MapBrowserEventHandler.js.map