const Desklet = imports.ui.desklet;
const Extension = imports.ui.extension;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;

const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Util = imports.misc.util;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

const POPUP_MENU_ICON_SIZE = 24;
const CINNAMON_LOG_REFRESH_TIMEOUT = 1;
const XSESSION_LOG_REFRESH_TIMEOUT = 10;
const TERMINAL_REFRESH_TIMEOUT = 10;

const SETTINGS_PAGES = [
    { title: "Applet Settings",      page: "applets" },
    { title: "Desklet Settings",     page: "desklets" },
    { title: "Extension Settings",   page: "extensions" },
    { title: "General Settings",     page: "general" },
    { title: "Panel Settings",       page: "panel" },
    { title: "Regional Settings",    page: "region" },
    { title: "Theme Settings",       page: "themes" },
    { title: "Tile Settings",        page: "tiling" },
    { title: "Window Settings",      page: "windows" },
    { title: "Workspace Settings",   page: "workspaces" }
]


let button_base_path;
let command_output_start_state;
let desklet_raised = false;


function Window(window) {
    this._init(window);
}

Window.prototype = {
    _init: function(window) {
        
        this.window = window;
        
        this.actor = new St.BoxLayout({ vertical: true, style_class: "devtools-windows-windowBox" });
        
        let titleBox = new St.BoxLayout();
        this.actor.add_actor(titleBox);
        titleBox.add_actor(new St.Label({ text: "Title: ", width: 100 }));
        let title = new St.Label({ text: window.title, style_class: "devtools-windows-title" });
        titleBox.add_actor(title);
        
        let classBox = new St.BoxLayout();
        this.actor.add_actor(classBox);
        classBox.add_actor(new St.Label({ text: "Class: ", width: 100 }));
        let wmClass = new St.Label({ text: window.get_wm_class() });
        classBox.add_actor(wmClass);
        
        
        
        //let tracker = Cinnamon.WindowTracker.get_default();
            // Avoid multiple connections
            //if (!window._lookingGlassManaged) {
            //    window.connect("unmanaged", Lang.bind(this, this._updateWindowList));
            //    window._lookingGlassManaged = true;
            //    
            //    window._lgId = this.lastId;
            //    this.lastId++;
            //}
            //
            //let lgInfo = { id: window._lgId.toString(), title: window.title, wmclass: window.get_wm_class(), app: ""};
            //
            //let box = new St.BoxLayout({ vertical: true });
            //this.actor.add(box);
            //let propsBox = new St.BoxLayout({ vertical: true, style: "padding-left: 6px;" });
            //box.add(propsBox);
            //let app = tracker.get_window_app(window);
            //if (app != null && !app.is_window_backed()) {
            //    let icon = app.create_icon_texture(22);
            //    let propBox = new St.BoxLayout({ style: "spacing: 6px; " });
            //    propsBox.add(propBox);
            //    propBox.add(new St.Label({ text: "app: " }), { y_fill: false });
            //    let appLink = new ObjLink(app, app.get_id());
            //    propBox.add(appLink.actor, { y_fill: false });
            //    propBox.add(icon, { y_fill: false });
            //    
            //    lgInfo.app = app.get_id();
            //} else {
            //    propsBox.add(new St.Label({ text: "<untracked>" }));
            //    
            //    lgInfo.app = "<untracked>";
            //}
            //
            //// Ignore menus
            //let wtype = window.get_window_type();
            //if(wtype != Meta.WindowType.MENU && wtype != Meta.WindowType.DROPDOWN_MENU && wtype != Meta.WindowType.POPUP_MENU)
            //    this.latestWindowList.push(lgInfo);
    },
    
    destroy: function() {
        this.actor.destroy();
    }
}


function CollapseButton(label, startState, callback) {
    this._init(label, startState, callback);
}

CollapseButton.prototype = {
    _init: function(label, startState, callback) {
        this.state = startState;
        this.callback = callback;
        
        this.actor = new St.Button({ x_expand: false, x_fill: false, style_class: "devtools-contentButton" });
        let buttonBox = new St.BoxLayout();
        this.actor.set_child(buttonBox);
        buttonBox.add_actor(new St.Label({ text: label }));
        
        this.arrowIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 8, style: "padding: 4px;" });
        buttonBox.add_actor(this.arrowIcon);
        this._updateIcon();
        
        this.actor.connect("clicked", Lang.bind(this, this._onButtonClicked));
    },
    
    _onButtonClicked: function() {
        if ( this.state ) this.state = false;
        else this.state = true;
        this._updateIcon();
        this.callback(this.state);
    },
    
    _updateIcon: function() {
        let path;
        if ( this.state ) path = button_base_path + "open-symbolic.svg";
        else path = button_base_path + "closed-symbolic.svg";
        let file = Gio.file_new_for_path(path);
        let gicon = new Gio.FileIcon({ file: file });
        this.arrowIcon.gicon = gicon;
    }
}


function Command(command, pId, inId, outId, errId, output) {
    this._init(command, pId, inId, outId, errId, output);
}

Command.prototype = {
    _init: function(command, pId, inId, outId, errId) {
        this.pId = pId;
        this.inId = inId;
        this.outId = outId;
        this.errId = errId;
        
        this.actor = new St.BoxLayout({ vertical: true, style_class: "devtools-terminal-processBox" });
        
        //header
        let headerBox = new St.BoxLayout();
        this.actor.add_actor(headerBox);
        let infoBox = new St.BoxLayout({ vertical: true });
        headerBox.add(infoBox, { expand: true });
        let toolBox = new St.BoxLayout({ vertical: true });
        headerBox.add_actor(toolBox);
        
        //command
        let commandBox = new St.BoxLayout();
        infoBox.add_actor(commandBox);
        commandBox.add_actor(new St.Label({ text: "Command: ", width: 100 }));
        let commandLabel = new St.Label({ text: command });
        commandBox.add_actor(commandLabel);
        
        //status
        let statusBox = new St.BoxLayout();
        infoBox.add_actor(statusBox);
        statusBox.add_actor(new St.Label({ text: "Status: ", width: 100 }));
        this.status = new St.Label({ text: "Running" });
        statusBox.add_actor(this.status);
        
        //clear button
        let clearButton = new St.Button({ label: "Clear", style_class: "devtools-contentButton" });
        toolBox.add_actor(clearButton);
        clearButton.connect("clicked", Lang.bind(this, this.clear));
        
        //end process button
        this.stopButton = new St.Button({ label: "End Process", style_class: "devtools-contentButton" });
        toolBox.add_actor(this.stopButton);
        this.stopButton.connect("clicked", Lang.bind(this, this.endProcess));
        
        //output toggle
        let toggleBox = new St.BoxLayout();
        this.actor.add_actor(toggleBox);
        this.showOutput = command_output_start_state;
        let outputButton = new CollapseButton("Output", command_output_start_state, Lang.bind(this, function(openState){
            if ( openState ) this.output.show();
            else this.output.hide();
        }));
        toggleBox.add_actor(outputButton.actor);
        
        //output
        this.output = new St.Label();
        if ( !this.showOutput ) this.output.hide();
        this.actor.add_actor(this.output);
        this.output.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.output.clutter_text.line_wrap = true;
        
        //open streams and start reading
        let uiStream = new Gio.UnixInputStream({ fd: this.outId });
        this.input = new Gio.DataInputStream({ base_stream: uiStream });
        Mainloop.idle_add(Lang.bind(this, this.readNext));
    },
    
    readNext: function() {
        this.input.read_line_async(0, null, Lang.bind(this, this.finishRead));
    },
    
    finishRead: function(stream, res) {
        let [out, size] = stream.read_line_finish(res);
        if ( out ) {
            this.output.text += out + "\n";
            this.readNext();
        }
        else {
            this.status.text = "Stopped";
            this.stopButton.hide();
            this.closed = true;
        }
    },
    
    endProcess: function() {
        Util.spawnCommandLine("kill " + this.pId);
    },
    
    clear: function() {
        this.actor.destroy();
        this.delete();
    }
}


function Terminal() {
    this._init();
}

Terminal.prototype = {
    _init: function() {
        
        this.processes = [];
        
        this.actor = new St.BoxLayout({ vertical: true });
        
        this.input = new St.Entry({ style_class: "devtools-terminal-entry", track_hover: false, can_focus: true });
        this.actor.add_actor(this.input);
        
        let scrollBox = new St.ScrollView();
        this.actor.add_actor(scrollBox);
        
        this.output = new St.BoxLayout({ vertical: true, style_class: "devtools-terminal-processMainBox" });
        scrollBox.add_actor(this.output);
        
        this.input.clutter_text.connect("button_press_event", Lang.bind(this, this.onButtonPress));
        this.input.clutter_text.connect("key_press_event", Lang.bind(this, this.onKeyPress));
        
    },
    
    runInput: function() {
        try {
            
            let input = this.input.get_text();
            this.input.text = "";
            if ( input == "" ) return;
            input = input.replace("~/", GLib.get_home_dir() + "/"); //replace all ~/ with path to home directory
            
            let [success, argv] = GLib.shell_parse_argv(input);
            
            let flags = GLib.SpawnFlags.SEARCH_PATH;
            let [result, pId, inId, outId, errId] = GLib.spawn_async_with_pipes(null, argv, null, flags, null, null);
            
            if ( this.output.get_children().length > 0 ) {
                let separator = new PopupMenu.PopupSeparatorMenuItem();
                this.output.add_actor(separator.actor);
                separator.actor.remove_style_class_name("popup-menu-item");
                separator._drawingArea.add_style_class_name("devtools-separator");
            }
            
            let command = new Command(input, pId, inId, outId, errId);
            this.output.add_actor(command.actor);
            this.processes.push(command);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onKeyPress: function(actor, event) {
        
        let symbol = event.get_key_symbol();
        if ( symbol == Clutter.Return || symbol == Clutter.KP_Enter ) {
            this.runInput();
            return true;
        }
        
        return false;
    },
    
    onButtonPress: function() {
        global.set_stage_input_mode(Cinnamon.StageInputMode.FOCUSED);
    }
}


function GenericInterface() {
    this._init();
}

GenericInterface.prototype = {
    name: _("Untitled"),
    
    _init: function() {
        
        //create panel
        this.panel = new St.BoxLayout({ style_class: "devtools-panel", vertical: true });
        this.panel.hide();
        
        //generate tab
        this.tab = new St.Button({ label: this.name, style_class: "devtools-tab" });
        
    },
    
    setSelect: function(select) {
        if ( select ) {
            this.selected = true;
            this.onSelected();
            this.panel.show();
            this.tab.add_style_pseudo_class("selected");
        }
        else {
            this.panel.hide();
            this.tab.remove_style_pseudo_class("selected");
            this.selected = false;
        }
    },
    
    _formatTime: function(d){
        function pad(n) { return n < 10 ? "0" + n : n; }
        return (d.getMonth()+1)+"/"
            + pad(d.getDate())+" "
            + (d.getHours())+":"
            + pad(d.getMinutes())+":"
            + pad(d.getSeconds())+"  ";
    },
    
    onSelected: function() {
        //defined by individual interfaces
    }
}


function WindowInterface(parent) {
    this._init(parent);
}

WindowInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("Windows"),
    
    _init: function(parent) {
        
        GenericInterface.prototype._init.call(this);
        
        this.windowObjects = [];
        let tracker = Cinnamon.WindowTracker.get_default();
        
        global.display.connect("window-created", Lang.bind(this, this.refresh));
        tracker.connect("tracked-windows-changed", Lang.bind(this, this.refresh));
        
        this.windowsBox = new St.BoxLayout({ vertical: true, style_class: "devtools-windows-mainBox" });
        this.panel.add_actor(this.windowsBox);
        
    },
    
    refresh: function() {
        if ( !this.selected ) return;
        
        for ( let i = 0; i < this.windowObjects.length; i++ ) {
            this.windowObjects[i].destroy();
        }
        this.windowObjects = [];
        
        let windows = global.get_window_actors();
        
        let hasChild = false;
        for ( let i = 0; i < windows.length; i++ ) {
            if ( hasChild ) {
                let separator = new PopupMenu.PopupSeparatorMenuItem();
                this.windowsBox.add_actor(separator.actor);
                separator.actor.remove_style_class_name("popup-menu-item");
                separator._drawingArea.add_style_class_name("devtools-separator");
            }
            
            let window = windows[i].metaWindow;
            
            let windowBox = new Window(window);
            this.windowsBox.add_actor(windowBox.actor);
            this.windowObjects.push(windowBox);
        }
    },
    
    onSelected: function() {
        this.refresh();
    }
}


function TerminalInterface(parent) {
    this._init(parent);
}

TerminalInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("Run"),
    
    _init: function(parent) {
        
        GenericInterface.prototype._init.call(this);
        
        let terminal = new Terminal();
        this.panel.add_actor(terminal.actor);
        
    }
}


function CinnamonLogInterface(parent) {
    this._init(parent);
}

CinnamonLogInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("Cinnamon Log"),
    
    _init: function(parent) {
        
        GenericInterface.prototype._init.call(this);
        
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
            text += this._formatTime(new Date(parseInt(logItem.timestamp))) + logItem.category + ":  " + logItem.message + "\n";
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
    }
}


function XSessionLogInterface(parent) {
    this._init(parent);
}

XSessionLogInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("X-Session Log"),
    
    _init: function(parent) {
        
        GenericInterface.prototype._init.call(this);
        
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
                    text += lines[i] + "\n";
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


function ExtensionInterface(parent, name, info) {
    this._init(parent, name, info);
}

ExtensionInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    _init: function(parent, name, info) {
        try {
            
            this.name = name;
            this.info = info;
            GenericInterface.prototype._init.call(this);
            
            let scrollBox = new St.ScrollView();
            this.panel.add_actor(scrollBox);
            
            this.extensionBox = new St.BoxLayout({ vertical: true, style_class: "devtools-extension-mainBox" });
            scrollBox.add_actor(this.extensionBox);
            
            this.info.connect("extension-loaded", Lang.bind(this, this.reload));
            this.info.connect("extension-unloaded", Lang.bind(this, this.reload));
            
            this.reload();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    reload: function() {
        try {
            this.extensionBox.destroy_all_children();
            
            let hasChild = false;
            for ( let uuid in Extension.meta ) {
                let meta = Extension.meta[uuid];
                if ( !meta.name ) continue;
                if ( !Extension.objects[uuid] ) continue;
                if ( Extension.objects[uuid].type.name != this.info.name ) continue;
                
                if ( hasChild ) {
                    let separator = new PopupMenu.PopupSeparatorMenuItem();
                    this.extensionBox.add_actor(separator.actor);
                    separator.actor.remove_style_class_name("popup-menu-item");
                    separator._drawingArea.add_style_class_name("devtools-separator");
                }
                
                let extension = new St.BoxLayout({ vertical: true, style_class: "devtools-extension-container" });
                let name = new St.Label({ text: meta.name });
                extension.add_actor(name);
                
                let description = new St.Label({ text: meta.description });
                extension.add_actor(description);
                
                let commandBox = new St.BoxLayout();
                extension.add_actor(commandBox);
                let reload = new St.Button({ x_align: St.Align.START, x_fill: false, x_expand: false, style_class: "devtools-contentButton" });
                commandBox.add_actor(reload);
                let reloadBox = new St.BoxLayout();
                reload.set_child(reloadBox);
                reload.connect("clicked", Lang.bind(this, function() {
                    Extension.unloadExtension(meta.uuid);
                    Extension.loadExtension(meta.uuid, this.info);
                }));
                
                let file = Gio.file_new_for_path(button_base_path + "restart-symbolic.svg");
                let gicon = new Gio.FileIcon({ file: file });
                let reloadIcon = new St.Icon({ gicon: gicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
                reloadBox.add_actor(reloadIcon);
                let reloadLabelBin = new St.Bin();
                reloadBox.add_actor(reloadLabelBin);
                let reloadLabel = new St.Label({ text: _("Reload Code") });
                reloadLabelBin.add_actor(reloadLabel);
                
                this.extensionBox.add_actor(extension);
                hasChild = true;
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onSelected: function() {
        Mainloop.idle_add(Lang.bind(this, this.reload));
    }
}


let interfaces = [
    new CinnamonLogInterface(),
    new XSessionLogInterface(),
    new TerminalInterface(),
    new ExtensionInterface(null, "Applets", Extension.Type.APPLET),
    new ExtensionInterface(null, "Desklets", Extension.Type.DESKLET),
    new ExtensionInterface(null, "Extensions", Extension.Type.EXTENSION),
    new WindowInterface()
];


function Menu(icon, tooltip, styleClass) {
    this._init(icon, tooltip, styleClass);
}

Menu.prototype = {
    _init: function(icon, tooltip, styleClass) {
        try {
            
            this.actor = new St.Button({ style_class: styleClass });
            this.actor.set_child(icon);
            new Tooltips.Tooltip(this.actor, tooltip);
            
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new PopupMenu.PopupMenu(this.actor, 0.0, St.Side.TOP, 0);
            this.menuManager.addMenu(this.menu);
            Main.uiGroup.add_actor(this.menu.actor);
            this.menu.actor.hide();
            
            this.actor.connect("clicked", Lang.bind(this, this.activate));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    activate: function() {
        this.menu.toggle();
    },
    
    addMenuItem: function(title, callback, icon) {
        let menuItem = new PopupMenu.PopupBaseMenuItem();
        if ( icon ) menuItem.addActor(icon);
        let label = new St.Label({ text: title });
        menuItem.addActor(label);
        menuItem.connect("activate", callback);
        this.menu.addMenuItem(menuItem);
    },
    
    addSeparator: function() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
}


function RaisedBox() {
    this._init();
}

RaisedBox.prototype = {
    _init: function() {
        try {
            
            this.stageEventIds = [];
            this.settingsMenuEvents = [];
            this.contextMenuEvents = [];
            
            this.actor = new St.Group({ visible: false, x: 0, y: 0 });
            Main.uiGroup.add_actor(this.actor);
            let constraint = new Clutter.BindConstraint({ source: global.stage,
                                                          coordinate: Clutter.BindCoordinate.POSITION | Clutter.BindCoordinate.SIZE });
            this.actor.add_constraint(constraint);
            
            this._backgroundBin = new St.Bin();
            this.actor.add_actor(this._backgroundBin);
            let monitor = Main.layoutManager.focusMonitor;
            this._backgroundBin.set_position(monitor.x, monitor.y);
            this._backgroundBin.set_size(monitor.width, monitor.height);
            
            let stack = new Cinnamon.Stack();
            this._backgroundBin.child = stack;
            
            this.eventBlocker = new Clutter.Group({ reactive: true });
            stack.add_actor(this.eventBlocker);
            
            this.groupContent = new St.Bin();
            stack.add_actor(this.groupContent);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    add: function(desklet) {
        try {
            
            this.desklet = desklet;
            this.settingsMenu = this.desklet.settingsMenu.menu;
            this.contextMenu = this.desklet._menu;
            
            this.groupContent.add_actor(this.desklet.actor);
            
            this.actor.show();
            global.set_stage_input_mode(Cinnamon.StageInputMode.FULLSCREEN);
            global.focus_manager.add_group(this.actor);
            
            this.stageEventIds.push(global.stage.connect("captured-event", Lang.bind(this, this.onStageEvent)));
            this.stageEventIds.push(global.stage.connect("enter-event", Lang.bind(this, this.onStageEvent)));
            this.stageEventIds.push(global.stage.connect("leave-event", Lang.bind(this, this.onStageEvent)));
            this.settingsMenuEvents.push(this.settingsMenu.connect("activate", Lang.bind(this, function() {
                this.emit("closed");
            })));
            this.settingsMenuEvents.push(this.settingsMenu.connect("open-state-changed", Lang.bind(this, function(menu, open) {
                if ( !open ) {
                    global.set_stage_input_mode(Cinnamon.StageInputMode.FULLSCREEN);
                }
            })));
            this.contextMenuEvents.push(this.contextMenu.connect("activate", Lang.bind(this, function() {
                this.emit("closed");
            })));
            this.contextMenuEvents.push(this.contextMenu.connect("open-state-changed", Lang.bind(this, function(menu, open) {
                if ( !open ) {
                    global.set_stage_input_mode(Cinnamon.StageInputMode.FULLSCREEN);
                }
            })));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    remove: function() {
        try {
            
            for ( let i = 0; i < this.stageEventIds.length; i++ ) global.stage.disconnect(this.stageEventIds[i]);
            for ( let i = 0; i < this.settingsMenuEvents.length; i++ ) this.settingsMenu.disconnect(this.settingsMenuEvents[i]);
            for ( let i = 0; i < this.contextMenuEvents.length; i++ ) this.contextMenu.disconnect(this.contextMenuEvents[i]);
            
            if ( this.desklet ) this.groupContent.remove_actor(this.desklet.actor);
            
            this.actor.destroy();
            global.set_stage_input_mode(Cinnamon.StageInputMode.NORMAL);
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onStageEvent: function(actor, event) {
        try {
            
            let type = event.type();
            if ( type == Clutter.EventType.KEY_PRESS || type == Clutter.EventType.KEY_RELEASE ) return true;
            
            let target = event.get_source();
            if ( target == this.desklet.actor || this.desklet.actor.contains(target) ||
                 target == this.settingsMenu.actor || this.settingsMenu.actor.contains(target) ||
                 target == this.contextMenu.actor || this.contextMenu.actor.contains(target) ) return false;
            if ( type == Clutter.EventType.BUTTON_RELEASE ) this.emit("closed");
            
        } catch(e) {
            global.logError(e);
        }
        
        return true;
    }
}
Signals.addSignalMethods(RaisedBox.prototype);


function myDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

myDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    
    _init: function(metadata, desklet_id) {
        try {
            
            Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
            
            button_base_path = this.metadata.path + "/buttons/";
            this._bindSettings();
            
            let mainBox = new St.BoxLayout({ vertical: true, style_class: "devtools-mainBox" });
            this.setContent(mainBox);
            this.buttonArea = new St.BoxLayout({ vertical: false, style_class: "devtools-buttonArea" });
            mainBox.add_actor(this.buttonArea);
            this.contentArea = new St.BoxLayout({ vertical: true });
            mainBox.add_actor(this.contentArea);
            
            this.addButtons();
            this.addContent();
            this.setHideState();
            this.selectIndex(0);
            
            this.setHeader(_("Tools"));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    _bindSettings: function() {
        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, this.instance_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "lgOpen", "lgOpen", function() {});
        this.settings.bindProperty(Settings.BindingDirection.IN, "collapsedStartState", "collapsedStartState", function() {});
        this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, "collapsed", "collapsed", this.setHideState);
        this.settings.bindProperty(Settings.BindingDirection.IN, "terminalOutputShow", "terminalOutputShow", function() {
            command_output_start_state = this.terminalOutputShow;
        });
        command_output_start_state = this.terminalOutputShow;
        this.settings.bindProperty(Settings.BindingDirection.IN, "raiseKey", "raiseKey", this.bindKey);
        this.bindKey();
    },
    
    bindKey: function() {
        if ( this.keyId ) Main.keybindingManager.removeHotKey(this.keyId);
        
        this.keyId = "devtools-raise";
        Main.keybindingManager.addHotKey(this.keyId, this.raiseKey, Lang.bind(this, this.toggleRaise));
    },
    
    toggleRaise: function() {
        try {
            
            if ( desklet_raised ) this.lower();
            else this.raise();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    raise: function() {
        
        if ( desklet_raised || this.changingRaiseState ) return;
        this.changingRaiseState = true;
        
        this._draggable.inhibit = false;
        this.raisedBox = new RaisedBox();
        
        let position = this.actor.get_position();
        this.actor.get_parent().remove_actor(this.actor);
        this.raisedBox.add(this);
        
        this.raisedBox.connect("closed", Lang.bind(this, this.lower));
        
        desklet_raised = true;
        this.changingRaiseState = false;
    },
    
    lower: function() {
        if ( !desklet_raised || this.changingRaiseState ) return;
        this.changingRaiseState = true;
        
        this._menu.close();
        this.settingsMenu.menu.close();
        
        if ( this.raisedBox ) this.raisedBox.remove();
        Main.deskletContainer.addDesklet(this.actor);
        this._draggable.inhibit = false;
        
        desklet_raised = false;
        this.changingRaiseState = false;
    },
    
    addButtons: function() {
        //collapse button
        this.collapseButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(this.collapseButton);
        this.collapseIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        this.collapseButton.set_child(this.collapseIcon);
        this.collapseButton.connect("clicked", Lang.bind(this, this.toggleCollapse));
        this.collapseTooltip = new Tooltips.Tooltip(this.collapseButton);
        
        if ( this.collapsedStartState == 1 ) this.collapsed = false;
        else if ( this.collapsedStartState == 2 ) this.collapsed = true;
        
        let paddingBox = new St.Bin();
        this.buttonArea.add(paddingBox, { expand: true });
        
        //cinnamon settings menu
        let setIFile = Gio.file_new_for_path(button_base_path + "settings-symbolic.svg");
        let setIGicon = new Gio.FileIcon({ file: setIFile });
        let settingsMenuIcon = new St.Icon({ gicon: setIGicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        this.settingsMenu = new Menu(settingsMenuIcon, _("Cinnamon Settings"), "devtools-button");
        this.buttonArea.add_actor(this.settingsMenu.actor);
        this._populateSettingsMenu();
        
        //inspect button
        let inspectButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(inspectButton);
        let insIFile = Gio.file_new_for_path(button_base_path + "inspect-symbolic.svg");
        let insIGicon = new Gio.FileIcon({ file: insIFile });
        let inspectIcon = new St.Icon({ gicon: insIGicon, icon_size: 20, icon_type: St.IconType.SYMBOLIC });
        inspectButton.set_child(inspectIcon);
        inspectButton.connect("clicked", Lang.bind(this, this.inspect));
        new Tooltips.Tooltip(inspectButton, _("Inspect"));
        
        //open looking glass button
        let lgButton = new St.Button({ style_class: "devtools-button" });
        let lgIFile = Gio.file_new_for_path(button_base_path + "lg-symbolic.svg");
        let lgIGicon = new Gio.FileIcon({ file: lgIFile });
        let lgIcon = new St.Icon({ gicon: lgIGicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        lgButton.set_child(lgIcon);
        this.buttonArea.add_actor(lgButton);
        lgButton.connect("clicked", Lang.bind(this, this.launchLookingGlass));
        new Tooltips.Tooltip(lgButton, _("Open Looking Glass"));
        
        //restart button
        let restartButton = new St.Button({ style_class: "devtools-button" });
        let restartIFile = Gio.file_new_for_path(button_base_path + "restart-symbolic.svg");
        let restartIGicon = new Gio.FileIcon({ file: restartIFile });
        let restartIcon = new St.Icon({ gicon: restartIGicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        restartButton.set_child(restartIcon);
        this.buttonArea.add_actor(restartButton);
        restartButton.connect("clicked", Lang.bind(this, function() {
            global.reexec_self();
        }));
        new Tooltips.Tooltip(restartButton, _("Restart Cinnamon"));
    },
    
    addContent: function() {
        this.tabBox = new St.BoxLayout({ style_class: "devtools-tabBox", vertical: false });
        for ( let i in interfaces ) {
            this.contentArea.add_actor(interfaces[i].panel);
            let tab = interfaces[i].tab;
            this.tabBox.add_actor(tab);
            tab.connect("clicked", Lang.bind(this, function (){ this.selectTab(tab) }));
        }
        this.contentArea.add_actor(this.tabBox);
    },
    
    _populateSettingsMenu: function() {
        this.settingsMenu.addMenuItem("All Settings",
                         function() { Util.spawnCommandLine("cinnamon-settings"); },
                         new St.Icon({ icon_name: "preferences-system", icon_size: POPUP_MENU_ICON_SIZE, icon_type: St.IconType.FULLCOLOR }));
        
        this.settingsMenu.addSeparator();
        
        for ( let i = 0; i < SETTINGS_PAGES.length; i++ ) {
            let command = "cinnamon-settings " + SETTINGS_PAGES[i].page;
            this.settingsMenu.addMenuItem(SETTINGS_PAGES[i].title,
                             function() { Util.spawnCommandLine(command); },
                             new St.Icon({ icon_name: SETTINGS_PAGES[i].page, icon_size: POPUP_MENU_ICON_SIZE, icon_type: St.IconType.FULLCOLOR }));
        }
    },
    
    launchLookingGlass: function() {
        this.lower();
        
        if ( this.lgOpen ) {
            Util.spawnCommandLine("cinnamon-looking-glass");
        }
        else {
            Main.createLookingGlass().open();
        }
    },
    
    inspect: function() {
        this.lower();
        
        if ( this.lgOpen ) {
            Util.spawnCommandLine("cinnamon-looking-glass inspect");
        }
        else {
            Main.createLookingGlass().startInspector();
        }
    },
    
    selectTab: function(tab) {
        try {
            
        for ( let i in interfaces ) {
            if ( interfaces[i].tab == tab ) interfaces[i].setSelect(true);
            else interfaces[i].setSelect(false);
        }
        } catch(e) {
            global.logError(e);
        }
    },
    
    selectIndex: function(index) {
        for ( let i in interfaces ) {
            if ( i == index ) interfaces[i].setSelect(true);
            else interfaces[i].setSelect(false);
        }
    },
    
    setHideState: function(event) {
        let file;
        if ( this.collapsed ) {
            file = Gio.file_new_for_path(button_base_path + "add-symbolic.svg");
            this.collapseTooltip.set_text(_("Expand"));
            this.contentArea.hide();
        }
        else {
            file = Gio.file_new_for_path(button_base_path + "remove-symbolic.svg");
            this.collapseTooltip.set_text(_("Collapse"));
            this.contentArea.show();
        }
        let gicon = new Gio.FileIcon({ file: file });
        this.collapseIcon.gicon = gicon;
    },
    
    toggleCollapse: function() {
        this.collapsed = !this.collapsed;
        this.setHideState();
    }
}


function main(metadata, desklet_id) {
    let desklet = new myDesklet(metadata, desklet_id);
    return desklet;
}