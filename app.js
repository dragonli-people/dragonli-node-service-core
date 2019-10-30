const AppWithExpress = require('./webservicecore/app/AppWithExpress');
const AppConfig = require('./webservicecore/runapp/AppConfig');

class Controller1 {
    async index(){
        return {msg:'welcome! you could visit: ./hello'};
    }

    async hello(){
        return {msg:'hello world'};
    }
}
const routerConf = [
    {url:'/',clz:Controller1,method:'index'},
    {url:'/hello',clz:Controller1,method:'hello'},
];

const config = new AppConfig();
config.addRoutesConfig(routerConf);
config.setPort(process.env.PORT||3001);
(new AppWithExpress()).start(config);
