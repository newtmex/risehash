import * as moment from 'moment';

class Logger{
  log(...args: any[]): void{
    args = [`${moment().format()}:`].concat(Array.from(args));
    console.log(...args);
  }

  error(...args: any[]): void{
    args = [`${moment().format()}:`].concat(Array.from(args));
    console.error(...args);
  }

  trace(...args: any[]): void{
    args = [`${moment().format()}:`].concat(Array.from(args));
    console.trace(...args);
  }
}

export let logger = new Logger();