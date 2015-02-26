const St = imports.gi.St;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Tab = imports.tab;


function TabPanelBase(canClose) {
    this._init(canClose);
}

TabPanelBase.prototype = {
    __proto__: Tab.TabItemBase.prototype,
    
    name: _("Untitled"),
    
    _init: function(canClose) {
        Tab.TabItemBase.prototype._init.call(this, { canClose: canClose, styleClass: "devtools-tab" });
        
        this.panel = new St.BoxLayout({ style_class: "devtools-panel", vertical: true });
        this.setContent(this.panel);
        
        let label = new St.Label({ text: this.name });
        this.setTabContent(label);
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


