const ExceptoinWithErrorCode = require('./ExceptoinWithErrorCode');
module.exports = function (conditions,errCodes,messages) {
    conditions = Array.isArray(conditions) ? conditions : [conditions];
    errCodes = Array.isArray(errCodes) ? errCodes : [errCodes];
    messages = Array.isArray(messages) ? messages : [messages];
    for( var i = 0 ; i < conditions.length ;i++ ){
        var errCode = errCodes[i] || 0;
        var message = messages[i] || '';
        if( !conditions[i] ) {
            if(!errCode)
                throw new Error('Assert Check Failed With not errorCode');
            throw new ExceptoinWithErrorCode(errCode,`Assert Check Failed:[${message}]`);
        }
    }
}