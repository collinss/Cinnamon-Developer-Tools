const St = imports.gi.St;

imports.searchPath.push( imports.ui.appletManager.appletMeta["devTools@scollins"].path );
const Tab = imports.tab;


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


