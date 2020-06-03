import moment from 'moment';
import { App } from '../../js/app';

const resourceTypes = {
    'image': {
        pattern: /^\.?(png|jpg|gif|jpeg|)$/,
        icon: 'file-image'
    },
    'doc': {
        pattern: /^\.?(doc|docx|txt|odt|rtf)$/,
        icon: 'file-doc'
    },
    'audio': {
        pattern: /^\.?(mp3|wav|vlc)$/,
        icon: 'file-audio'
    },
    'video': {
        pattern: /^\.?(mp4|mpeg)$/,
        icon: 'file-video'
    },
    'pdf': {
        pattern: /^\.?(pdf)$/,
        icon: 'file-pdf'
    }
}
const defaultResourceType = 'file';

function hashCode(string) {
    var hash = 0, i, chr;
    for (i = 0; i < string.length; i++) {
      chr   = string.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export class ResourceTreeManager {
    
    constructor(actionHandler) {
        this.actionHandler = actionHandler;
        this.dco = App.data.dco;

        //Ensure this context
        this.resourceDrop = this.resourceDrop.bind(this);
        this.onSidebarAction = this.onSidebarAction.bind(this);
    }

    getConfig() {
        return this.initializeJsTree();
    }
    
    loadResources(path){
        this.dco.getResources(path).then((resources) => {
            let children = [];
            if (!this.sidebarModel.resources) {
                let tree = { children: [], expanded: true, root: true, id: '/' };
                $.observable(this.sidebarModel).setProperty('resources', {
                    tree: tree,
                    treeCommand: this.onTreeCommand.bind(this),
                    onAction: this.onResourceAction.bind(this)
                });
            }
            let parent = this.getNodeWithPath(path, this.sidebarModel.resources.tree);
            for(const resource of resources) {
                resource.icon = this.getIcon(resource);
                if (resource.thumbnail && resource.thumbnail != '') {
                    resource.thumb = resource.thumbnail;
                }
                let child = {id: resource.path, title: resource.name, parent: parent, icon: resource.icon };
                if (resource.type == 'D') {
                    child.loaded = false;
                    child.children = [];
                }
                children.push(child);
            }
            
            $.observable(this.contentModel).setProperty("resources", resources);
            $.observable(this.contentModel).setProperty("resourcesPath", path);
            $.observable(parent.children).refresh(children);
        });
        $.observable(this.contentModel).setProperty("resourceClick", this.resourceClick.bind(this));
        $.observable(this.contentModel).setProperty("resourceDblClick", this.resourceDblClick.bind(this));
        $.observable(this.contentModel).setProperty("resourceDragEnter", this.resourceDragEnter.bind(this));
        $.observable(this.contentModel).setProperty("resourceDragLeave", this.resourceDragLeave.bind(this));
        $.observable(this.contentModel).setProperty("resourceDrop", this.resourceDrop.bind(this));
    }

    initializeJsTree() {
        this.currentPath = '/';
        const me = this;
        const jtData = (node, callback) => {
            const path = me.getNodePath(node);
            me.getResources(path).then(resources => {
                let items = resources.map(res => {
                    return {
                        id: hashCode(res.path),
                        li_attr: { 'data-path': res.path },
                        text: res.name,
                        parent: node.id,
                        type: me.getFileType(res),
                        state: { loaded: res.type == 'F', failed: false }
                    };
                });

                if (path == '/') {
                    items = [{
                        id: '_root',
                        text: path,
                        type: 'root',
                        li_attr: { "data-root": true },
                        state: { loaded: true, selected: true, opened: true },
                        children:  items
                    }]
                }
                callback.call(this, items);
            });
        };
        const core = {
            check_callback: (op, node, parent, position, more) => {
                return true;
            },
            multiple: false,
            themes: {
                ellipsis: true
            }
        };
        const valid_children = ['folder', 'file'];
        const types = {
            "root": {
                icon: "fas fa-folder"
            },
            "folder": {
                icon: "fas fa-folder"
            },
            "file": {
                icon: "fas fa-file",
                valid_children: []
            }
        }

        for(const key in resourceTypes) {
            const type = resourceTypes[key];
            types[key] = {
                icon: 'fas fa-' + type.icon,
                valid_children: []
            }
            valid_children.push(key);
        }

        types.root.valid_children = valid_children;
        types.folder.valid_children = valid_children;

        const contextmenu = {
            items: (node) => {
                const type = node.type;
                const actions = {};
                const action = this.jtContextMenuHandler.bind(this, node);
                if (type != 'file') {
                    actions.addFile = {
                        id: 'addFile',
                        label: App.i18n.t('resources.addFile'),
                        action: action,
                        icon: 'fas fa-file'
                    }
                    actions.addFolder = {
                        id: 'addFolder',
                        label: App.i18n.t('resources.addFolder'),
                        action: action,
                        icon: 'fas fa-folder-plus'
                    }
                }
                if (type != 'root') {
                    actions.edit = {
                        id: 'renameFolder',
                        label: App.i18n.t('resources.rename'),
                        action: action,
                        icon: 'fas fa-pen'
                    }
                    actions.delete = {
                        id: 'delete',
                        label: App.i18n.t('resources.delete'),
                        action: action,
                        icon: 'fas fa-trash-alt'
                    }
                }
                return actions;
            }
        }

        const toolbar = {
            items: contextmenu.items
        };

        const dnd = {
            handler: () => {}
        };

        const events = {
            'move_node.jstree': this.jtNodeMoved.bind(this),
            'select_node.jstree': this.jtNodeSelected.bind(this),
            'loaded.jstree': (ev, data) => {
                this.tree = data.instance;
            }
        };

        const jtConfig = { core, types, contextmenu, dnd, events, toolbar };
        return { jtData, jtConfig };
        //$.observable(this.sidebarModel).setProperty();
    }

    getNodePath(node) {
        if (node.id == '#'|| node.id == '_root') return '/';
        return node.li_attr['data-path'];
    }
 

    /* Events*/


    resourceClick(resource, ev, args) {
        let $el = $(ev.target);
        $el
            .closest('.container')
            .find('.resource.thumbnail')
            .addClass('ui-state-default')
            .removeClass('ui-state-highlight');
        $el
            .closest('.resource.thumbnail')
            .addClass('ui-state-highlight');
    }
    resourceDblClick(resource, ev, args) {
    }

    resourceDragEnter(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        $('.dropzone').addClass('ui-state-highlight');
    }

    resourceDragLeave(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        $('.dropzone').removeClass('ui-state-highlight');
    }

    resourceDrop(ev) {
        let dt = ev.dataTransfer || ev.originalEvent.dataTransfer;
        let files = dt.files;
        this.uploadFiles([...files]);
    }

    onResourceAction(ev, args) {
        let $el = $(ev.target).closest('.ui-button');
        let action = $el.data().action;

        let method = this['resource'+action].bind(this);
        method($el);
    }



    //ToDo: This should be async (using promises)
    getResources() {
        let path = this.currentPath;
        if (!/\/$/.test(path)) path += '/';
        return this.dco.getResources(path);
    }

    jtContextMenuHandler(node, menu) {
        this.runAction(menu.item.id, node, menu.element).then(result => {
            const handler = this.actionHandler;
            handler(result)
            return result;
        });
    }

    jtNodeMoved(ev, data) {
        const node = data.node;
        if (node.type == 'page') {
            App.data.dco.movePage(node.id, data.position);
        }
        else {
            if (data.old_parent == data.parent) {
                const oPage = App.data.dco.getPage(node.parent);
                oPage.moveSection(section.id, index);
            }
            else {
                const oldPage = App.data.dco.getPage(data.old_parent);
                const newPage = App.data.dco.getPage(data.parent);
                const section = oldPage.removeSection(node.id);
                newPage.addSection(section, data.position);
            }
        }
    }

    jtNodeSelected(ev, data) {
        const path = this.getNodePath(data.node);
        $.observable(this).setProperty('currentPath', path);
    }

    jtGetSelection() {
        let selected = this.tree.get_selected();
        if (selected && selected.length) {
            selected = this.tree.get_node(selected);
        }
        else {
            selected = this.tree.get_node('_root');
        }
        return selected;
    }

    runAction(action, node, target) {
        this.node = node;
        this.action = action;
        this.target = target;
        const promise = new Promise((resolve, reject) => {
            this.accept = resolve;
            this.cancel = reject;
            if (this[action]) this[action]();
        });
        return promise;
    }

    resourceDragEnter(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        $('.dropzone').addClass('ui-state-highlight');
    }

    resourceDragLeave(ev) {
        ev.preventDefault();
        ev.stopPropagation();
        $('.dropzone').removeClass('ui-state-highlight');
    }

    resourceDrop(ev) {
        let dt = ev.dataTransfer || ev.originalEvent.dataTransfer;
        let files = dt.files;

        this.node = this.jtGetSelection();
        this.uploadFiles([...files]);
    }

    onSidebarAction(ev, args) {
        const $el = $(ev.target).closest('.ui-button');
        const action = $el.data().action;
        const node = this.jtGetSelection();
        const menu = {
            item: { id: action },
            element: $el
        }
        this.jtContextMenuHandler(node, menu);
    }

    addFile(target) {
        console.log('adding file');
        let $uploader = $('<input type="file" multiple="true"/>').css({display:'none'}).appendTo('body')
            .on('change', (ev) => {
                this.uploadFiles(ev.target.files);
                $uploader.remove();
            })
        $uploader.trigger('click');
    }

    uploadFiles(files) {
        for(let file of files) {
            let resource = {
                type: 'F',
                name: file.name,
                size: Math.round(file.size / 1024) + ' KB',
                createdAt: moment(file.lastModifiedDate).format('YYYY-MM-DD HH:mm'),
                extension: file.name.substring(file.name.lastIndexOf('.'))
            }
            resource.icon = this.getFileIcon(resource);

            this.dco.addResource(resource, this.currentPath).then(response => {
                resource.path = response.path;
                let child = {
                    id: hashCode(resource.path),
                    text: resource.name,
                    parent: this.node.id,
                    type: this.getFileType(resource),
                    li_attr: { 'data-path': resource.path }
                };
                this.tree.create_node(this.node.id, child);
                //$.observable(this.sidebarModel.resources.tree.children).insert(child);
                //$.observable(this.contentModel.resources).insert(resource);
            }, (error) => {
                console.log(error);
            })

        }
    }

    getFileIcon(resource) {
        for(const key in resourceTypes) {
            const type = resourceTypes[key];
            if (type.pattern.test(resource.extension)) {
                return type.icon;
            }
        }
        return 'file';
    }

    getFileType(resource) {
        if (resource.type == 'D') return 'folder';
        var debug = resource.name == 'acceptSection.js';
        debug && console.log(resource);
        for(const key in resourceTypes) {
            const type = resourceTypes[key];
            if (type.pattern.test(resource.extension)) {
                debug && console.log(key);
                return key;
            }
        }
        debug && console.log(defaultResourceType);
        return defaultResourceType;
    }

    addFolder(){
        const data = this.node;       
        const model = { isNew: true, title: '', appendAt: 'end', refPos: data.children.length-1 };  
        model.label = 'newFolder';
        model.acceptText = 'resources.addFolder';
        this.editFolder(model, data.children);
}


    editFolder(model, children){

        const builder = App.ui.components.FormBuilder;
        const validators = App.validation.validators;
        const labelPrefix = model.label;
        const now = new Date();
        const dataP = this.node;
        const pathFolder = this.getNodePath(this.node);
        const createdAt = moment(now).format('YYYY-MM-DD HH:mm');
        

        const title = labelPrefix + (model.isNew ? '.newTitle' : '.editTitle');

        const references = children.reduce((result, item, index) => {
            if (item != model.id) {
                const node = this.tree.get_node(item);
                result.push({ value: index, label: node.text })
            }
            return result;
        }, []);

        const controls = {
            isNew: ['boolean', model.isNew, { visible: false }],
            title: ['text', model.title, { label: labelPrefix+'.title', validators: [validators.required, validators.maxLength(256) ], maxLength: 256, default: true }],
        };

        if (references && references.length) {
            const refPosVisible = () => /^(after|before)$/.test(formConfig.value.appendAt);           
            controls['refPos'] = ['optionList', model.refPos, { label: labelPrefix+'.refPos', options: references, visible: refPosVisible, depends: ['appendAt'] }];
        }

        const formConfig = builder.group(controls);
        const titleText = App.i18n.t(title);
        const manager = new App.ui.components.FormManager({
            formConfig, titleText,
            acceptText: model.acceptText
        });

        manager.openDialog().then(form => {         
            this.dco.addResource({
                name: form.title,
                type: 'D',
                createdAt: createdAt
            }, pathFolder).then(res => {
                this.loadResources(pathFolder);
            });    
        }).catch((err) => {
            console.log(err);
        });
    }

    delete(){
        const data = this.node;
        console.log(data)
        const text = 'newFolder.deleteConfirmation';
        const question = App.i18n.t(text, { [data.type]: data.text }, {interpolation: {escapeValue: false}});
        const title = App.i18n.t('newFolder.deleteTitle');

        App.ui.components.Dialog.confirm(question, title).then(result => {
            if (result) {
                App.data.dco.deleteResource(data.id).then(result => {
                    if (!result) {                   
                        return;
                    }
                    this.tree.delete_node(data);
                });
            }
        });
    }


    renameFolder(){
        const data = this.node;       
        const model = { isNew: true, title: '', appendAt: 'end', refPos: data.children.length-1 };  
        model.label = 'newFolder';
        model.acceptText = 'newFolder.editConfirmation';
        this.rename(model, data.children);
}

    rename(model, children){   

        const builder = App.ui.components.FormBuilder;
        const validators = App.validation.validators;
        const labelPrefix = model.label;
        const dataP = this.node;
        console.log(dataP.text);
      
        const title = labelPrefix + (model.isNew ? '.editArchive' : '.editArchive');

        const references = children.reduce((result, item, index) => {
            if (item != model.id) {
                const node = this.tree.get_node(item);
                result.push({ value: index, label: node.text })
            }
            return result;
        }, []);

        const controls = {
            isNew: ['boolean', model.isNew, { visible: false }],
            title: ['text', dataP.text , model.title, { label: labelPrefix+'.editArchive', validators: [validators.required, validators.maxLength(256) ], maxLength: 256, default: true }],
        };

        if (references && references.length) {
            const refPosVisible = () => /^(after|before)$/.test(formConfig.value.appendAt);           
            controls['refPos'] = ['optionList', model.refPos, { label: labelPrefix+'.refPos', options: references, visible: refPosVisible, depends: ['appendAt'] }];
        }

        const formConfig = builder.group(controls);
        const titleText = App.i18n.t(title);
        const manager = new App.ui.components.FormManager({
            formConfig, titleText,
            acceptText: model.acceptText
        });

        manager.openDialog().then(form => {         
            this.tree.rename_node(dataP, form.title);
        }).catch((err) => {
            console.log(err);
        });
        
    }
}