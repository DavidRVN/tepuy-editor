import i18next from 'i18next';
import Backend from 'i18next-xhr-backend';
import jqueryI18next from 'jquery-i18next';
import properties from './properties';
import { sortInsert } from './utils';
import { Api } from './api';
import { Dco } from './dco';


const defaultOptions = {
    container: "#tepuy-editor",
    defaultView: 'home'
}

class App {

    constructor() {
        this.hooks = {};
        this.plugins = {};
    }

    registerHook(id, callback, priority = 999) {
        if (!this.hooks[id]) this.hooks[id] = [];
        sortInsert(this.hooks[id], { callback, priority }, (a, b) => a.priority - b.priority);
    }

    init(options) {
        //Parse options
        this.parseOptions(options);

        //Load active plugins
        for(let plugin of properties.plugins) {
            if (!plugin.active) continue;
            var objectName = plugin.id.split('.').map(p => p[0].toUpperCase() + p.substr(1)).join('');
            if (objectName in tepuyEditor) {
                this.plugins[plugin.id] = new tepuyEditor[objectName];
            }
            else {
                import(`../plugins/${plugin.id}/component.js`).then(function (pClass) {
                    this.plugins[plugin.id] = new pClass(this); //pass a reference to the App
                })
            }
        }

        this.initLanguage().then(() => {
            this.api = new Api(this.options.api);
            this.data = {
                dco: new Dco(),
                theme: {}
            };
            this.invokeHook('gui_initialize');
            this.ui.load(this.options.defaultView);
        });
    }

    parseOptions(options) {
        this.options = Object.assign(defaultOptions, options);

        if (typeof(this.options.container) === 'string') {
            this.$container = $(this.options.container);
        }
        else {
            this.$container = this.options.container;
        }
    }

    invokeHook(id, params = null) {
        if (!this.hooks[id]) return;

        var hooks = this.hooks[id];
        for(let hook of hooks) {
            hook.callback.apply(null, params);
        }
    }

    initLanguage() {
        return i18next
        .use(Backend)
        .init({
            lng: 'es',
            fallbackLng: 'es',
            ns: ['core'],
            defaultNS: 'core',
            backend: {
                loadPath: 'i18n/{{lng}}/{{ns}}.json'
            }
        }, function(err, t) {
            jqueryI18next.init(i18next, $);
            i18next.on('languageChanged', () => {
                $('body').localize();
            });

            App.i18n = i18next; //Give the App object access to the while translation system
        });
    }
}

const app = new App();
export { app as App};