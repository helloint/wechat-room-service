import {
  Contact,
  Message,
  ScanStatus,
} from 'wechaty';
import log from './logger.js';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
import bot from "./bot.js";
import {initRooms, processMessage} from "./message.js";
import {registerMonitor, terminateProcess} from "./handler.js";

function onScan(qrcode: string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')
    log.info('StarterBot', 'onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

    qrcodeTerminal.generate(qrcode, {small: true})  // show qrcode on console

  } else {
    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status)
  }
}

function onLogin(user: Contact) {
  log.info('StarterBot', '%s login', user)
  initRooms();
}

function onLogout(user: Contact) {
  log.info('StarterBot', '%s logout', user)
}

async function onMessage(msg: Message) {
  log.info('StarterBot', '%s', msg.toString());
  await processMessage(msg);
}

function onStop() {
  log.info('🧵Debug', `bot stopped.`);
  terminateProcess();
}

bot.on('scan', onScan)
bot.on('login', onLogin)
bot.on('logout', onLogout)
bot.on('message', onMessage)
bot.on('stop', onStop)

bot.start()
  .then(() => {
    log.info('StarterBot', 'Starter Bot Started.');
    registerMonitor();
  })
  .catch(e => log.error('StarterBot', '%s', e))
