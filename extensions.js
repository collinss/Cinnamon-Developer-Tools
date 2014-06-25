const AppletManager = imports.ui.appletManager;
const Desklet = imports.ui.desklet;
const DeskletManager = imports.ui.deskletManager;
const Extension = imports.ui.extension;
const Flashspot = imports.ui.flashspot;
const PopupMenu = imports.ui.popupMenu;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Interfaces = imports.interfaces;


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
            this.arrowIcon.icon_name = "open";
        }
        else {
            this.childBin.hide();
            this.arrowIcon.icon_name = "closed";
        }
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


function ExtensionInterface(parent, name, info) {
    this._init(parent, name, info);
}

ExtensionInterface.prototype = {
    __proto__: Interfaces.GenericInterface.prototype,
    
    _init: function(parent, name, info) {
        try {
            
            this.name = name;
            this.info = info;
            Interfaces.GenericInterface.prototype._init.call(this);
            
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
