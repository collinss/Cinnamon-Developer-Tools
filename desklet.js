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

//global constants
const POPUP_MENU_ICON_SIZE = 24;
const CINNAMON_LOG_REFRESH_TIMEOUT = 1;
const XSESSION_LOG_REFRESH_TIMEOUT = 10;

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
let button_base_path;
let command_output_start_state;
let xsession_hide_old;
let desklet_raised = false;


function initializeInterfaces() {
    return [
        new CinnamonLogInterface(),
        new XSessionLogInterface(),
        new TerminalInterface(),
        new ExtensionInterface(null, "Applets", Extension.Type.APPLET),
        new ExtensionInterface(null, "Desklets", Extension.Type.DESKLET),
        new ExtensionInterface(null, "Extensions", Extension.Type.EXTENSION),
        new WindowInterface()
    ];
}

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
function CollapseButton(label, startState, child) {
    this._init(label, startState, child);
}

CollapseButton.prototype = {
    _init: function(label, startState, child) {
        this.state = startState;
        
        this.actor = new St.BoxLayout({ vertical: true });
        
        let button = new St.Button({ x_align: St.Align.START, x_expand: false, x_fill: false, style_class: "devtools-contentButton" });
        this.actor.add_actor(button);
        let buttonBox = new St.BoxLayout();
        button.set_child(buttonBox);
        buttonBox.add_actor(new St.Label({ text: label }));
        
        this.arrowIcon = new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 8, style: "padding: 4px;" });
        buttonBox.add_actor(this.arrowIcon);
        
        this.childBin = new St.Bin({ x_align: St.Align.START, visible: startState });
        this.actor.add_actor(this.childBin);
        if ( child ) this.childBin.set_child(child);
        
        this._updateState();
        
        button.connect("clicked", Lang.bind(this, this.toggleState));
    },
    
    setChild: function(child) {
        this.childBin.set_child(child);
    },
    
    toggleState: function() {
        if ( this.state ) this.state = false;
        else this.state = true;
        this._updateState();
    },
    
    _updateState: function() {
        let path;
        if ( this.state ) {
            this.childBin.show();
            path = button_base_path + "open-symbolic.svg";
        }
        else {
            this.childBin.hide();
            path = button_base_path + "closed-symbolic.svg";
        }
        let file = Gio.file_new_for_path(path);
        let gicon = new Gio.FileIcon({ file: file });
        this.arrowIcon.gicon = gicon;
    }
}


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


function ExtensionItem(meta, type) {
    this._init(meta, type);
}

ExtensionItem.prototype = {
    _init: function(meta, type) {
        try {
            this.meta = meta;
            this.type = type;
            let extensionObjs = Extension.objects[meta.uuid]._loadedDefinitions;
            this.instances = [];
            for( let id in extensionObjs ) this.instances.push(extensionObjs[id]);
            
            this.actor = new St.BoxLayout({ style_class: "devtools-extension-container" });
            
            /*icon*/
            let icon;
            if ( meta.icon ) icon = new St.Icon({ icon_name: meta.icon, icon_size: 48, icon_type: St.IconType.FULLCOLOR });
            else {
                let file = Gio.file_new_for_path(meta.path + "/icon.png");
                if ( file.query_exists(null) ) {
                    let gicon = new Gio.FileIcon({ file: file });
                    icon = new St.Icon({ gicon: gicon, icon_size: 48, icon_type: St.IconType.FULLCOLOR });
                }
                else {
                    icon = new St.Icon({ icon_name: "applets", icon_size: 48, icon_type: St.IconType.FULLCOLOR });
                }
            }
            this.actor.add_actor(icon);
            
            /*info*/
            let infoBox = new St.BoxLayout({ vertical: true });
            this.actor.add(infoBox, { expand: true });
            let table = new St.Table({ homogeneous: false, clip_to_allocation: true });
            infoBox.add(table, { y_align: St.Align.MIDDLE, y_expand: false });
            
            //name
            table.add(new St.Label({ text: "Name:   " }), { row: 0, col: 0, col_span: 1,  x_expand: false, x_align: St.Align.START });
            let name = new St.Label({ text: meta.name+" ("+meta.uuid+")" });
            table.add(name, { row: 0, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            //description
            table.add(new St.Label({ text: "Description:   " }), { row: 1, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            let description = new St.Label({ text: "" });
            table.add(description, { row: 1, col: 1, col_span: 1, y_expand: true, x_expand: false, x_align: St.Align.START });
            description.set_text(meta.description);
            
            //status
            table.add(new St.Label({ text: "Status:   " }), { row: 2, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            let status = new St.Label({ text: Extension.getMetaStateString(meta.state) });
            table.add(status, { row: 2, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            /*extension options*/
            let buttonBox = new St.BoxLayout({ vertical:true, style_class: "devtools-extension-buttonBox" });
            this.actor.add_actor(buttonBox);
            
            //reload
            let reloadButton = new St.Button({ label: "Reload", x_align: St.Align.END, style_class: "devtools-contentButton" });
            buttonBox.add_actor(reloadButton);
            reloadButton.connect("clicked", Lang.bind(this, this.reload));
            
            //remove
            let removeButton = new St.Button({ label: "Remove", x_align: St.Align.END, style_class: "devtools-contentButton" });
            buttonBox.add_actor(removeButton);
            removeButton.connect("clicked", Lang.bind(this, this.removeAll));
            
            /*check for multi-instance*/
            if ( meta["max-instances"] && meta["max-instances"] > 1 ) {
                let instanceDropdown = new CollapseButton("Instances: "+this.instances.length+" of "+meta["max-instances"], false, null);
                table.add(instanceDropdown.actor, { row: 3, col: 0, col_span: 2, x_expand: false, x_align: St.Align.START });
                
                let instancesContainer = new St.BoxLayout({ vertical: true });
                instanceDropdown.setChild(instancesContainer);
                
                for ( let i = 0; i < this.instances.length; i++ ) {
                    let instance = this.instances[i];
                    let id;
                    if ( type == Extension.Type.APPLET ) id = instance.applet_id;
                    else id = instance.desklet_id;
                    
                    let instanceBox = new St.BoxLayout({ style_class: "devtools-extension-instanceBox" });
                    instancesContainer.add_actor(instanceBox);
                    
                    instanceBox.add_actor(new St.Label({ text: "ID: "+id }));
                    
                    //highlight button
                    let highlightButton = new St.Button({ label: "Highlight" });
                    instanceBox.add_actor(highlightButton);
                    highlightButton.connect("clicked", Lang.bind(this, function() { this.highlight(id, true); }));
                    
                    //remove button
                    let removeButton = new St.Button({ label: "Remove" });
                    instanceBox.add_actor(removeButton);
                    removeButton.connect("clicked", Lang.bind(this, function() { this.remove(id); }));
                }
            }
            else {
                //highlight button
                if ( this.type == Extension.Type.APPLET || this.type == Extension.Type.DESKLET ) {
                    let highlightButton = new St.Button({ label: "Highlight", x_align: St.Align.END });
                    buttonBox.add_actor(highlightButton);
                    highlightButton.connect("clicked", Lang.bind(this, function() { this.highlight(meta.uuid, false); }));
                }
            }
            
            //link to settings
            if ( !meta["hide-configuration"] && GLib.file_test(meta.path + "/settings-schema.json", GLib.FileTest.EXISTS)) {
                let settingsButton = new St.Button({ label: "Settings", x_align: St.Align.END, style_class: "devtools-contentButton" });
                buttonBox.add_actor(settingsButton);
                settingsButton.connect("clicked", Lang.bind(this, function() {
                    Util.spawnCommandLine("cinnamon-settings applets " + meta.uuid);
                }));
            }
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    reload: function() {
        Extension.unloadExtension(this.meta.uuid);
        Extension.loadExtension(this.meta.uuid, this.type);
    },
    
    remove: function(id) {
        switch ( this.type ) {
            case Extension.Type.APPLET:
                AppletManager._removeAppletFromPanel(null, null, null, this.meta.uuid, id);
                break;
            case Extension.Type.DESKLET:
                DeskletManager.removeDesklet(this.meta.uuid, id);
                break;
            case Extension.Type.EXTENSION:
                Extension.unloadExtension(meta.uuid);
                break;
        }
    },
    
    removeAll: function() {
        for ( let i = 0; i < this.instances.length; i++ ) {
            let instance = this.instances[i];
            let id;
            if ( this.type == Extension.Type.APPLET ) id = instance.applet_id;
            else id = instance.desklet_id;
            this.remove(id);
        }
    },
    
    highlight: function(id, isInstance) {
        let obj = null;
        if ( isInstance ) {
            if ( this.type == Extension.Type.APPLET ) obj = AppletManager.get_object_for_instance(id);
            else obj = DeskletManager.get_object_for_instance(id)
        }
        else {
            if ( this.type == Extension.Type.APPLET )obj = AppletManager.get_object_for_uuid(id)
            else obj = DeskletManager.get_object_for_uuid(id)
        }
        if ( !obj ) return;
        
        let actor = obj.actor;
        if ( !actor ) return;
        
        let [x, y] = actor.get_transformed_position();
        let [w, h] = actor.get_transformed_size();
        
        let flashspot = new Flashspot.Flashspot({ x : x, y : y, width: w, height: h });
        flashspot.fire();
    }
}


function WindowItem(window) {
    this._init(window);
}

WindowItem.prototype = {
    _init: function(window) {
        try {
            
            this.window = window;
            this.app = Cinnamon.WindowTracker.get_default().get_window_app(this.window);
            let wsName = this.getWorkspace();
            
            this.window.connect("unmanaged", Lang.bind(this, this.destroy));
            
            this.actor = new St.BoxLayout({ style_class: "devtools-windows-windowBox" });
            
            /*icon*/
            let iconBin = new St.Bin({ style_class: "devtools-windows-icon" });
            this.actor.add_actor(iconBin);
            let icon = this.getIcon();
            iconBin.set_child(icon);
            
            /*info*/
            let infoBox = new St.BoxLayout({ vertical: true });
            this.actor.add(infoBox, { expand: true });
            let table = new St.Table({ homogeneous: false, clip_to_allocation: true });
            infoBox.add(table, { y_align: St.Align.MIDDLE, y_expand: false });
            
            //window title
            table.add(new St.Label({ text: "Title:   " }), { row: 0, col: 0, col_span: 1,  x_expand: false, x_align: St.Align.START });
            let title = new St.Label({ text: window.title, style_class: "devtools-windows-title" });
            table.add(title, { row: 0, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            //window class
            table.add(new St.Label({ text: "Class:   " }), { row: 1, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            let wmClass = new St.Label({ text: window.get_wm_class() });
            table.add(wmClass, { row: 1, col: 1, col_span: 1, y_expand: true, x_expand: false, x_align: St.Align.START });
            
            //workspace
            table.add(new St.Label({ text: "Workspace:   " }), { row: 2, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
            let workspace = new St.Label({ text: wsName });
            table.add(workspace, { row: 2, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
            
            /*window options*/
            let buttonBox = new St.BoxLayout({ vertical: true, style_class: "devtools-windows-buttonBox" });
            this.actor.add_actor(buttonBox);
            
            //inspect window
            let inspectButton = new St.Button({ label: "Inspect", x_align: St.Align.END, style_class: "devtools-contentButton" });
            buttonBox.add_actor(inspectButton);
            inspectButton.connect("clicked", Lang.bind(this, this.inspect));
            
            //switch to
            if ( this.workspace ) {
                let switchToButton = new St.Button({ label: "Switch to", x_align: St.Align.END, style_class: "devtools-contentButton" });
                buttonBox.add_actor(switchToButton);
                switchToButton.connect("clicked", Lang.bind(this, this.switchTo));
            }
            
            //close
            let closeButton = new St.Button({ label: "Close", x_align: St.Align.END, style_class: "devtools-contentButton" });
            buttonBox.add_actor(closeButton);
            closeButton.connect("clicked", Lang.bind(this, this.close));
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    destroy: function() {
        this.actor.destroy();
    },
    
    getIcon: function() {
        if ( this.window.title == "Desktop" ) return new St.Icon({ icon_name: "desktop", icon_size: 48, icon_type: St.IconType.FULLCOLOR });
        if ( this.app != null ) return this.app.create_icon_texture(48);
        else return new St.Icon({ icon_name: "application-default-icon", icon_size: 48, icon_type: St.IconType.FULLCOLOR });
    },
    
    getWorkspace: function() {
        if ( this.window.is_on_all_workspaces() ) {
            this.workspace = "all";
            return "All";
        }
        
        for ( let wsId = 0; wsId < global.screen.n_workspaces; wsId++ ) {
            let name = Main.getWorkspaceName(wsId);
            let wsMeta = global.screen.get_workspace_by_index(wsId);
            if ( wsMeta.list_windows().indexOf(this.window) != -1 ) {
                this.workspace = wsMeta;
                return name;
            }
        }
        
        return "none";
    },
    
    inspect: function() {
        Main.createLookingGlass().open();
        Main.lookingGlass.inspectObject(this.app);
    },
    
    switchTo: function() {
        if ( !this.workspace ) return;
        if ( this.workspace != "all" ) this.workspace.activate(global.get_current_time());
        this.window.unminimize(global.get_current_time());
        this.window.activate(global.get_current_time());
    },
    
    close: function() {
        this.window.delete(global.get_current_time());
    }
}


function CommandItem(command, pId, inId, outId, errId, output) {
    this._init(command, pId, inId, outId, errId, output);
}

CommandItem.prototype = {
    _init: function(command, pId, inId, outId, errId) {
        this.pId = pId;
        this.inId = inId;
        this.outId = outId;
        this.errId = errId;
        
        this.actor = new St.BoxLayout({ vertical: true, style_class: "devtools-terminal-processBox" });
        
        /**header**/
        let headerBox = new St.BoxLayout();
        this.actor.add_actor(headerBox);
        
        /*info*/
        let infoBox = new St.BoxLayout({ vertical: true });
        headerBox.add(infoBox, { expand: true });
        let table = new St.Table({ homogeneous: false, clip_to_allocation: true });
        infoBox.add(table, { y_align: St.Align.MIDDLE, y_expand: false });
        
        //command
        table.add(new St.Label({ text: "Command:   " }), { row: 0, col: 0, col_span: 1,  x_expand: false, x_align: St.Align.START });
        let commandLabel = new St.Label({ text: command });
        table.add(commandLabel, { row: 0, col: 1, col_span: 1, x_expand: false, x_align: St.Align.START });
        
        //status
        table.add(new St.Label({ text: "Status:   " }), { row: 1, col: 0, col_span: 1, x_expand: false, x_align: St.Align.START });
        this.status = new St.Label({ text: "Running" });
        table.add(this.status, { row: 1, col: 1, col_span: 1, y_expand: true, x_expand: false, x_align: St.Align.START });
        
        /*command options*/
        let buttonBox = new St.BoxLayout({ vertical: true });
        headerBox.add_actor(buttonBox);
        
        //clear button
        let clearButton = new St.Button({ label: "Clear", x_align: St.Align.END, style_class: "devtools-contentButton" });
        buttonBox.add_actor(clearButton);
        clearButton.connect("clicked", Lang.bind(this, this.clear));
        
        //end process button
        this.stopButton = new St.Button({ label: "End Process", x_align: St.Align.END, style_class: "devtools-contentButton" });
        buttonBox.add_actor(this.stopButton);
        this.stopButton.connect("clicked", Lang.bind(this, this.endProcess));
        
        /*output*/
        //output toggle
        let toggleBox = new St.BoxLayout();
        this.actor.add_actor(toggleBox);
        this.showOutput = command_output_start_state;
        let outputButton = new CollapseButton("Output", command_output_start_state);
        toggleBox.add_actor(outputButton.actor);
        
        //output
        this.output = new St.Label();
        outputButton.setChild(this.output);
        this.output.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.output.clutter_text.line_wrap = true;
        
        /*open streams and start reading*/
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
    }
}


/************************************************
/Terminal
************************************************/
function Terminal() {
    this._init();
}

Terminal.prototype = {
    _init: function() {
        
        this.processes = [];
        
        this.actor = new St.BoxLayout({ vertical: true });
        
        this.input = new St.Entry({ style_class: "devtools-terminal-entry", track_hover: false, can_focus: true });
        this.actor.add_actor(this.input);
        this.input.set_name("terminalInput");
        
        let scrollBox = new St.ScrollView();
        this.actor.add_actor(scrollBox);
        
        this.output = new St.BoxLayout({ vertical: true, style_class: "devtools-terminal-processMainBox" });
        scrollBox.add_actor(this.output);
        
        this.input.clutter_text.connect("button_press_event", Lang.bind(this, this.enter));
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
            
            let command = new CommandItem(input, pId, inId, outId, errId);
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
    
    enter: function() {
        if ( !desklet_raised ) {
            global.set_stage_input_mode(Cinnamon.StageInputMode.FOCUSED);
            this.input.grab_key_focus();
            global.set_stage_input_mode(Cinnamon.StageInputMode.NORMAL);
        }
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
        
        let scrollBox = new St.ScrollView();
        this.panel.add_actor(scrollBox);
        
        this.windowsBox = new St.BoxLayout({ vertical: true, style_class: "devtools-windows-mainBox" });
        scrollBox.add_actor(this.windowsBox);
        
    },
    
    refresh: function() {
        if ( !this.selected ) return;
        
        for ( let i = 0; i < this.windowObjects.length; i++ ) {
            this.windowObjects[i].destroy();
        }
        this.windowsBox.destroy_all_children();
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
            
            let windowBox = new WindowItem(window);
            this.windowsBox.add_actor(windowBox.actor);
            this.windowObjects.push(windowBox);
            hasChild = true;
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
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    reload: function() {
        try {
            if ( !this.selected ) return;
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
                
                let extension = new ExtensionItem(meta, this.info);
                this.extensionBox.add_actor(extension.actor);
                
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


function SandboxInterface() {
    this._init();
}

SandboxInterface.prototype = {
    __proto__: GenericInterface.prototype,
    
    name: _("Sandbox"),
    
    _init: function() {
        GenericInterface.prototype._init.call(this, true);
        
        let tabs = new St.BoxLayout({ style_class: "devtools-sandbox-tabs" });
        this.panel.add_actor(tabs);
        let tabPanels = new St.BoxLayout({ height: 120, style_class: "devtools-sandbox-tabpanels" });
        this.panel.add_actor(tabPanels);
        this.tabManager = new Tab.TabManager(tabs, tabPanels);
        
        //javascript
        let jsTab = new Tab.TabItemBase();
        this.tabManager.add(jsTab);
        jsTab.setTabContent(new St.Label({ text: "Javascript" }));
        
        let javascriptScrollBox = new St.ScrollView({ style_class: "devtools-sandbox-scrollBox" });
        jsTab.setContent(javascriptScrollBox);
        javascriptScrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        
        let jsBox = new St.BoxLayout({ vertical: true });
        javascriptScrollBox.add_actor(jsBox);
        let padding = new St.Bin({ reactive: true });
        jsBox.add(padding, { y_expand: true, y_fill: true, x_expand: true, x_fill: true });
        
        this.javascript = new St.Entry({ track_hover: false, can_focus: true, style_class: "devtools-sandbox-entry" });
        jsBox.add_actor(this.javascript);
        this.javascript.set_clip_to_allocation(false);
        this.javascript.clutter_text.set_single_line_mode(false);
        this.javascript.clutter_text.set_activatable(false);
        this.javascript.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.javascript.clutter_text.line_wrap = true;
        this.javascript.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        
        this.javascript.clutter_text.connect("button_press_event", Lang.bind(this, this.enter, this.javascript));
        javascriptScrollBox.connect("button_press_event", Lang.bind(this, this.enter, this.javascript));
        
        //css
        let cssTab = new Tab.TabItemBase();
        this.tabManager.add(cssTab);
        cssTab.setTabContent(new St.Label({ text: "CSS" }));
        
        let styleScrollBox = new St.ScrollView({ style_class: "devtools-sandbox-scrollBox" });
        cssTab.setContent(styleScrollBox);
        styleScrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        
        let cssBox = new St.BoxLayout({ vertical: true });
        styleScrollBox.add_actor(cssBox);
        let padding = new St.Bin({ reactive: true });
        cssBox.add(padding, { y_expand: true, y_fill: true, x_expand: true, x_fill: true });
        
        this.styleSheet = new St.Entry({ track_hover: false, can_focus: true, style_class: "devtools-sandbox-entry" });
        cssBox.add_actor(this.styleSheet);
        this.styleSheet.set_clip_to_allocation(false);
        this.styleSheet.clutter_text.set_single_line_mode(false);
        this.styleSheet.clutter_text.set_activatable(false);
        this.styleSheet.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.styleSheet.clutter_text.line_wrap = true;
        this.styleSheet.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        
        this.styleSheet.clutter_text.connect("button_press_event", Lang.bind(this, this.enter, this.styleSheet));
        styleScrollBox.connect("button_press_event", Lang.bind(this, this.enter, this.styleSheet));
        
        this.tabManager.selectIndex(0);
        
        //button controls
        let buttonBox = new St.BoxLayout({ style_class: "devtools-sandbox-buttonBox" });
        this.panel.add_actor(buttonBox);
        let evaluateButton = new St.Button({ label: "Evaluate", style_class: "devtools-button" });
        buttonBox.add_actor(evaluateButton);
        evaluateButton.connect("clicked", Lang.bind(this, this.evaluate));
        
        //sandbox preview
        this.previewer = new St.Bin({ style_class: "devtools-sandbox-previewer" });
        this.panel.add(this.previewer, { expand: true });
    },
    
    evaluate: function() {
        this.previewer.destroy_all_children();
        
        let jsText = this.javascript.text;
        let actor;
        try {
            let sandboxCode = new Function(jsText);
            actor = sandboxCode();
            if ( actor && actor instanceof Clutter.Actor ) {
                this.previewer.add_actor(actor);
                
                let cssText = this.styleSheet.text;
                if ( cssText != "" ) {
                    try {
                        let cssTemp = Gio.file_new_for_path(".temp.css");
                        
                        let fstream = cssTemp.replace(null, false, Gio.FileCreateFlags.NONE, null);
                        let dstream = new Gio.DataOutputStream({ base_stream: fstream });
                        
                        dstream.put_string(cssText, null);
                        fstream.close(null);
                        
                        let sanboxTheme = new St.Theme();
                        sanboxTheme.load_stylesheet(cssTemp.get_path());
                        actor.set_theme(sanboxTheme);
                        
                    } catch(e) {
                        throw e;
                    }
                }
            }
            else throw String(actor) + " is not an actor";
        } catch(e) {
            this.previewer.add_actor(new St.Label({ text: String(e) }));
        }
    },
    
    enter: function(actor, event, entry) {
        if ( desklet_raised ) {
            if ( actor != entry ) entry.grab_key_focus();
        }
        else {
            global.set_stage_input_mode(Cinnamon.StageInputMode.FOCUSED);
            entry.grab_key_focus();
            global.set_stage_input_mode(Cinnamon.StageInputMode.NORMAL);
        }
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
            
            button_base_path = this.metadata.path + "/buttons/";
            this._bindSettings();
            
            this.interfaces = initializeInterfaces();
            this.buildLayout();
            
            this._menu.addAction(_("About..."), Lang.bind(this, this.openAbout));
            
            this.setHeader(_("Tools"));
            
        } catch(e) {
            global.logError(e);
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
        this.settings.bindProperty(Settings.BindingDirection.IN, "terminalOutputShow", "terminalOutputShow", function() {
            command_output_start_state = this.terminalOutputShow;
        });
        command_output_start_state = this.terminalOutputShow;
        this.settings.bindProperty(Settings.BindingDirection.IN, "xsessionHideOld", "xsessionHideOld", function() {
            xsession_hide_old = this.xsessionHideOld;
        });
        xsession_hide_old = this.xsessionHideOld;
        this.settings.bindProperty(Settings.BindingDirection.IN, "raiseKey", "raiseKey", this.bindKey);
        this.settings.bindProperty(Settings.BindingDirection.IN, "centerRaised", "centerRaised");
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", this.buildLayout);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", this.buildLayout);
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
            
            this.addContent();
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    addButtons: function() {
        //collapse button
        this.collapseButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(this.collapseButton);
        let file, text;
        if ( this.collapsed ) {
            file = Gio.file_new_for_path(button_base_path + "add-symbolic.svg");
            text = _("Expand");
        }
        else {
            file = Gio.file_new_for_path(button_base_path + "remove-symbolic.svg");
            text = _("Collapse");
        }
        let gicon = new Gio.FileIcon({ file: file });
        
        this.collapseIcon = new St.Icon({ gicon: gicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        this.collapseButton.set_child(this.collapseIcon);
        this.collapseButton.connect("clicked", Lang.bind(this, this.toggleCollapse));
        this.collapseTooltip = new Tooltips.Tooltip(this.collapseButton, text);
        
        if ( this.collapsedStartState == 1 ) this.collapsed = false;
        else if ( this.collapsedStartState == 2 ) this.collapsed = true;
        
        let paddingBox = new St.Bin({ min_width: 15 });
        this.buttonArea.add(paddingBox, { expand: true });
        
        //cinnamon settings menu
        let setIFile = Gio.file_new_for_path(button_base_path + "settings-symbolic.svg");
        let setIGicon = new Gio.FileIcon({ file: setIFile });
        let settingsMenuIcon = new St.Icon({ gicon: setIGicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        this.settingsMenu = new Menu(settingsMenuIcon, _("Cinnamon Settings"), "devtools-button");
        this.buttonArea.add_actor(this.settingsMenu.actor);
        this._populateSettingsMenu();
        
        //sandbox button
        let sandboxButton = new St.Button({ style_class: "devtools-button" });
        this.buttonArea.add_actor(sandboxButton);
        let sandIFile = Gio.file_new_for_path(button_base_path + "sandbox-symbolic.svg");
        let sandIGicon = new Gio.FileIcon({ file: sandIFile });
        let sandboxIcon = new St.Icon({ gicon: sandIGicon, icon_size: 20, icon_type: St.IconType.SYMBOLIC });
        sandboxButton.set_child(sandboxIcon);
        sandboxButton.connect("clicked", Lang.bind(this, this.newSandbox));
        new Tooltips.Tooltip(sandboxButton, _("Start Sandbox"));
        
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
        
        //reload theme button
        let rtButton = new St.Button({ style_class: "devtools-button" });
        let rtIFile = Gio.file_new_for_path(button_base_path + "theme-symbolic.svg");
        let rtIGicon = new Gio.FileIcon({ file: rtIFile });
        let rtIcon = new St.Icon({ gicon: rtIGicon, icon_type: St.IconType.SYMBOLIC, icon_size: "20" });
        rtButton.set_child(rtIcon);
        this.buttonArea.add_actor(rtButton);
        rtButton.connect("clicked", Lang.bind(this, function() {
            Main.loadTheme();
        }));
        new Tooltips.Tooltip(rtButton, _("Reload Theme"));
        
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
        for ( let i in this.interfaces ) {
            try {
                this.tabManager.add(this.interfaces[i]);
            } catch(e) {
                global.logError(e);
            }
        }
        this.tabManager.selectIndex(0);
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
    
    newSandbox: function() {
        let sandbox = new SandboxInterface();
        this.interfaces.push(sandbox);
        this.tabManager.add(sandbox);
        this.tabManager.selectItem(sandbox);
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
    
    setHideState: function(event) {
        let file;
        if ( this.collapsed ) {
            file = Gio.file_new_for_path(button_base_path + "add-symbolic.svg");
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
            file = Gio.file_new_for_path(button_base_path + "remove-symbolic.svg");
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