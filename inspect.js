const Main = imports.ui.main;
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Cogl = imports.gi.Cogl;
const St = imports.gi.St;
const Lang = imports.lang;
const Signals = imports.signals;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Interfaces = imports.interfaces;
const CollapseButton = imports.collapseButton;


function addBorderPaintHook(actor) {
    let signalId = actor.connect_after('paint',
        function () {
            let color = new Cogl.Color();
            color.init_from_4ub(0xff, 0, 0, 0xc4);
            Cogl.set_source_color(color);

            let geom = actor.get_allocation_geometry();
            let width = 2;

            // clockwise order
            Cogl.rectangle(0, 0, geom.width, width);
            Cogl.rectangle(geom.width - width, width,
                           geom.width, geom.height);
            Cogl.rectangle(0, geom.height,
                           geom.width - width, geom.height - width);
            Cogl.rectangle(0, geom.height - width,
                           width, width);
        });

    actor.queue_redraw();
    return signalId;
}


function Inspector() {
    this._init();
}

Inspector.prototype = {
    _init: function() {
        let container = new Cinnamon.GenericContainer({ width: 0,
                                                     height: 0 });
        container.connect('allocate', Lang.bind(this, this._allocate));
        Main.uiGroup.add_actor(container);

        let eventHandler = new St.BoxLayout({ name: 'LookingGlassDialog',
                                              vertical: true,
                                              reactive: true });
        this._eventHandler = eventHandler;
        Main.pushModal(this._eventHandler);
        container.add_actor(eventHandler);
        this._displayText = new St.Label();
        eventHandler.add(this._displayText, { expand: true });
        this._passThroughText = new St.Label({style: 'text-align: center;'});
        eventHandler.add(this._passThroughText, { expand: true });

        this._borderPaintTarget = null;
        this._borderPaintId = null;
        eventHandler.connect('destroy', Lang.bind(this, this._onDestroy));
        this._capturedEventId = global.stage.connect('captured-event', Lang.bind(this, this._onCapturedEvent));

        // this._target is the actor currently shown by the inspector.
        // this._pointerTarget is the actor directly under the pointer.
        // Normally these are the same, but if you use the scroll wheel
        // to drill down, they'll diverge until you either scroll back
        // out, or move the pointer outside of _pointerTarget.
        this._target = null;
        this._pointerTarget = null;
        this.passThroughEvents = false;
        this._updatePassthroughText();
    },
    
    _updatePassthroughText: function() {
        if(this.passThroughEvents)
            this._passThroughText.text = '(Press Pause or Control to disable event pass through)';
        else
            this._passThroughText.text = '(Press Pause or Control to enable event pass through)';
    },

    _onCapturedEvent: function (actor, event) {
        if(event.type() == Clutter.EventType.KEY_PRESS && (event.get_key_symbol() == Clutter.Control_L ||
                                                           event.get_key_symbol() == Clutter.Control_R ||
                                                           event.get_key_symbol() == Clutter.Pause)) {
            this.passThroughEvents = !this.passThroughEvents;
            this._updatePassthroughText();
            return true;
        }

        if(this.passThroughEvents)
            return false;

        switch (event.type()) {
            case Clutter.EventType.KEY_PRESS:
                return this._onKeyPressEvent(actor, event);
            case Clutter.EventType.BUTTON_PRESS:
                return this._onButtonPressEvent(actor, event);
            case Clutter.EventType.SCROLL:
                return this._onScrollEvent(actor, event);
            case Clutter.EventType.MOTION:
                return this._onMotionEvent(actor, event);
            default:
                return true;
        }
    },

    _allocate: function(actor, box, flags) {
        if (!this._eventHandler)
            return;

        let primary = Main.layoutManager.primaryMonitor;

        let [minWidth, minHeight, natWidth, natHeight] =
            this._eventHandler.get_preferred_size();

        let childBox = new Clutter.ActorBox();
        childBox.x1 = primary.x + Math.floor((primary.width - natWidth) / 2);
        childBox.x2 = childBox.x1 + natWidth;
        childBox.y1 = primary.y + Math.floor((primary.height - natHeight) / 2);
        childBox.y2 = childBox.y1 + natHeight;
        this._eventHandler.allocate(childBox, flags);
    },

    _close: function() {
        global.stage.disconnect(this._capturedEventId);
        Main.popModal(this._eventHandler);

        this._eventHandler.destroy();
        this._eventHandler = null;
        this.emit('closed');
    },

    _onDestroy: function() {
        if (this._borderPaintTarget != null)
            this._borderPaintTarget.disconnect(this._borderPaintId);
    },

    _onKeyPressEvent: function (actor, event) {
        if (event.get_key_symbol() == Clutter.Escape)
            this._close();
        return true;
    },

    _onButtonPressEvent: function (actor, event) {
        if (this._target) {
            let [stageX, stageY] = event.get_coords();
            this.emit('target', this._target, stageX, stageY);
        }
        this._close();
        return true;
    },

    _onScrollEvent: function (actor, event) {
        switch (event.get_scroll_direction()) {
        case Clutter.ScrollDirection.UP:
            // select parent
            let parent = this._target.get_parent();
            if (parent != null) {
                this._target = parent;
                this._update(event);
            }
            break;

        case Clutter.ScrollDirection.DOWN:
            // select child
            if (this._target != this._pointerTarget) {
                let child = this._pointerTarget;
                while (child) {
                    let parent = child.get_parent();
                    if (parent == this._target)
                        break;
                    child = parent;
                }
                if (child) {
                    this._target = child;
                    this._update(event);
                }
            }
            break;

        default:
            break;
        }
        return true;
    },

    _onMotionEvent: function (actor, event) {
        this._update(event);
        return true;
    },

    _update: function(event) {
        let [stageX, stageY] = event.get_coords();
        let target = global.stage.get_actor_at_pos(Clutter.PickMode.ALL,
                                                   stageX,
                                                   stageY);

        if (target != this._pointerTarget)
            this._target = target;
        this._pointerTarget = target;

        let position = '[inspect x: ' + stageX + ' y: ' + stageY + ']';
        this._displayText.text = '';
        this._displayText.text = position + ' ' + this._target;

        if (this._borderPaintTarget != this._target) {
            if (this._borderPaintTarget != null)
                this._borderPaintTarget.disconnect(this._borderPaintId);
            this._borderPaintTarget = this._target;
            this._borderPaintId = addBorderPaintHook(this._target);
        }
    }
};
Signals.addSignalMethods(Inspector.prototype);


function InspectInterface(target, x, y) {
    this._init(target, x, y);
}

InspectInterface.prototype = {
    __proto__: Interfaces.GenericInterface.prototype,
    
    name: _("Inspect"),
    
    _init: function(target, x, y) {
        
        Interfaces.GenericInterface.prototype._init.call(this, true);
        
        let scrollBox = new St.ScrollView({ style_class: "devtools-inspect-scrollbox"});
        this.panel.add_actor(scrollBox);
        
        let content = new St.BoxLayout({ vertical: true, style_class: "devtools-inspect-content" });
        scrollBox.add_actor(content);
        
        let objName = new St.Label({ text: "Details for "+target });
        content.add_actor(objName);
        
        //if ( target instanceof Clutter.actor ) {
        //    global.log("hello");
        //}
        
        let height = new St.Label({ text: "Height: "+target.height+" pixels" });
        content.add_actor(height);
        let width = new St.Label({ text: "Width: "+target.width+" pixels" });
        content.add_actor(width);
        
        let styleClass = new St.Label({ text: "Style Class: "+target.style_class });
        content.add_actor(styleClass);
        
        
        
        this.propertiesBox = new St.BoxLayout({ vertical: true });
        let properties = new CollapseButton.CollapseButton("Object Properties", false, this.propertiesBox);
        content.add_actor(properties.actor);
        
        let properties = [];
        for ( let prop in target ) {
            let propString = typeof(target[prop]) + ": " + prop;
            properties.push(propString);
        }
        let propertiesText = properties.sort().join("\n");
        let propLabel = new St.Label({ text: propertiesText });
        this.propertiesBox.add_actor(propLabel);
    }
}
