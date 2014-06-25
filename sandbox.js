const ModalDialog = imports.ui.modalDialog;
const Cinnamon = imports.gi.Cinnamon;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const St = imports.gi.St;
const Lang = imports.lang;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Tab = imports.tab;
const Interfaces = imports.interfaces;


function FileEntryDialog(callback) {
    this._init(callback);
}

FileEntryDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(callback) {
        try {
            
            this.callback = callback;
            ModalDialog.ModalDialog.prototype._init.call(this, {  });
            
            let contentBox = new St.BoxLayout({ vertical: true, style_class: "devtools-fileDialog-contentBox" });
            this.contentLayout.add_actor(contentBox);
            
            this.fileEntry = new St.Entry({ style_class: "devtools-fileDialog-entry", text: "~/Desktop/checkBox.js" });
            contentBox.add_actor(this.fileEntry);
            this.fileEntry.clutter_text.connect("key-press-event", Lang.bind(this, this.onKeyPressed));
            
            //dialog close button
            this.setButtons([
                { label: "Cancel", key: "", focus: true, action: Lang.bind(this, this.onCancel) },
                { label: "Open", key: "", focus: true, action: Lang.bind(this, this.onOk) }
            ]);
            
            this.open(global.get_current_time());
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onOk: function() {
        let fileName = this.fileEntry.text;
        fileName = fileName.replace("~", GLib.get_home_dir())
        let file = Gio.file_new_for_path(fileName);
        if ( !file.query_exists(null) ) return;
        
        this.close(global.get_current_time());
        this.callback(file);
    },
    
    onCancel: function() {
        this.close(global.get_current_time());
    },
    
    onKeyPressed: function(object, event) {
        let symbol = event.get_key_symbol();
        if ( symbol == Clutter.Return || symbol == Clutter.KP_Enter ) {
            this.onOk();
            return true;
        }
        
        return false;
    }
}


function SandboxInterface() {
    this._init();
}

SandboxInterface.prototype = {
    __proto__: Interfaces.GenericInterface.prototype,
    
    name: _("Sandbox"),
    
    _init: function() {
        Interfaces.GenericInterface.prototype._init.call(this, true);
        
        let tabs = new St.BoxLayout({ style_class: "devtools-sandbox-tabs" });
        this.panel.add_actor(tabs);
        let tabPanels = new St.BoxLayout({ height: 120, style_class: "devtools-sandbox-tabpanels" });
        this.panel.add_actor(tabPanels);
        this.tabManager = new Tab.TabManager(tabs, tabPanels);
        
        /*javascript*/
        let jsTab = new Tab.TabItemBase();
        this.tabManager.add(jsTab);
        jsTab.setTabContent(new St.Label({ text: "Javascript" }));
        let jsBox = new St.BoxLayout({ style_class: "devtools-sandbox-box" });
        jsTab.setContent(jsBox);
        
        let jsTabButtonBox = new St.BoxLayout({ vertical: true });
        jsBox.add_actor(jsTabButtonBox);
        let jsOpenFileButton = new St.Button();
        jsTabButtonBox.add_actor(jsOpenFileButton);
        jsOpenFileButton.add_actor(new St.Icon({ icon_name: "fileopen", icon_size: 24, icon_type: St.IconType.FULLCOLOR }));
        jsOpenFileButton.connect("clicked", Lang.bind(this, this.openFileDialog));
        
        let javascriptScrollBox = new St.ScrollView({ style_class: "devtools-sandbox-scrollBox" });
        jsBox.add(javascriptScrollBox, { expand: true });
        javascriptScrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        
        let jsTextBox = new St.BoxLayout({ vertical: true });
        javascriptScrollBox.add_actor(jsTextBox);
        let padding = new St.Bin({ reactive: true });
        jsTextBox.add(padding, { y_expand: true, y_fill: true, x_expand: true, x_fill: true });
        
        this.javascript = new St.Entry({ track_hover: false, can_focus: true, style_class: "devtools-sandbox-entry" });
        jsTextBox.add_actor(this.javascript);
        jsTab.textBox = this.javascript;
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
        let cssBox = new St.BoxLayout({ style_class: "devtools-sandbox-box" });
        cssTab.setContent(cssBox);
        
        let cssTabButtonBox = new St.BoxLayout({ vertical: true });
        cssBox.add_actor(cssTabButtonBox);
        let cssOpenFileButton = new St.Button();
        cssTabButtonBox.add_actor(cssOpenFileButton);
        cssOpenFileButton.add_actor(new St.Icon({ icon_name: "fileopen", icon_size: 24, icon_type: St.IconType.FULLCOLOR }));
        cssOpenFileButton.connect("clicked", Lang.bind(this, this.openFileDialog));
        
        let styleScrollBox = new St.ScrollView({ style_class: "devtools-sandbox-scrollBox" });
        cssBox.add(styleScrollBox, { expand: true });
        styleScrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        
        let cssTextBox = new St.BoxLayout({ vertical: true });
        styleScrollBox.add_actor(cssTextBox);
        let padding = new St.Bin({ reactive: true });
        cssTextBox.add(padding, { y_expand: true, y_fill: true, x_expand: true, x_fill: true });
        
        this.styleSheet = new St.Entry({ track_hover: false, can_focus: true, style_class: "devtools-sandbox-entry" });
        cssTextBox.add_actor(this.styleSheet);
        cssTab.textBox = this.styleSheet;
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
    },
    
    openFileDialog: function() {
        let dialog = new FileEntryDialog(Lang.bind(this, this.loadFromFile));
    },
    
    loadFromFile: function(file) {
        let [a, contents, b] = file.load_contents(null);
        this.tabManager.getSelectedItem().textBox.text = String(contents);
    }
}
