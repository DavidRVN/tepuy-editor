import i18next from 'i18next';
const iconMap = {
    "file": "file",
    "file_properties": "list",
    "file_metadata": "tags",
    "file_download": "download",
    "file_exit": "power-off",
    "view": "eye",
    "view_preview": "globe",
    "view_responsive": "mobile-alt",
    "help": "question",
    "help_manual": "book",
    "help_about": "info",
    "content": "poll-h",
    "look": "palette",
    "resources": "archive",
    "log": "clipboard",
    "share": "share",
};

export const helpers = {
    translate: function(key) {
        return i18next.t(key);
    },
    icon: function(icon) {
        if (!icon || !iconMap[icon]) return '';
        return icon ? ['<i class="fas fa-', iconMap[icon], '"></i>'].join('') : '';
    }
}

export const tree = {
    template: "#gui-default-editable-tree",
    editable: false,
    rootLabel: '',
    //METHODS
    toggle: function() {
      var data = this.tagCtx.view.data;
      $.observable(data).setProperty("expanded", !data.expanded);
    },
    remove: function() {
      var parents = this.parent.tagCtx.view.data.pages,
        index = this.tagCtx.view.index;
      $.observable(parents).remove(index);
    },
    addItem: function() {
      var data = this.tagCtx.view.data;
      $.observable(data.children).insert({
        title: "Página 1",
        children: []
      });
      $.observable(data).setProperty("expanded", true);
    },
    dataBoundOnly: true
};