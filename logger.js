const moment = require('moment');

function Logger (){
  this.log = function (){
    let args = [`${moment().format()}:`].concat(Array.from(arguments));
    return console.log(...args);
  }

  this.error = function (){
    let args = [`${moment().format()}:`].concat(Array.from(arguments));
    return console.log(...args);
  }
}
module.exports = new Logger()