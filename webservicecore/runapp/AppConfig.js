
module.exports = class {

    get appName(){return this._appName;}
    setAppName(_appName) { this._appName = _appName; }

    get port(){return this._port;}
    setPort(_port) { this._port = _port; }

    get teletPort(){return this._teletPort;}
    setTelnetPort(_teletPort) { this._teletPort = _teletPort; }

    get timeout(){return this._timeout;}
    setTimeout(_timeout) { this._timeout = _timeout; }

    get requestLimit(){return this._requestLimit;}
    setRequestLimit(_requestLimit) { this._requestLimit = _requestLimit; }

    get viewFolder(){return this._viewFolder;}
    setViewFolder(_viewFolder) { this._viewFolder = _viewFolder; }

    get staticFolder(){return this._staticFolder;}
    get staticRootName(){return this._staticRootName;}
    setStaticFolder(_staticFolder,_staticRootName) {
        this._staticFolder = _staticFolder;
        this._staticRootName = _staticRootName;
    }
    setStaticRootName(_staticRootName){
        this._staticRootName = _staticRootName;
    }

    get viewEngine(){return this._viewEngine;}
    setViewEngine(_viewEngine) { this._viewEngine = _viewEngine; }

    get i18nConfig(){return this._i18nConfig;}
    setI18nConfig(_i18nConfig) { this._i18nConfig = _i18nConfig; }

    get commands(){return this._commands;}
    registerCommand(config){
        Object.assign(this._commands,config);
    }

    get supportMethods(){return this._supportMethods;}
    addSupportMethods(config){
       this._supportMethods = [...this._supportMethods,...config];
    }

    get routesConfig(){return this._routesConfig;}
    addRoutesConfig(configs,replace=true){
        replace && Object.keys( this._routesConfig )
            .filter(url=>configs.filter(cf=>cf.url===url).length)
            .forEach(key=>delete this._routesConfig[key]);
        !replace && ( configs = configs.filter(key=>!this._routesConfig[key]));
        configs.forEach(cf=>this._routesConfig[cf.url]=cf);
    }

    get tasksConfig(){return this._tasksConfig;}
    addTaskConfig(tasks){
        Object.assign(this._tasksConfig,tasks);
    }

    get services(){return this._services || {};}
    addServices(_services){
        this._services = Object.assign(this._services || {},_services);
        this.addControllerIocKeys(Object.keys(_services))
    }

    get appInitConfigHandlers(){return this._appInitConfigHandlers;}
    addAppInitConfigHandlers(configHandlers){
        this._appInitConfigHandlers = [...this._appInitConfigHandlers,...configHandlers];
    }

    get appInitHandlers(){return this._appInitHandlers;}
    addAppInitHandlers(handlers){
        this._appInitHandlers = [...this._appInitHandlers,...handlers];
    }

    get controllerIocKeys(){return this._controllerIocKeys;}
    addControllerIocKeys(keys){
        this._controllerIocKeys = [...this.controllerIocKeys,...keys];
    }

    get controllerClearKeys(){return this._controllerClearKeys;}
    addControllerClearKeys(keys){
        this._controllerClearKeys = [...this._controllerClearKeys,...keys];
    }

    get controllerAutoConfigKey(){return this._controllerAutoConfigKey;}
    addControllerAutoConfigKey(keys){
        this._controllerAutoConfigKey = [...this._controllerAutoConfigKey,...keys];
    }

    get controllerFilterHandlers(){return this._controllerFilterHandlers;}
    addControllerFilterHandlers(handlers){
        this._controllerFilterHandlers = [...this._controllerFilterHandlers,...handlers];
    }

    get controllerAfterHandlers(){return this._controllerAfterHandlers;}
    addControllerAfterHandlers(handlers){
        this._controllerAfterHandlers = [...this._controllerAfterHandlers,...handlers];
    }

    get controllerResultAdvices(){return this._controllerResultAdvices;}
    setControllerResultAdvice(advices){
        this._controllerResultAdvices = advices;
    }

    get controllerErrorAdvice(){return this._controllerErrorAdvice;}
    setControllerErrorAdvice(advice){
        this._controllerErrorAdvice = advice;
    }

    get appBeforeStartReady(){return this._appBeforeStartReady;}
    set appBeforeStartReady(func){
        this._appBeforeStartReady = func;
    }

    constructor(){

        this._appName = 'App';
        this._port = 3000;
        this._teletPort = 30000;
        this._timeout = 0;
        this._requestLimit = '1mb';
        this._viewFolder = null;//'views';
        this._staticFolder = null;
        this._viewEngine = 'ejs';
        this._i18nConfig = null;
        this._commands = {};
        this._supportMethods = ['get','post','options'];
        this._routesConfig = {};
        this._tasksConfig = {};
        this._appInitConfigHandlers = [];
        this._appInitHandlers = [];
        this._controllerIocKeys = [];
        this._controllerClearKeys = [];
        this._controllerAutoConfigKey = [];
        this._controllerFilterHandlers = [];
        this._controllerAfterHandlers = [];
        this._controllerResultAdvices = [];
        this._controllerErrorAdvice = null;
        this._appBeforeStartReady = null;
    }

    removeHandlers(...paras){
        var clearFunc = handler =>!(
            paras.filter(one=>typeof one === 'string').some(one=>one===handler.HANDLER_KEY)
            || paras.filter(one=>typeof one === 'function').some(one=>one===handler || handler instanceof one)
        );

        this._appInitConfigHandlers = this._appInitConfigHandlers.filter(clearFunc);
        this._appInitHandlers = this._appInitHandlers.filter(clearFunc);
        this._controllerFilterHandlers = this._controllerFilterHandlers.filter(clearFunc);
        this._controllerAfterHandlers = this._controllerAfterHandlers.filter(clearFunc);
    }



}