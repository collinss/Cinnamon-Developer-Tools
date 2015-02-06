//javascript ui imports
const AppletManager = imports.ui.appletManager;
const Desklet = imports.ui.desklet;
const DeskletManager = imports.ui.deskletManager;
const Extension = imports.ui.extension;
const Flashspot = imports.ui.flashspot;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;
const Tweener = imports.ui.tweener;

//gobject introspection imports
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

//other imports
const Util = imports.misc.util;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Tab = imports.tab;
const Sandbox = imports.sandbox;
const Windows = imports.windows;
const Extensions = imports.extensions;
const ErrorLog = imports.errorLog;
const Terminal = imports.terminal;
const Inspect = imports.inspect;
const Text = imports.text;

//global constants
const POPUP_MENU_ICON_SIZE = 24;

//pages to display in the settings menu
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

//global variables
let desklet_raised = false;


function AboutDialog(metadata) {
    this._init(metadata);
}

AboutDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(metadata) {
        try {
            ModalDialog.ModalDialog.prototype._init.call(this, {  });
            
            let contentBox = new St.BoxLayout({ vertical: true, style_class: "about-content" });
            this.contentLayout.add_actor(contentBox);
            
            let topBox = new St.BoxLayout();
            contentBox.add_actor(topBox);
            
            //icon
            let icon;
            if ( metadata.icon ) icon = new St.Icon({ icon_name: metadata.icon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
            else {
                let file = Gio.file_new_for_path(metadata.path + "/icon.png");
                if ( file.query_exists(null) ) {
                    let gicon = new Gio.FileIcon({ file: file });
                    icon = new St.Icon({ gicon: gicon, icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
                else {
                    icon = new St.Icon({ icon_name: "applets", icon_size: 48, icon_type: St.IconType.FULLCOLOR, style_class: "about-icon" });
                }
            }
            topBox.add_actor(icon);
            
            let topTextBox = new St.BoxLayout({ vertical: true });
            topBox.add_actor(topTextBox);
            
            /*title*/
            let titleBox = new St.BoxLayout();
            topTextBox.add_actor(titleBox);
            
            let title = new St.Label({ text: metadata.name, style_class: "about-title" });
            titleBox.add_actor(title);
            
            if ( metadata.version ) {
                let versionBin = new St.Bin({ x_align: St.Align.START, y_align: St.Align.END});
                titleBox.add_actor(versionBin);
                let version = new St.Label({ text: "v " + metadata.version, style_class: "about-version" });
                versionBin.add_actor(version);
            }
            
            //uuid
            let uuid = new St.Label({ text: metadata.uuid, style_class: "about-uuid" });
            topTextBox.add_actor(uuid);
            
            //description
            let desc = new St.Label({ text: metadata.description, style_class: "about-description" });
            let dText = desc.clutter_text;
            topTextBox.add_actor(desc);
            
            /*optional content*/
            let scrollBox = new St.ScrollView({ style_class: "about-scrollBox" });
            contentBox.add(scrollBox, { expand: true });
            scrollBox._delegate = this;
            
            let infoBox = new St.BoxLayout({ vertical: true, style_class: "about-scrollBox-innerBox" });
            scrollBox.add_actor(infoBox);
            
            //comments
            if ( metadata.comments ) {
                let comments = new St.Label({ text: "Comments:\n\t" + metadata.comments });
                let cText = comments.clutter_text;
                cText.ellipsize = Pango.EllipsizeMode.NONE;
                cText.line_wrap = true;
                cText.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                infoBox.add_actor(comments);
            }
            
            //website
            if ( metadata.website ) {
                let wsBox = new St.BoxLayout({ vertical: true });
                infoBox.add_actor(wsBox);
                
                let wLabel = new St.Label({ text: "Website:" });
                wsBox.add_actor(wLabel);
                
                let wsButton = new St.Button({ x_align: St.Align.START, style_class: "cinnamon-link", name: "about-website" });
                wsBox.add_actor(wsButton);
                let website = new St.Label({ text: metadata.website });
                let wtext = website.clutter_text;
                wtext.ellipsize = Pango.EllipsizeMode.NONE;
                wtext.line_wrap = true;
                wtext.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                wsButton.add_actor(website);
                wsButton.connect("clicked", Lang.bind(this, this.launchSite, metadata.website));
            }
            
            //contributors
            if ( metadata.contributors ) {
                let list = metadata.contributors.split(",").join("\n\t");
                let contributors = new St.Label({ text: "Contributors:\n\t" + list });
                infoBox.add_actor(contributors);
            }
            
            //dialog close button
            this.setButtons([
                { label: "Close", key: "", focus: true, action: Lang.bind(this, this._onOk) }
            ]);
            
            this.open(global.get_current_time());
        } catch(e) {
            global.log(e);
        }
    },
    
    _onOk: function() {
        this.close(global.get_current_time());
    },
    
    launchSite: function(a, b, site) {
        Util.spawnCommandLine("xdg-open " + site);
        this.close(global.get_current_time());
    }
}


/************************************************
/widgets
************************************************/
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


/************************************************
/Raised Box
************************************************/
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
    
    add: function(desklet, center) {
        try {
            
            this.desklet = desklet;
            this.settingsMenu = this.desklet.settingsMenu.menu;
            this.contextMenu = this.desklet._menu;
            
            this.groupContent.add_actor(this.desklet.actor);
            
            if ( !center ) {
                let allocation = Cinnamon.util_get_transformed_allocation(desklet.actor);
                let monitor = Main.layoutManager.findMonitorForActor(desklet.actor);
                let x = Math.floor((monitor.width - allocation.x1 - allocation.x2) / 2);
                let y = Math.floor((monitor.height - allocation.y1 - allocation.y2) / 2);
                
                this.actor.set_anchor_point(x,y);
            }
            
            Main.pushModal(this.actor);
            this.actor.show();
            
            //we must capture all events to avoid undesired effects
            this.stageEventIds.push(global.stage.connect("captured-event", Lang.bind(this, this.onStageEvent)));
            this.stageEventIds.push(global.stage.connect("enter-event", Lang.bind(this, this.onStageEvent)));
            this.stageEventIds.push(global.stage.connect("leave-event", Lang.bind(this, this.onStageEvent)));
            this.settingsMenuActivateId = this.settingsMenu.connect("activate", Lang.bind(this, function() {
                this.emit("closed");
            }));
            this.contextMenuActivateId = this.contextMenu.connect("activate", Lang.bind(this, function() {
                this.emit("closed");
            }));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    remove: function() {
        try {
            
            for ( let i = 0; i < this.stageEventIds.length; i++ ) global.stage.disconnect(this.stageEventIds[i]);
            this.settingsMenu.disconnect(this.settingsMenuActivateId);
            this.contextMenu.disconnect(this.contextMenuActivateId);
            
            Main.popModal(this.actor);
            if ( this.desklet ) this.groupContent.remove_actor(this.desklet.actor);
            this.actor.destroy();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onStageEvent: function(actor, event) {
        try {
            
            let type = event.type();
            let target = event.get_source();
            
            if ( type == Clutter.EventType.KEY_PRESS ) {
                //escape lowers the desklet
                if ( event.get_key_symbol() == Clutter.KEY_Escape ) {
                    this.emit("closed");
                    return true;
                }
                return false;
            }
            
            //we don't want to block events that belong to the desklet
            if ( target == this.desklet.actor      || this.desklet.actor.contains(target) ||
                 target == this.settingsMenu.actor || this.settingsMenu.actor.contains(target) ||
                 target == this.contextMenu.actor  || this.contextMenu.actor.contains(target) ) return false;
            
            //lower the desklet if the user clicks anywhere but on the desklet or it
            if ( type == Clutter.EventType.BUTTON_RELEASE ) this.emit("closed");
            
        } catch(e) {
            global.logError(e);
        }
        
        return false;
    }
}
Signals.addSignalMethods(RaisedBox.prototype);


/************************************************
/interfaces
************************************************/
function GenericInterface(canClose) {
    this._init(canClose);
}

GenericInterface.prototype = {
    __proto__: Tab.TabItemBase.prototype,
    
    name: _("Untitled"),
    
    _init: function(canClose) {
        Tab.TabItemBase.prototype._init.call(this, { canClose: canClose });
        
        this.panel = new St.BoxLayout({ style_class: "devtools-panel", vertical: true });
        this.setContent(this.panel);
        
        this.setTabContent(new St.Label({ text: this.name }));
    },
    
    _formatTime: function(d) {
        function pad(n) { return n < 10 ? "0" + n : n; }
        return (d.getMonth()+1)+"/"
            + pad(d.getDate())+" "
            + (d.getHours())+":"
            + pad(d.getMinutes())+":"
            + pad(d.getSeconds())+"  ";
    }
}


function myDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

myDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    
    _init: function(metadata, desklet_id) {
        try {
            
            Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);
            
            this.isLoaded = false;
            
            Gtk.IconTheme.get_default().append_search_path(this.metadata.path + "/buttons/");
            this._bindSettings();
            
            //this.interfaces = initializeInterfaces();
            this.buildLayout();
            
            this._menu.addAction(_("About..."), Lang.bind(this, this.openAbout));
            
            this.setHeader(_("Tools"));
            
            this.actor.connect("motion-event", Lang.bind(this, this.onMotionEvent));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    on_desklet_added_to_desktop: function() {
        if ( !this.isLoaded ) {
            this.tabManager.selectIndex(0);
            this.isLoaded = true;
        }
    },
    
    openAbout: function() {
        new AboutDialog(this.metadata);
    },
    
    _bindSettings: function() {
        this.settings = new Settings.DeskletSettings(this, this.metadata.uuid, this.instance_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "lgOpen", "lgOpen", function() {});
        this.settings.bindProperty(Settings.BindingDirection.IN, "collapsedStartState", "collapsedStartState", function() {});
        this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL, "collapsed", "collapsed", this.setHideState);
        this.settings.bindProperty(Settings.BindingDirection.IN, "raiseKey", "raiseKey", this.bindKey);
        this.settings.bindProperty(Settings.BindingDirection.IN, "centerRaised", "centerRaised");
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", function() {
            this.contentArea.height = this.height;
        });
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", function() {
            this.contentArea.width = this.width;
        });
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
        
        this._draggable.inhibit = true;
        this.raisedBox = new RaisedBox();
        
        let position = this.actor.get_position();
        this.actor.get_parent().remove_actor(this.actor);
        this.raisedBox.add(this, this.centerRaised);
        
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
    
    buildLayout: function() {
        try {
            
            if ( this.mainBox ) this.mainBox.destroy();
            
            this.mainBox = new St.BoxLayout({ vertical: true, style_class: "devtools-mainBox" });
            this.setContent(this.mainBox);
            
            //top button area
            this.buttonArea = new St.BoxLayout({ vertical: false, style_class: "devtools-buttonArea" });
            this.mainBox.add_actor(this.buttonArea);
            this.addButtons();
            
            //tabs
            this.contentArea = new St.BoxLayout({ height: this.height, width: this.width, vertical: true });
            this.mainBox.add(this.contentArea, { expand: true });
            if ( this.collapsed ) this.contentArea.hide();
            this.panelBox = new St.BoxLayout({ vertical: true, style_class: "devtools-tabPanels" });
            this.contentArea.add(this.panelBox, { expand: true });
            this.tabBox = new St.BoxLayout({ style_class: "devtools-tabBox", vertical: false });
            this.contentArea.add(this.tabBox);
            this.tabManager = new Tab.TabManager(this.tabBox, this.panelBox);
            
            this.addDefaultTabs();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    addButtons: function() {
        //collapse button
        this.collapseButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(this.collapseButton);
        let text, name;
        if ( this.collapsed ) {
            name = "closed";
            text = _("Expand");
        }
        else {
            name = "open";
            text = _("Collapse");
        }
        
        this.collapseIcon = new St.Icon({ icon_name: name, icon_type: St.IconType.SYMBOLIC, icon_size: 12 });
        this.collapseButton.set_child(this.collapseIcon);
        this.collapseButton.connect("clicked", Lang.bind(this, this.toggleCollapse));
        this.collapseTooltip = new Tooltips.Tooltip(this.collapseButton, text);
        
        if ( this.collapsedStartState == 1 ) this.collapsed = false;
        else if ( this.collapsedStartState == 2 ) this.collapsed = true;
        
        let paddingBox = new St.Bin({ min_width: 15 });
        this.buttonArea.add(paddingBox, { expand: true });
        
        //cinnamon settings menu
        let settingsMenuIcon = new St.Icon({ icon_name: "settings", icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        this.settingsMenu = new Menu(settingsMenuIcon, _("Cinnamon Settings"), "devtools-button");
        this.buttonArea.add_actor(this.settingsMenu.actor);
        this._populateSettingsMenu();
        
        //sandbox button
        let sandboxButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(sandboxButton);
        let sandboxIcon = new St.Icon({ icon_name: "sandbox", icon_size: 20, icon_type: St.IconType.SYMBOLIC });
        sandboxButton.set_child(sandboxIcon);
        sandboxButton.connect("clicked", Lang.bind(this, this.newSandbox));
        new Tooltips.Tooltip(sandboxButton, _("Start Sandbox"));
        
        //terminal button
        let terminalButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(terminalButton);
        let terminalIcon = new St.Icon({ icon_name: "run", icon_size: 20, icon_type: St.IconType.SYMBOLIC });
        terminalButton.set_child(terminalIcon);
        terminalButton.connect("clicked", Lang.bind(this, this.newTerminal));
        new Tooltips.Tooltip(terminalButton, _("Run command line"));
        
        //inspect button
        let inspectButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(inspectButton);
        let inspectIcon = new St.Icon({ icon_name: "inspect", icon_size: 20, icon_type: St.IconType.SYMBOLIC });
        inspectButton.set_child(inspectIcon);
        inspectButton.connect("clicked", Lang.bind(this, this.openInspector));
        new Tooltips.Tooltip(inspectButton, _("Inspect"));
        
        //open looking glass button
        let lgButton = new St.Button({ style_class: "devtools-button" });
        let lgIcon = new St.Icon({ icon_name: "lookingglass", icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        lgButton.set_child(lgIcon);
        this.buttonArea.add_actor(lgButton);
        lgButton.connect("clicked", Lang.bind(this, this.launchLookingGlass));
        new Tooltips.Tooltip(lgButton, _("Open Looking Glass"));
        
        //reload theme button
        let rtButton = new St.Button({ style_class: "devtools-button" });
        let rtIcon = new St.Icon({ icon_name: "theme", icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        rtButton.set_child(rtIcon);
        this.buttonArea.add_actor(rtButton);
        rtButton.connect("clicked", Lang.bind(this, function() {
            Main.loadTheme();
        }));
        new Tooltips.Tooltip(rtButton, _("Reload Theme"));
        
        //restart button
        let restartButton = new St.Button({ style_class: "devtools-button" });
        let restartIcon = new St.Icon({ icon_name: "restart", icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        restartButton.set_child(restartIcon);
        this.buttonArea.add_actor(restartButton);
        restartButton.connect("clicked", Lang.bind(this, function() {
            global.reexec_self();
        }));
        new Tooltips.Tooltip(restartButton, _("Restart Cinnamon"));
    },
    
    addDefaultTabs: function() {
        let cLog = new ErrorLog.CinnamonLogInterface(this.settings);
        this.tabManager.add(cLog);
        let xLog = new ErrorLog.XSessionLogInterface(this.settings);
        this.tabManager.add(xLog);
        let applets = new Extensions.ExtensionInterface(null, "Applets", Extension.Type.APPLET);
        this.tabManager.add(applets);
        let desklets = new Extensions.ExtensionInterface(null, "Desklets", Extension.Type.DESKLET);
        this.tabManager.add(desklets);
        let extensions = new Extensions.ExtensionInterface(null, "Extensions", Extension.Type.EXTENSION);
        this.tabManager.add(extensions);
        let windows = new Windows.WindowInterface();
        this.tabManager.add(windows);
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
                             new St.Icon({ icon_name: "cs-" + SETTINGS_PAGES[i].page, icon_size: POPUP_MENU_ICON_SIZE, icon_type: St.IconType.FULLCOLOR }));
        }
    },
    
    newTerminal: function() {
        let terminal = new Terminal.TerminalInterface();
        this.tabManager.add(terminal);
        this.tabManager.selectItem(terminal);
        if ( this.collapsed ) this.toggleCollapse();
    },
    
    newSandbox: function() {
        let sandbox = new Sandbox.SandboxInterface();
        this.tabManager.add(sandbox);
        this.tabManager.selectItem(sandbox);
        if ( this.collapsed ) this.toggleCollapse();
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
    
    openInspector: function() {
        this.lower();
        
        let inspector = new Inspect.Inspector();
        
        inspector.connect("target", Lang.bind(this, function(inspector, target) {
            this.inspect(target);
        }));
    },
    
    inspect: function(target) {
        let iface = new Inspect.InspectInterface(target, this);
        this.tabManager.add(iface);
        this.tabManager.selectItem(iface);
        if ( this.collapsed ) this.toggleCollapse();
    },
    
    setHideState: function(event) {
        let name;
        if ( this.collapsed ) {
            name = "closed";
            this.collapseTooltip.set_text(_("Expand"));
            this.panelBox.hide();
            this.tabBox.hide();
            Tweener.addTween(this.contentArea, {
                time: .25,
                width: 0,
                height: 0,
                onCompleteScope: this,
                onComplete: function() {
                    this.contentArea.hide();
                    this.panelBox.show();
                    this.tabBox.show();
                }
            });
        }
        else {
            name = "open";
            this.collapseTooltip.set_text(_("Collapse"));
            this.contentArea.height = 0;
            this.contentArea.width = 0;
            this.panelBox.hide();
            this.tabBox.hide();
            this.contentArea.show();
            Tweener.addTween(this.contentArea, {
                time: .25,
                width: this.width,
                onCompleteScope: this,
                onComplete: function() {
                    Tweener.addTween(this.contentArea, {
                        time: 1,
                        height: this.height,
                        onCompleteScope: this,
                        onComplete: function() {
                            this.panelBox.show();
                            this.tabBox.show();
                        }
                    });
                }
            });
        }
        this.collapseIcon.icon_name = name;
    },
    
    toggleCollapse: function() {
        this.collapsed = !this.collapsed;
        this.setHideState();
    },
    
    onMotionEvent: function(a, event) {
        let target = event.get_source();
        if ( target && target._delegate && target._delegate instanceof Text.Entry ) {
            this._draggable.inhibit = true;
        }
        else this._draggable.inhibit = false;
    }
}


function main(metadata, desklet_id) {
    let desklet = new myDesklet(metadata, desklet_id);
    return desklet;
}