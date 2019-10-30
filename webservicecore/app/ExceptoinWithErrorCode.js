
module.exports = class extends Error {

    constructor(errCode,msg=''){
        super(msg);
        this.errCode = errCode;
    }

    clear(){

    }
}