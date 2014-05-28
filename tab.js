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
    
    add: function(item) {
        this.items.push(item);
        this.tabArea.add_actor(item.tab);
        this.contentArea.add(item.content, { expand: true });
        
        item.connect("select", Lang.bind(this, this.selectItem));
    },
    
    getItem: function(index) {
        if ( index >= this.items.length ) return null;
        return this.items[index];
    },
    
    getIndex: function(item) {
        for ( let i = 0; i < this.items.length; i++ ) 
            if ( item == this.items[i] ) return i;
        
        return -1;
    },
    
    selectItem: function(item) {
        this.selectIndex(this.getIndex(item));
    },
    
    selectIndex: function(index) {
        if ( index >= this.items.length ) return false;
        
        if ( this.selectedIndex >= 0 && this.selectedIndex < this.items.length )
            this.items[this.selectedIndex].setSelect(false);
        
        this.selectedIndex = index;
        this.items[index].setSelect(true);
        
        return true;
    }
}

function TabItemBase() {
    this._init.apply(this, arguments);
}

TabItemBase.prototype = {
    _init: function(params) {
        this.params = Params.parse(params, {
            style_class: "tab"
        });
        
        this.tab = new St.Button({ style_class: this.params.style_class });
        
        this.content = new St.Bin({ x_expand: true, x_fill: true, y_expand: true, y_fill: true });
        this.content.hide();
        
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
    
    onTabClicked:function() {
        this.emit("select");
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
        
    }
}
Signals.addSignalMethods(TabItemBase.prototype);
