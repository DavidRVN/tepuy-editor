import { App } from '../../js/app';
import i18next from 'i18next';

export class GuiEditor {

    constructor() {
        App.registerHook('gui_view_editor', this.initialize.bind(this));
        App.registerHook('gui_menu_initialize', this.registerMenu.bind(this));
        this.menu = [
            { text: 'Save', icon: 'ui-icon-disk'},
            { text: 'Zoom In', icon: 'ui-icon-zoomin'}
        ];
    }

    initialize() {
        const sidebarTpl = $.templates("script#gui-editor-sidebar");
        sidebarTpl.link(App.ui.$sidebar, this.getSidebarData());
        const contentTpl = $.templates("script#gui-editor-content");
        contentTpl.link(App.ui.$content, {});
        $('#tabs').localize().tabs();
    }

    registerMenu() {
        App.ui.registerMenuItem({ id: 'file'});
        App.ui.registerMenuItem({ id: 'file_properties'}, 'file');
        App.ui.registerMenuItem({ id: 'file_metadata'}, 'file');
        App.ui.registerMenuItem({ id: 'file_download'}, 'file');
        App.ui.registerMenuItem({ id: 'file_exit'}, 'file');
        App.ui.registerMenuItem({ id: 'view'});
        App.ui.registerMenuItem({ id: 'view_preview'}, 'view');
        App.ui.registerMenuItem({ id: 'view_responsive'}, 'view');
        App.ui.registerMenuItem({ id: 'help'});
        App.ui.registerMenuItem({ id: 'help_manual'}, 'help');
        App.ui.registerMenuItem({ id: 'help_about'}, 'help');

        //Register callbacks
        App.registerHook('gui_menu_file_exit', this.close.bind(this));
        App.registerHook('gui_menu_help_about', this.about.bind(this));
    }

    getSidebarData() {
        const oTree = App.data.dco.objectTree();
        let tree = { children: [], expanded: true };
        for(var page of oTree.pages) {
            var node = {id: page.id, title: page.title, children: [], type: 'page' };
            tree.children.push(node);
            if (page.sections && page.sections.length) {
                for(var section of page.sections) {
                    node.children.push({id: section.id, title: section.title, type: 'section'})
                }
            }
        }
        let extras = App.data.dco.extras().slice(0);
        return { 
            content: {
                tree: tree,
                extras: extras
            }
        };
    }

    //Menu handlers
    close() {
        App.ui.load('home');
    }
    about() {
        console.log("About");
    }
}