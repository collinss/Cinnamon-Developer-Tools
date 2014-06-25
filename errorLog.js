const CheckBox = imports.ui.checkBox;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Interfaces = imports.interfaces;

const CINNAMON_LOG_REFRESH_TIMEOUT = 1;
const XSESSION_LOG_REFRESH_TIMEOUT = 10;


let xsession_hide_old = true;


function XSessionLogInterface(parent) {
    this._init(parent);
}

XSessionLogInterface.prototype = {
    __proto__: Interfaces.GenericInterface.prototype,
    
    name: _("X-Session Log"),
    
    _init: function(parent) {
        
        Interfaces.GenericInterface.prototype._init.call(this);
        
        this.start = 0;
        
        this.scrollBox = new St.ScrollView();
        
        //content text
        this.contentText = new St.Label();
        this.contentText.set_clip_to_allocation(false);
        this.contentText.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.contentText.clutter_text.line_wrap = true;
        let textBox = new St.BoxLayout();
        textBox.add_actor(this.contentText);
        this.scrollBox.add_actor(textBox);
        this.panel.add_actor(this.scrollBox);
        
        let paddingBox = new St.Bin();
        this.panel.add(paddingBox, { expand: true });
        
        //clear button
        let clearButton = new St.Button({ style_class: "devtools-contentButton" });
        this.panel.add_actor(clearButton);
        let clearBox = new St.BoxLayout();
        clearButton.add_actor(clearBox);
        clearBox.add_actor(new St.Label({ text: _("Clear") }));
        clearButton.connect("clicked", Lang.bind(this, this.clear));
    },
    
    getText: function() {
        //if the tab is not shown don't waste resources on refreshing content
        if ( !this.selected ) return;
        
        let file = Gio.file_new_for_path(GLib.get_home_dir() + "/.xsession-errors")
        file.load_contents_async(null, Lang.bind(this, function(file, result) {
            try {
                let text = "";
                let lines = String(file.load_contents_finish(result)[1]).split("\n");
                this.end = lines.length - 1;
                for ( let i = this.start; i < lines.length; i++ ) {
                    let line = lines[i];
                    if ( xsession_hide_old && line.search("About to start Cinnamon") > -1 ) {
                        text = ""
                    }
                    text += line + "\n";
                }
                
                if ( this.contentText.text != text ) {
                    this.contentText.text = text;
                    let adjustment = this.scrollBox.get_vscroll_bar().get_adjustment();
                    adjustment.value = this.contentText.height - adjustment.page_size;
                }
            } catch(e) {
                global.logError(e);
            }
        }));
        
        Mainloop.timeout_add_seconds(XSESSION_LOG_REFRESH_TIMEOUT, Lang.bind(this, this.getText));
    },
    
    onSelected: function() {
        this.getText();
    },
    
    clear: function() {
        this.start = this.end;
        this.getText();
    }
}


function CinnamonLogInterface(parent) {
    this._init(parent);
}

CinnamonLogInterface.prototype = {
    __proto__: Interfaces.GenericInterface.prototype,
    
    name: _("Cinnamon Log"),
    
    _init: function(parent) {
        
        Interfaces.GenericInterface.prototype._init.call(this);
        
        this.scrollBox = new St.ScrollView();
        
        //content text
        this.contentText = new St.Label();
        this.contentText.set_clip_to_allocation(false);
        this.contentText.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.contentText.clutter_text.line_wrap = true;
        let textBox = new St.BoxLayout();
        textBox.add_actor(this.contentText);
        this.scrollBox.add_actor(textBox);
        this.panel.add_actor(this.scrollBox);
        
        let paddingBox = new St.Bin();
        this.panel.add(paddingBox, { expand: true });
        
        let bottomBox = new St.BoxLayout({ style_class: "devtools-cLog-bottomBox" });
        this.panel.add_actor(bottomBox);
        this.showTimestamp = new CheckBox.CheckBox("Show Timestamp", { style_class: "check-box devtools-cLog-checkBox" });
        bottomBox.add_actor(this.showTimestamp.actor);
        this.showTimestamp.actor.connect("clicked", Lang.bind(this, this.getText));
        let copyButton = new St.Button();
        copyBox = new St.BoxLayout();
        copyButton.add_actor(copyBox);
        copyBox.add_actor(new St.Icon({ icon_name: "edit-copy", icon_size: 16, icon_type: St.IconType.SYMBOLIC }));
        copyBox.add_actor(new St.Label({ text: "Copy" }));
        bottomBox.add(new St.BoxLayout(), { expand: true });
        bottomBox.add_actor(copyButton);
        copyButton.connect("clicked", Lang.bind(this, this.copy));
        
    },
    
    connectToLgDBus: function() {
        let proxy = new Gio.DBusProxy({ g_bus_type: Gio.BusType.SESSION,
                                        g_flags: Gio.DBusProxyFlags.NONE,
                                        g_interface_info: null,
                                        g_name: "org.Cinnamon.LookingGlass",
                                        g_object_path: "/org/Cinnamon/LookingGlass",
                                        g_interface_name: "org.Cinnamon.LookingGlass" });
        
        //let proxy = new Gio.DBusProxy.for_bus_sync(Gio.BusType.SESSION, Gio.DBusProxyFlags.NONE, null, "org.Cinnamon.LookingGlass", "/org/Cinnamon/LookingGlass", "org.Cinnamon.LookingGlass", null);
        proxy.connect("g-signal", Lang.bind(this, function(proxy, senderName, signalName, params) {
                global.logError("testing");
            if ( senderName == "LogUpdate" ) {
                this.getText();
            }
        }));
    },
    
    getText: function() {
        //if the tab is not shown don't waste resources on refreshing content
        if ( !this.selected ) return;
        
        let stack = Main._errorLogStack;
        
        let text = "";
        for ( let i = 0; i < stack.length; i++) {
            let logItem = stack[i];
            text += logItem.category + ":  ";
            if ( this.showTimestamp.actor.checked ) text += this._formatTime(new Date(parseInt(logItem.timestamp)));
            text += logItem.message + "\n";
        }
        
        //set scroll position to the end (new content shown)
        if ( this.contentText.text != text ) {
            this.contentText.text = text;
            let adjustment = this.scrollBox.get_vscroll_bar().get_adjustment();
            adjustment.value = this.contentText.height - adjustment.page_size;
        }
        
        Mainloop.timeout_add_seconds(CINNAMON_LOG_REFRESH_TIMEOUT, Lang.bind(this, this.getText));
    },
    
    onSelected: function() {
        Mainloop.idle_add(Lang.bind(this, this.getText));
        this.connectToLgDBus();
    },
    
    copy: function() {
        St.Clipboard.get_default().set_text(this.contentText.text);
    }
}
