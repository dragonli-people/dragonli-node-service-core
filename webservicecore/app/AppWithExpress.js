/**
 * Created by ruifan on 17-3-28.
 */
const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const i18n = require('i18n'); // i18n国际化配置引入

http.globalAgent.maxSockets = process.env.HTTP_MAX_SOCKET || 40000
const ExceptoinWithErrorCode = require('./ExceptoinWithErrorCode')

const executingSet = new Set();
const removeSet = new Set();
const DATA_POOL = {};
const CONFIG_POOL = {};
const REQUEST_VARS_POOL = [];
const _global = {}; //全局变量

DATA_POOL['http'] = http;
DATA_POOL['express'] = express;

//默认服务
var defaultAppName = null;

const Sleep = t => new Promise(res => setTimeout(_ => res(), t ));
/**
 * 全局捕捉异常
 * 可选异常捕捉方式，控制台或者记录到文件
 */
process.on('uncaughtException', (err) => {
	console.error(`app caught uncaughtException: ${err}`)
	console.error(`app caught uncaughtException: ${err && err.stack || ''}`)
    // fs.writeSync(1, `Caught exception: ${err}\n`);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('app caught unhandledRejection at:', p, 'reason:', reason);
});

/**
 * 服务器异常处理对应回调
 */
function onError(error) {
    console.error(error);
}

/**
 * Event listener for HTTP server "listening" event.
 *
 */
function onListening() {
    let addr = this.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.debug('App start!Listening on ' + bind);
}

// 循环任务相关，Express启动后执行
async function taskTick() {
    this.status = 1
    try{
        await this.handler.run()
    }catch (e){

    }
    this.status = 2
}
async function taskSleep() {
    this.status = 3
    await Sleep( this.interval )
    this.status = 4
}

module.exports = class {
    constructor() {
        this.handlingCount0 = 0;
        this.handlingCount1 = 0;
        this.handlingCount2 = 0;
        this.handlingCount3 = 0;

        this.controllerDic = new Map()
        this.otherDic = new Map()
        this.tasks = {}
    }

    get global(){
        return _global;
    }

    // get DATA_POOL(){
    //     return DATA_POOL;
    // }

    putToPool(key,value){
        return DATA_POOL[key] = value;
    }

    putConfigToPool(key,config){
        return CONFIG_POOL[key] = config;
    }

    getFromPool(key){
        return DATA_POOL[key];
    }

    getConfigFromPool(key){
        return CONFIG_POOL[key];
    }

    /**
     * 加载配置启动App
     * @param config {appName, port, routes, viewFolder, publicFolder, viewEngine, i18nConfig}
     */
    async start(config){
        var app = express();
        DATA_POOL[config.appName] = app;
        defaultAppName = defaultAppName || config.appName;

        this.app = app;
        this.config = config;
        this.taskConfig = config.tasksConfig;

        // @TODO
        for( var func = null,i = 0 ; config.appInitConfigHandlers && i < config.appInitConfigHandlers.length ; i++ ){
            ( config.appInitConfigHandlers[i] && typeof config.appInitConfigHandlers[i] === 'function' && ( func = config.appInitConfigHandlers[i] ) )
            || ( config.appInitConfigHandlers[i].init
                && typeof config.appInitConfigHandlers[i].init === 'function' && ( func = config.appInitConfigHandlers[i].init ) );
            func && await func.call(config.appInitConfigHandlers[i],this,DATA_POOL,CONFIG_POOL);
        }
        func = null;

        /**
         * i18n国际化配置和注册
         */
        config.i18nConfig && i18n.configure({
            locales:config.i18nConfig.locales,  // setup some locales - other locales default to en_US silently
            // defaultLocale:i18nConfig.defaultLocale,
            directory: config.i18nConfig.localesDirectory,  // i18n 翻译文件目录，我的是 i18n， 可以写成其他的。
            updateFiles: config.i18nConfig.updateFiles || false,
            indent: config.i18nConfig.indent || "\t",
            // extension: '.js'  // 由于 JSON 不允许注释，所以用 js 会方便一点，也可以写成其他的，不过文件格式是 JSON
        });
        config.i18nConfig && app.use(i18n.init);

        /**
         * Create HTTP server.
         */
        this.server = http.createServer(app);
        this.routes = express.Router();

        for( var func = null,i = 0 ; config.appInitHandlers && i < config.appInitHandlers.length ; i++ ){
            ( config.appInitHandlers[i] && typeof config.appInitHandlers[i] === 'function' && ( func = config.appInitHandlers[i] ) )
            || ( config.appInitHandlers[i].init
                && typeof config.appInitHandlers[i].init === 'function' && ( func = config.appInitHandlers[i].init ) );
            func && await func.call(config.appInitHandlers[i],this,DATA_POOL,CONFIG_POOL);
        }

        // 请求路由初始化
        ( config.supportMethods || ['get','post','options'] ).map(
            v=>v.toLocaleLowerCase()).forEach(name => this.routes[name]
                && typeof this.routes[name] === 'function' && this.routes[name]('/*',(...paras) => this.handle(...paras)));

        // view engine setup
        config.viewFolder && app.set('views', path.join("./", config.viewFolder));
        config.viewEngine && app.set('view engine', config.viewEngine);
        // staticFolder,staticRootName
        //example:
        // app.use('/static', express.static('public'));
        config.staticFolder && app.use(config.staticRootName || '/', express.static(config.staticFolder));
        app.use( (req,res,next) => {req && delete req.headers['content-encoding']; next();})
        app.use(bodyParser.json({limit: config.requestLimit}));
        app.use(bodyParser.urlencoded({ extended: false, limit:config.requestLimit}));
        app.use(cookieParser());
        app.use('/', this.routes);

        config.appBeforeStartReady && await config.appBeforeStartReady(this,DATA_POOL,CONFIG_POOL);

        //todo 支持路径参数

        /**
         * Listen on provided port, on all network interfaces.
         */
        app.set('port', config.port);
        this.server.on('error', onError);
        this.server.on('listening', onListening);
        this.server.setTimeout(config.timeout);
        this.server.listen(config.port);

        // 循环任务相关
        this.taskStopFlag = false;
        this.taskTick();

        await Sleep(32);
        console.log('==========app started done!==========')
    }

    /**
     * 处理请求
     */
     async handle(request, response, next) {
        let t = Date.now();
        let url = request.originalUrl.split('?')[0];
        let config = this.config.routesConfig[url];
        if(!config )
            return
        if( this.config.supportMethods.indexOf(request.method.toLocaleLowerCase()) < 0 )
            return
        const context = {},controllerIocKeys = [];
        let controller = this.createController(url, request, response);
        controller.handleStartTime = t;
        if( !controller )
            return
        this.handlingCount0++;
        try {
            await this.runHandlerRequest(url, config, controller,context,controllerIocKeys, request, response);
        }catch (e) {
            console.error(e);
            await this.handlerError(url, controller,context,controllerIocKeys, request, response, config,e);
        }
        this.handlingCount0--;
        this.backControllerToPool(url,request,response,controller);
    }

    /**
     * 执行url对应的方法
     */
    async runHandlerRequest (url, config, controller,context,controllerIocKeys, request, response) {
        var result = null;
        this.handlingCount1++;

        this.execIoc(controller,context,controllerIocKeys, request, response, config);
        if (!config.method || !controller[config.method] || !typeof controller[config.method] === 'function') {
            this.handlingCount1--;
            throw new Error('no such methoed!');
        }

        this.handlingCount2++;
        if( !( await this.execFilter(controller,context,controllerIocKeys,request,response,config) ) ) {
            this.handlingCount1--;
            this.handlingCount2--;
            return;
        }
        try{
            result = await controller[config.method]();
        }catch (e) {
            this.handlingCount1--;
            this.handlingCount2--;
            throw e;
        }
        this.handlingCount2--;
        if(!result)
        {
            this.handlingCount1--;
            return;
        }

        try {
            await this.execAfterHandler(controller, context,controllerIocKeys,request, response, config) ;
            var adives = config.resultAdvices || this.config.controllerResultAdvices || [];
            for( var  i = 0 ; i < adives.length ; i++ ) {
                var adive = adives[i];
                var func = typeof adive === 'function' ? adive : adive.beforeBodyWrite;
                if(!func || typeof func !== 'function')
                    throw new Error('advice must be function or advice.beforeBodyWrite must be function');
                result = result && await func.call( adive === func ? null : adive
                    , result,controller,request,response,context,controllerIocKeys,config,this);
            }
            await this.sendResult(config, url, controller, request, response, result);
        }catch (e) {
            this.handlingCount1--;
            throw e;
        }
        this.handlingCount1--;

        this.handlingCount3++;

        // 后置处理
        try{
             !config.template && config.afterHandler && controller[config.afterHandler]
                && typeof controller[config.afterHandler] === 'function'
                && await controller[config.afterHandler](...( controller.afterParas || [] ) );
        }catch (e) {
            console.error(e);
        }
        try{
            controller.clear && typeof controller.clear === 'function' && controller.clear();
        }catch (e) {
            console.error(e);
        }
        controller.afterParas = null;
        this.clearIoc(controller,context,controllerIocKeys,request,response,config);
        this.handlingCount3--;
    }


    /**
     *  请求处理完成，数据返回
     */
    async sendResult(config, url, controller, request, response, data) {
        if(!data )
            return

        if (config.template)
        {
            response.set({
                'Content-Type':'text/html'
            });
            response.render(config.template, data)
            return
        }
        if(config.responseType === 'buffer' || config.responseType === 'object')//待配置成常量
        {
            response.send(data)
            return
        }
        response.send(JSON.stringify(data))
    }

    /**
     * 请求异常处理
     */
    async handlerError(url,controller ,context,controllerIocKeys,request, response,config,e){
        var advice = config.errorAdvice || this.config.controllerErrorAdvice;
        var func = typeof advice === 'function' ? advice : advice.exception;
        if(!func || typeof func !== 'function'){
            console.error(e);
            return e;
        }
            // throw new Error('advice must be function or advice.beforeBodyWrite must be function');
        func.call(advice === func ? null : advice,e,controller, request, response,context,config,this);
    }

    createController(url, request, response) {
        let queue = this.controllerDic.get(url) || [];
        let config = this.config.routesConfig[url]
        if (!queue || !config)
            return;
        let controller = queue.length === 0 ? new config.clz() : queue.pop()
        // todo executing
        executingSet.add(controller);


        //配置分组
        this.config.i18nConfig && ( controller.i18nDefaultLocale = this.config.i18nConfig.defaultLocale );
        return controller
    }

    backControllerToPool(url, request, response,controller){
        let arr = this.controllerDic.get(url);
        arr || this.controllerDic.set(url,arr = []);
        !removeSet.has(controller) && arr.push(controller);
        executingSet.delete(controller);
        removeSet.delete(controller);
    }

    /**
     * 预处理，对象初始化
     * @param controller
     * @param request
     * @param response
     * @param config
     */
    execIoc(controller,context,controllerIocKeys, request, response, config){
        controller.request = request;
        controller.response = response;
        let para1 = request.query || {}
        let para2 = JSON.parse( para1.BODY || JSON.stringify({}) )
        para2 = para2.MESSAGE_BODY || para2
        let para3 = request.body || {}
        para3 = para3.MESSAGE_BODY || para3

        controller.paras = Object.assign({},para1,para2,para3)
        controller.context = context;
        controller.controllerIocKeys = controllerIocKeys;
        controller.url = config.url;
        controller.config = config;
        controller.app = this;

        this.execIocFromPool(controller);
    }

    execIocFromPool(obj,clear=false){
        var icoKeys = [ ...this.config.controllerIocKeys,...(obj.icoKeys || [])].map(this.formatKey) ;
        var configKeys = [  ...this.config.controllerAutoConfigKey,...(obj.autoConfigKey||[])].map(this.formatKey);
        icoKeys.forEach( ({sourceKey,destKey}) => obj[destKey] = !clear && DATA_POOL[sourceKey] || null );
        !clear && icoKeys.filter(({destKey}) =>!obj[destKey])
            .forEach( ({sourceKey,destKey}) =>obj[destKey] = obj.context && obj.context[sourceKey] || null );
        configKeys.forEach( ({sourceKey,destKey}) => obj[destKey] = !clear && CONFIG_POOL[sourceKey] || null );
    }

    formatKey(key){
        var arr = key.split(':');
        return {sourceKey:arr[0],destKey:arr[1]||arr[0]};
    }

    clearIoc(controller,context,controllerIocKeys, request, response,config) {
        this.execIocFromPool(controller,true);

        controller.request = null;
        controller.response = null;
        controller.paras = null;
        controller.context = null;
        controller.controllerIocKeys = null;
        controller.afterResponse = null;
        controller.afterParas = null;
        controller.i18nDefaultLocale = null;

        var clearKeys = [...(config.controllerClearKeys||[]),...(controllerIocKeys||[])];
        clearKeys.forEach(key=>controller[key]=null);
    }

    /**
     * 过滤器
     * 可定制方法对应的过滤器，或者定义通用的过滤器
     */
    async execFilter(controller, context, controllerIocKeys, request, response, config) {
        var filters = config.filterHandlers || this.config.controllerFilterHandlers || [] ;
        for (var i = 0; i < filters.length; i++) {
            var current = filters[i];
            var func = typeof current === 'function' ? current : current.doFilter;
            if( !(await func.call( current === func ? null : current ,
                     controller,context,controllerIocKeys, request, response, config, this )))
                return false;
        }
        return true;
    }

    /**
     * 后置处理器
     * 请求结构发送后，进行某些处理，可定制/通用
     * 可用于用户行为的记录等
     */
    async execAfterHandler(controller,context,controllerIocKeys, request, response, config) {
        var afterHandlers = config.afterHandlers || this.config.controllerAfterHandlers || [] ;
        for (var i = 0; i < afterHandlers.length; i++) {
            var current = afterHandlers[i];
            var func = typeof current === 'function' ? current : current.afterCompletion;
            await func.call( current === func ? null : current ,
                controller,context,controllerIocKeys, request, response, config, this );
        }
    }

    /**
     * 循环任务
     */
    async taskTick()
    {
        while(true)
        {
            Object.keys(this.tasks).forEach( k=>{
                if( !k ) return ;
                let task = this.tasks[k]

                //运行中的不予处理
                if(task.status === 1)
                    return

                //已停止的要剔除
                if(task.stoped)
                {
                    task.handler.config = null;
                    task.handler.app = null;
                    task.handler = null;
                    this.execIocFromPool(task.handler,true);
                    delete this.tasks[k]
                    return
                }

                if(task.status === 3 ){
                    return
                }

                if(task.status === 2 )
                {
                    task.taskSleep()
                    return
                }

                if(task.status === 0 || task.status === 4)
                {
                    task.taskTick()
                    return
                }

                //todo 执行到此处是有问题的...，有待日志记录
            })

            !this.taskStopFlag && Object.keys(this.taskConfig).forEach(k => {
                if (this.tasks[k])
                    return

                let config = this.taskConfig[k]
                if ( config.onlyOne && (!process.env.TASK_UNIQUE_SERVER || !parseInt(process.env.TASK_UNIQUE_SERVER)))
                    return //有些task是分布式唯一服务器才执行的，若本服务器不是，则不创建此任务

                let interval = config.interval || 8
                let handler = new config.clz()
                handler.run = handler[config.method]
                handler.config = config
                handler.app = this;
                this.execIocFromPool(handler);

                let task = {
                    status: 0,
                    stoped: false,
                    config,
                    interval,
                    handler,
                    taskTick,
                    taskSleep,
                }
                this.tasks[k] = task;
            })
            await Sleep(8)
        }


    }

    /**
     * 停止task队列
     * @returns {Promise.<string>}
     */
    async stop() {
        this.taskStopFlag = false;
        Object.values(tasks).forEach(v=>v.stoped=true)
        while(true)
        {
            console.log('Stop===Run',Object.keys(tasks).length)
            if(Object.keys(tasks).length === 0) {
                return 'stop success'
            }
            await Sleep(1)
        }
    }
    /**
     * 开始task队列
     * @returns {Promise.<string>}
     */
    async startTask() {
        this.taskStopFlag = true;
        console.log('start===Run')
        return 'start success'
    }

    // 放在启动插件中实现
    // async handleCommand(key, ...paras){
    //
    //     let value = this.commandConfig[key];
    //     if(!value) return 'CommandError'
    //     let obj = new value.clz();
    //     //todo 加检测
    //     if(!instance){
    //         return 'Instance==Error!'
    //     }
    //     let result = obj[value.methods](instance, ...paras);
    //     if(result instanceof Promise){
    //         return await result;
    //     }
    //     return result;
    // }
}
