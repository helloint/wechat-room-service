import {
  log,
} from 'wechaty';

const logPrefix = process.env['WECHATY_LOG_PREFIX'];
if (logPrefix) {
  log.prefix(logPrefix);
  log.silly('Logger', 'Config: WECHATY_LOG_PREFIX set prefix to %s', logPrefix);
}

export default log;
