import * as moment from 'moment';

class Logger{
  log(...args: any[]): void{
    //let args = [`${moment().format()}:`].concat(Array.from(arguments));
    console.log(...args);
  }

  error(...args: any[]): void{
    //let args = [`${moment().format()}:`].concat(Array.from(arguments));
    console.error(...args);
  }

  trace(...args: any[]): void{
    //let args = [`${moment().format()}:`].concat(Array.from(arguments));
    console.trace(...args);
  }
}

export let logger = new Logger();