const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
const Tooltips = imports.ui.tooltips;
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
const TabPanel = imports.tabPanel;


function FileEntryDialog(callback, filePath) {
    this._init(callback, filePath);
}

FileEntryDialog.prototype = {
    __proto__: ModalDialog.ModalDialog.prototype,
    
    _init: function(callback, filePath) {
        try {
            
            this.callback = callback;
            ModalDialog.ModalDialog.prototype._init.call(this, {  });
            
            let contentBox = new St.BoxLayout({ vertical: true, style_class: "devtools-fileDialog-contentBox" });
            this.contentLayout.add_actor(contentBox);
            
            let text;
            if ( filePath ) text = filePath;
            else text = "";
            this.fileEntry = new St.Entry({ style_class: "devtools-fileDialog-entry", can_focus: true, text: text });
            contentBox.add_actor(this.fileEntry);
            this.fileEntry.clutter_text.connect("key-press-event", Lang.bind(this, this.onKeyPressed));
            
            //dialog close button
            this.setButtons([
                { label: "Cancel", key: "", focus: true, action: Lang.bind(this, this.onCancel) },
                { label: "Open", key: "", focus: true, action: Lang.bind(this, this.onOk) }
            ]);
            
            this.setInitialKeyFocus(this.fileEntry);
            
            this.open(global.get_current_time());
            
        } catch(e) {
            global.logError(e);
        }
    },
    
    onOk: function() {
        let fileName = this.fileEntry.text;
        fileName = fileName.replace("~", GLib.get_home_dir());
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
        switch ( symbol ) {
            case Clutter.Return:
            case Clutter.KP_Enter:
                this.onOk();
                return true;
            case Clutter.KEY_Tab:
                this.autoComplete();
                return true;
            default:
                return false;
        }
    },
    
    autoComplete: function() {
        let array = this.fileEntry.text.replace("~", GLib.get_home_dir()).split("/");
        let end = array.pop();
        let basePath = array.join("/");
        
        let file = Gio.file_new_for_path(basePath);
        let enumer = file.enumerate_children("standard::name, standard::type", Gio.FileQueryInfoFlags.NONE, null);
        
        let info;
        let res = [];
        while ( (info = enumer.next_file(null)) != null ) {
            let name = info.get_name();
            if ( info.get_file_type() == Gio.FileType.DIRECTORY ) name += "/";
            if ( name.search(end) == 0 ) res.push(name);
        }
        
        if ( res.length == 0 ) return;
        else if ( res.length == 1 ) this.fileEntry.text = basePath + "/" + res[0];
        else {
            let cont = true;
            let pos = end.length;
            while ( cont ) {
                let nextLetter = "";
                for ( let i = 0; i < res.length; i++ ) {
                    let fName = res[i];
                    if ( fName.length == pos ) {
                        cont = false;
                        break;
                    }
                    if ( i == 0 ) nextLetter = fName[pos];
                    else {
                        if ( fName[pos] != nextLetter ) {
                            cont = false;
                            break;
                        }
                    }
                }
                if ( cont ) {
                    end += nextLetter;
                    pos++;
                }
            }
            
            this.fileEntry.text = basePath + "/" + end;
        }
    }
}


function TextEditor(title) {
    this._init(title);
}

TextEditor.prototype = {
    __proto__: Tab.TabItemBase.prototype,
    
    _init: function(title) {
        try {
            Tab.TabItemBase.prototype._init.call(this);
            
            this.setTabContent(new St.Label({ text: title }));
            let content = new St.BoxLayout({ style_class: "devtools-sandbox-box" });
            this.setContent(content);
            
            //buttons
            this.buttonBox = new St.BoxLayout({ vertical: true });
            content.add_actor(this.buttonBox);
            
            let openFileButton = new St.Button();
            this.buttonBox.add_actor(openFileButton);
            openFileButton.add_actor(new St.Icon({ icon_name: "fileopen", icon_size: 24, icon_type: St.IconType.FULLCOLOR }));
            openFileButton.connect("clicked", Lang.bind(this, this.openFile));
            new Tooltips.Tooltip(openFileButton, _("Load from file"));
            
            let saveFileButton = new St.Button();
            this.buttonBox.add_actor(saveFileButton);
            saveFileButton.add_actor(new St.Icon({ icon_name: "filesave", icon_size: 24, icon_type: St.IconType.FULLCOLOR }));
            saveFileButton.connect("clicked", Lang.bind(this, this.saveFile));
            new Tooltips.Tooltip(saveFileButton, _("Save to file"));
            
            //text area
            let scrollBox = new St.ScrollView({ style_class: "devtools-sandbox-scrollBox" });
            content.add(scrollBox, { expand: true });
            scrollBox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
            
            let textBox = new St.BoxLayout({ vertical: true });
            scrollBox.add_actor(textBox);
            
            this.text = new St.Entry({ track_hover: false, can_focus: true, style_class: "devtools-sandbox-entry" });
            textBox.add_actor(this.text);
            this.textBox = this.text;
            this.text.set_clip_to_allocation(false);
            this.text.clutter_text.set_single_line_mode(false);
            this.text.clutter_text.set_activatable(false);
            this.text.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.text.clutter_text.line_wrap = true;
            this.text.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
            
            let padding = new St.Bin({ reactive: true });
            textBox.add(new St.Bin({ reactive: true }), { expand: true });
            
            this.text.clutter_text.connect("button_press_event", Lang.bind(this, this.enter, this.text));
            scrollBox.connect("button_press_event", Lang.bind(this, this.enter, this.text));
        } catch(e) {
            global.logError(e);
        }
    },
    
    getText: function() {
        return this.text.text;
    },
    
    enter: function(actor, event) {
        let fullscreen = global.stage_input_mode == Cinnamon.StageInputMode.FULLSCREEN;
        if ( fullscreen && actor == this.text ) return;
        
        if ( !fullscreen ) global.set_stage_input_mode(Cinnamon.StageInputMode.FOCUSED);
        this.text.grab_key_focus();
        if ( !fullscreen ) global.set_stage_input_mode(Cinnamon.StageInputMode.NORMAL);
    },
    
    openFile: function() {
        let dialog = new FileEntryDialog(Lang.bind(this, this.loadFromFile));
    },
    
    saveFile: function() {
        let path;
        if ( this.file ) path = this.file.get_path();
        let dialog = new FileEntryDialog(Lang.bind(this, this.saveToFile), path);
    },
    
    loadFromFile: function(file) {
        this.file = file;
        let [a, contents, b] = file.load_contents(null);
        this.text.text = String(contents);
    },
    
    saveToFile: function(file) {
        try {
            this.file = file;
            let text = this.text.text;
            file.replace_contents(text, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        } catch(e) {
            global.logError(e);
        }
    }
}


function SandboxInterface() {
    this._init();
}

SandboxInterface.prototype = {
    __proto__: TabPanel.TabPanelBase.prototype,
    
    name: _("Sandbox"),
    
    _init: function() {
        try {
            TabPanel.TabPanelBase.prototype._init.call(this, true);
            
            let tabs = new St.BoxLayout({ style_class: "devtools-sandbox-tabs" });
            this.panel.add_actor(tabs);
            let tabPanels = new St.BoxLayout({ height: 120, style_class: "devtools-sandbox-tabPanels" });
            this.panel.add(tabPanels, { expand: true });
            this.tabManager = new Tab.TabManager(tabs, tabPanels);
            
            /*javascript*/
            this.jsTab = new TextEditor("Javascript");
            this.tabManager.add(this.jsTab);
            
            /*style*/
            this.cssTab = new TextEditor("Style");
            this.tabManager.add(this.cssTab);
            let loadCurrentButton = new St.Button();
            this.cssTab.buttonBox.add_actor(loadCurrentButton);
            loadCurrentButton.add_actor(new St.Icon({ icon_name: "document-open", icon_size: 24, icon_type: St.IconType.FULLCOLOR }));
            loadCurrentButton.connect("clicked", Lang.bind(this, this.loadCurentStylesheet));
            new Tooltips.Tooltip(loadCurrentButton, _("Load currnet stylesheet"));
            
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
        } catch(e) {
            global.logError(e);
        }
    },
    
    evaluate: function() {
        this.previewer.destroy_all_children();
        
        let jsText = this.jsTab.getText();
        let actor;
        try {
            let sandboxCode = new Function(jsText);
            let result = sandboxCode();
            
            if ( result && result instanceof Clutter.Actor ) actor = result;
            else actor = new St.Label({ text: result });
            
            this.previewer.add_actor(actor);
            
            let cssText = this.cssTab.getText();
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
        } catch(e) {
            this.previewer.add_actor(new St.Label({ text: String(e) }));
        }
    },
    
    loadCurentStylesheet: function() {
        let styleSheet = Main.getThemeStylesheet();
        this.cssTab.loadFromFile(Gio.file_new_for_path(styleSheet));
    }
}
