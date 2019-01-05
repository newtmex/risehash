function Logger (){
  this.log = function (info){
    return console.log(`${new Date().toLocaleDateString()}: ${info}`);
  }

  this.error = function (info){
    return console.error(`${new Date().toLocaleDateString()}: ${info}`);
  }
}
module.exports = new Logger()