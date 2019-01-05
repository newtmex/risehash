function Logger (){
  this.log = function (info){
    return console.log(`${new Date().toString()}: ${info}`);
  }

  this.error = function (info){
    return console.error(`${new Date().toString()}: ${info}`);
  }
}
module.exports = new Logger()