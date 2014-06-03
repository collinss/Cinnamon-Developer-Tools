const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Lang = imports.lang;
const Params = imports.misc.params;
const Signals = imports.signals;

function TabManager(tabArea, contentArea) {
    this._init(tabArea, contentArea);
}

TabManager.prototype = {
    _init: function(tabArea, contentArea) {
        this.tabArea = tabArea;
        this.contentArea = contentArea;
        this.items = [];
        this.selectedIndex = -1;
    },
    
    add: function(tab) {
        let info = { tabObject: tab };
        this.items.push(info);
        this.tabArea.add_actor(tab.tab);
        this.contentArea.add(tab.content, { expand: true });
        
        info.selectId = tab.connect("select", Lang.bind(this, this.selectItem));
        info.closeId = tab.connect("close", Lang.bind(this, this.remove));
    },
    
    getItemForIndex: function(index) {
        if ( index >= this.items.length ) return null;
        return this.items[index].tabObject;
    },
    
    getIndexForItem: function(item) {
        for ( let i = 0; i < this.items.length; i++ ) 
            if ( item == this.items[i].tabObject ) return i;
        
        return -1;
    },
    
    selectItem: function(item) {
        this.selectIndex(this.getIndexForItem(item));
    },
    
    selectIndex: function(index) {
        if ( index >= this.items.length ) return false;
        
        if ( this.selectedIndex >= 0 && this.selectedIndex < this.items.length )
            this.items[this.selectedIndex].tabObject.setSelect(false);
        
        this.selectedIndex = index;
        if ( this.selectedIndex >= 0 ) this.items[index].tabObject.setSelect(true);
        
        return true;
    },
    
    remove: function(tab) {
        this.tabArea.remove_actor(tab.tab);
        this.contentArea.remove_actor(tab.content);
        
        let info = this.items[this.getIndexForItem(tab)];
        tab.disconnect(info.selectId);
        tab.disconnect(info.closeId);
        this.items.splice(this.getIndexForItem(tab),1);
        
        this.selectIndex(0);
    }
}

function TabItemBase() {
    this._init.apply(this, arguments);
}

TabItemBase.prototype = {
    _init: function(params) {
        this.params = Params.parse(params, {
            styleClass: "tab",
            canClose: false
        });
        
        this.tab = new St.Button({ style_class: this.params.styleClass });
        
        this.content = new St.Bin({ x_expand: true, x_fill: true, y_expand: true, y_fill: true });
        this.content.hide();
        
        if ( this.params.canClose ) {
            this.actor = this.tab; //needed to make the menu work
            this.menu = new PopupMenu.PopupMenu(this.tab, 0.0, St.Side.BOTTOM);
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menuManager.addMenu(this.menu);
            Main.uiGroup.add_actor(this.menu.actor);
            this.menu.actor.hide();
            
            this.menu.addAction("Close Tab", Lang.bind(this, function() {
                this.close();
            }));
        }
        
        this.tab.connect("button-press-event", Lang.bind(this, this.onTabClicked));
    },
    
    setSelect: function(state) {
        if ( state ) {
            this.selected = true;
            this.content.show();
            this.tab.add_style_pseudo_class("selected");
            this.onSelected();
        }
        else {
            this.selected = false;
            this.content.hide();
            this.tab.remove_style_pseudo_class("selected");
            this.onUnselected();
        }
    },
    
    onTabClicked:function(a, event) {
        this.emit("select");
        
        if ( this.params.canClose ) {
            if ( event.get_button() == 3 ) {
                
                if ( !this.menu ) return false;
                
                this.menu.toggle();
                // Check if menu gets out of monitor. Move menu to top if so
                
                // Find x-position of bottom edge of monitor
                let bottomEdge;
                for ( let i = 0; i < Main.layoutManager.monitors.length; i++ ) {
                    let monitor = Main.layoutManager.monitors[i];
                    
                    if ( monitor.x <= this.tab.x && monitor.y <= this.tab.y &&
                         monitor.x + monitor.width > this.tab.x &&
                         monitor.y + monitor.height > this.tab.y ) {
                        
                        bottomEdge = monitor.x + monitor.width;
                        break;
                    }
                } 
                
                if ( this.tab.y + this.tab.height + this.menu.actor.height > bottomEdge ) {
                    this.menu.setArrowSide(St.Side.BOTTOM);
                }
                else {
                    this.menu.setArrowSide(St.Side.TOP);
                }
                
                return true;
            }
            else if ( this.menu.isOpen ) this.menu.toggle();
        }
        
        return false;
    },
    
    setContent: function(childContent) {
        this.content.add_actor(childContent);
    },
    
    setTabContent: function(tabContent) {
        this.tab.add_actor(tabContent);
    },
    
    onSelected: function() {
        
    },
    
    onUnselected: function() {
        
    },
    
    close: function() {
        this.emit("close");
    }
}
Signals.addSignalMethods(TabItemBase.prototype);