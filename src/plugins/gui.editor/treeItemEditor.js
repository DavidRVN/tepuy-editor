import { App } from '../../js/app';
import { TemplateManager } from './templateManager';

export class TreeItemEditor {
    constructor(action, data, target, tree) {
        this.action = action;
        this.data = data;
        this.target = target;
        this.tree = tree;
    }

    run() {
        this.promise = new Promise((resolve, reject) => {
            this.accept = resolve;
            this.cancel = reject;
            let method = this[this.action].bind(this);
            if (method) method();
        });
        return this.promise;
    }

    add() {
        const data = this.data;
        const model = { isNew: true, title: '', appendAt: 'end', refPos: data.children.length-1 };

        if (data.type == 'page') {
            model.id = 'section_' + Date.now();
            model.accept = this.acceptSection.bind(this);
            model.label = 'editSection';
        }
        else {
            model.id = 'page_' + Date.now();
            model.accept = this.acceptPage.bind(this);
            model.label = 'editPage';
        }
        model.acceptText = 'commands.add';
        this.editItem(model, data.children);
    }

    edit() {
        const data = this.data;
        const model = {};
        const parent = this.tree.get_node(data.parent);
        let index = parent.children.indexOf(data.id);

        if (data.type == 'page') {
            const page = App.data.dco.getPage(data.id);
            model.id = page.id;
            model.title = page.title;
            model.accept = this.acceptPage.bind(this);
            model.label = 'editPage';
        }
        else {
            const page = App.data.dco.getPage(data.parent);
            const section = page.getSection(data.id);
            model.id = section.id;
            model.title = section.title;
            model.accept = this.acceptSection.bind(this);
            model.label = 'editSection';
        }

        model.appendAt = index == 0 ? 'first' : 'after';
        model.refPos = index == 0 ? 0 : --index;
        model.acceptText = 'commands.edit';

        this.editItem(model, parent.children);
    }

    editItem(model, children) {
        const builder = App.ui.components.FormBuilder;
        const validators = App.validation.validators;
        const labelPrefix = model.label;

        const positions = [
            { value: 'first', label: 'position.start' },
            { value: 'end', label: 'position.end' },
            { value: 'after', label: 'position.after' },
            { value: 'before', label: 'position.before' }
        ];

        const title = labelPrefix + (model.isNew ? '.newTitle' : '.editTitle');

        const references = children.map((item, index) => { 
            const node = this.tree.get_node(item);
            return { value: index, label: node.text };
        });

        const controls = {
            id: ['text', model.id, { label: labelPrefix+'.id', readonly: true }],
            isNew: ['boolean', model.isNew, { visible: false }],
            title: ['text', model.title, { label: labelPrefix+'.title', validators: [validators.required, validators.maxLength(256) ], maxLength: 256 }],
        };

        if (references && references.length) {
            const refPosVisible = () => /^(after|before)$/.test(formConfig.value.appendAt);
            controls['appendAt'] = ['optionList', model.appendAt, { label: labelPrefix+'.append', options: positions }];
            controls['refPos'] = ['optionList', model.refPos, { label: labelPrefix+'.refPos', options: references, visible: refPosVisible, depends: ['appendAt'] }];
        }

        const formConfig = builder.group(controls);
        const titleText = App.i18n.t(title);
        const manager = new App.ui.components.FormManager({
            formConfig, titleText,
            acceptText: model.acceptText
        });
        manager.openDialog().then(form => {
            model.accept(form);
        }).catch((err) => {
            console.log(err);
        });
    }

    moveup() {
        let data = this.data;
        let index = data.parent.children.indexOf(data);
        if (data.type == 'page') {
            this.movePage(index, --index);
        }
        else {
            this.moveSection(index, --index);
        }
    }

    movedown() {
        let data = this.data;
        let index = data.parent.children.indexOf(data);
        if (data.type == 'page') {
            this.movePage(index, ++index);
        }
        else {
            this.moveSection(index, ++index);
        }
    }

    acceptPage(page) {
        const data = this.data;
        const parent = this.tree.get_node(data.parent);
        if (!page.title || page.title == '') {
            return false; //Invalid
        }

        let item = {
            id: page.id,
            text: page.title
        };
        let index = -1;
        if (page.isNew) {
            item.type = 'page';
            item.parent = data.id;
            item.children = [];
        }
        else {
            this.tree.rename_node(data, item.text);
        }
        item.appendAt = page.appendAt;
        item.refPos = parseInt(page.refPos);

        let end = page.isNew ? data.children.length : parent.children.length;
        if (item.appendAt == 'before' || item.appendAt == 'after') {
            index = item.refPos + (item.appendAt == 'before' ? 0 : 1);
        }
        else {
            index = item.appendAt == 'first' ? 0 : end;
        }
        if (index < 0) index = 0;
        if (index > end) index = end;
        if (page.isNew) {
            this.tree.create_node(data, item, index);
            App.data.dco.addPage({id:item.id, title:item.text}, index);
        }
        else {
            let current = parent.children.indexOf(data.id);
            if (current != index) {
                this.tree.move_node(data, data.parent, index);
            }
            let oPage = App.data.dco.getPage(page.id);
            oPage.title = page.title;
        }
        this.accept({action: page.isNew ? 'add' : 'edit', item });
        return true;
    }

    acceptSection(section) {
        let data = this.data;
        const parent = this.tree.get_node(data.parent);
        if (!section.title || section.title == '') {
            return false; //Invalid
        }

        let item = {
            id: section.id,
            text: section.title
        };
        let index = -1;
        if (section.isNew) {
            item.type = 'section';
            item.parent = data.id;
        }
        else {
            this.tree.rename_node(data, item.text);
        }
        item.appendAt = section.appendAt;
        item.refPos = parseInt(section.refPos);

        let end = section.isNew ? data.children.length : parent.children.length;
        if (item.appendAt == 'before' || item.appendAt == 'after') {
            index = item.refPos + (item.appendAt == 'before' ? 0 : 1);
        }
        else {
            index = item.appendAt == 'first' ? 0 : end;
        }
        if (index < 0) index = 0;
        if (index > end) index = end;
        let oPage = App.data.dco.getPage(section.isNew ? data.id : data.parent);
        if (section.isNew) {
            this.tree.create_node(data, item, index);
            oPage.addSection({id: item.id, title: item.text}, index);
        }
        else {
            let current = parent.children.indexOf(data.id);
            if (current != index) {
                this.tree.move_node(data, data.parent, index);
            }
            let oSection = oPage.getSection(section.id);
            oSection.title = section.title;
        }
        this.accept({action: section.isNew ? 'add' : 'edit', item });
        return true;
    }

    movePage(from, to) {
        let data = this.data;
        let parent = data.parent;
        if (to < 0 || to >= parent.children.length) return;
        App.data.dco.movePage(data.id, to);
        $.observable(parent.children).move(from, to);
        let action = from < to ? 'movedown' : 'moveup';
        this.accept({action});
    }

    moveSection(from, to) {
        let data = this.data;
        let parent = data.parent;
        let pidx = parent.parent.children.indexOf(parent);
        if (to < 0 && pidx == 0 || to >= parent.children.length && pidx >= parent.parent.children.length) {
            return;
        }

        let fPage = App.data.dco.getPage(parent.id);
        if (to < 0 || to >= parent.children.length) {
            let tidx = pidx + (to < 0 ? -1 : 1);
            let tpage = parent.parent.children[tidx];
            let tPage = App.data.dco.getPage(tpage.id);
            let section = data;
            $.observable(parent.children).remove(from);
            section.parent = tpage;
            let toidx = to < 0 ? tpage.children.length : 0;
            $.observable(tpage.children).insert(toidx, section);
            $.observable(tpage).setProperty("expanded", true);
            let oSection = fPage.removeSection(section.id);
            tPage.addSection(oSection, toidx);
        }
        else {
            $.observable(parent.children).move(from, to);
            fPage.moveSection(data.id, to);
        }
        let action = from < to ? 'movedown' : 'moveup';
        this.accept(action);
    }

    removeTreeItem(data, resolve, reject) {
        let parent = data.parent;
        let index = parent.children.indexOf(data);
        $.observable(parent.children).remove(index);
        resolve({action: 'remove', item: data});
    }

    getTemplate(templateName) {
        if (!$.templates[templateName]) {
            $.templates({[templateName]: templateMap[templateName]});
        }
        return $.templates[templateName];
    }

}