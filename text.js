const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const St = imports.gi.St;
const Params = imports.misc.params;
const Lang = imports.lang;


function TextAllocator() {
    this._init.apply(this, arguments);
}

TextAllocator.prototype = {
    _init: function(textObj, params) {
        params = Params.parse (params, { text: "",
                                         style_class: "multiline-text",
                                         height: null,
                                         width: null,
                                         lines: null });
        
        this.textObj = textObj;
        this.outerWidth = 0;
        
        let props = { style_class: params.style_class };
        
        if ( params.height ) {
            this.height = params.height;
            props.height = params.height;
            this.heightSet = true;
        }
        
        else if ( params.lines ) {
            this.height = params.lines * 12;
            props.style = "height: " + params.lines + "em;";
            this.heightSet = true;
        }
        else {
            this.heightSet = false;
        }
        
        if ( params.width ) {
            this.width = params.width;
            this.widthSet = true;
        }
        else {
            this.widthSet = false;
        }
        
        this.actor = new St.Bin({ x_expand: !this.widthSet, x_fill: !this.widthSet, x_align: St.Align.START, y_expand: !this.heightSet, y_fill: !this.heightSet, y_align: St.Align.START });
        
        this._outerWrapper = new Cinnamon.GenericContainer();
        this.actor.add_actor(this._outerWrapper);
        this._outerWrapper.connect("allocate", Lang.bind(this, this.allocateOuter));
        this._outerWrapper.connect("get-preferred-height", Lang.bind(this, this.getPreferedOuterHeight));
        this._outerWrapper.connect("get-preferred-width", Lang.bind(this, this.getPreferedOuterWidth));
        
        this.scroll = new St.ScrollView(props);
        this._outerWrapper.add_actor(this.scroll);
        this.scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        
        let box = new St.BoxLayout();
        this.scroll.add_actor(box);
        
        this._innerWrapper = new Cinnamon.GenericContainer();
        box.add_actor(this._innerWrapper);
        this._innerWrapper.add_actor(textObj);
        
        this.text = textObj.clutter_text;
        this.text.set_single_line_mode(false);
        this.text.set_activatable(false);
        this.text.ellipsize = Pango.EllipsizeMode.NONE;
        this.text.line_wrap = true;
        this.text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        this.text.set_selectable(true);
        textObj.text = params.text;
        
        this._innerWrapper.connect("allocate", Lang.bind(this, this.allocateInner));
        this._innerWrapper.connect("get-preferred-height", Lang.bind(this, this.getPreferedInnerHeight));
        this._innerWrapper.connect("get-preferred-width", Lang.bind(this, this.getPreferedInnerWidth));
        
        this.actor.connect("style-changed", Lang.bind(this, function() {
            let fontHeight = this.textObj.get_theme_node().lookup_length("font-size", true);
//global.logWarning(String(fontHeight));
        }));
    },
    
    allocateOuter: function(actor, box, flags) {
//global.logWarning("allocate");
        this.outerWidth = box.x2 - box.x1;
        
        let childBox = new Clutter.ActorBox();
        
        childBox.x1 = box.x1;
        childBox.x2 = box.x2;
        childBox.y1 = box.y1;
        childBox.y2 = box.y2;
        this.scroll.allocate(childBox, flags);
    },
    
    getPreferedOuterHeight: function(actor, forWidth, alloc) {
        if ( this.heightSet ) {
            alloc.min_size = this.height;
            alloc.natural_size = this.height;
        }
        else {
            alloc.min_size = 24;
            alloc.natural_size = 24;
        }
    },
    
    getPreferedOuterWidth: function(actor, forHeight, alloc) {
        if ( this.widthSet ) {
            alloc.min_size = this.width;
            alloc.natural_size = this.width;
        }
        else {
            alloc.min_size = 50;
            alloc.natural_size = 50;
        }
    },
    
    allocateInner: function(actor, box, flags) {
        let childBox = new Clutter.ActorBox();
        
        childBox.x1 = box.x1;
        childBox.x2 = box.x2;
        childBox.y1 = box.y1;
        childBox.y2 = box.y2;
        this.label.allocate(childBox, flags);
    },
    
    getPreferedInnerHeight: function(actor, forWidth, alloc) {
        let [minHeight, natHeight] = this.text.get_preferred_height(this.getInnerWidth());
        alloc.min_size = minHeight;
        alloc.natural_size = natHeight;
    },
    
    getPreferedInnerWidth: function(actor, forHeight, alloc) {
        let width = this.getInnerWidth();
        alloc.min_size = width;
        alloc.natural_size = width;
    },
    
    getInnerWidth: function() {
        let sNode = this.scroll.get_theme_node();
        let width = sNode.adjust_for_width(this.outerWidth);
        if ( this.text.get_preferred_height(width) > sNode.adjust_for_height(this._outerWrapper.height) ) width -= this.scroll.vscroll.width;
        return width;
    }
}

function Label(params) {
    this._init(params);
}

Label.prototype = {
    __proto__: TextAllocator.prototype,
    
    _init: function(params) {
        this.label = new St.Label();
        
        TextAllocator.prototype._init.call(this, this.label, params);
    }
}

function Entry(params) {
    this._init(params);
}

Entry.prototype = {
    __proto__: TextAllocator.prototype,
    
    _init: function(params) {
        this.entry = new St.Entry();
        
        TextAllocator.prototype._init.call(this, this.label, params);
    }
}
