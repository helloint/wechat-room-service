import {createLogger, format, transports} from 'winston';

const {combine, timestamp, printf, splat} = format;

const myFormat = printf(({level, message, timestamp}) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: combine(
    splat(),
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console(),
    // new transports.File({ filename: 'error.log', level: 'error'})
  ]
});

export default logger;
