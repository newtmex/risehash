const moment = require('moment');

function Logger (){
  this.log = function (info){
    return console.log(`${moment().format()}: ${info}`);
  }

  this.error = function (info){
    return console.error(`${moment().format()}: ${info}`);
  }
}
module.exports = new Logger()