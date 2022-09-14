import type {PuppetWeChat} from "wechaty-puppet-wechat";
import log from "./logger.js";
import bot from "./bot.js";
import {Watchdog} from 'watchdog';

const ERROR_TIMEOUT = 5;
const WATCHDOG_TIMEOUT = 300;

const dog = new Watchdog(WATCHDOG_TIMEOUT * 1000);
dog.on('reset', handleHeartbeat);
const food = {data: 'delicious'};

const registerMonitor = () => {
  dog.feed(food);
  // puppet (node_modules/wechaty-puppet-wechat/src/puppet-wechat.ts)
  log.info('Debug', `🧵 registerMonitor`);

  bot.puppet.on('error', async () => {
    log.info('Debug', `🧵 puppet error. stop bot in ${ERROR_TIMEOUT} seconds`)
    setTimeout(async () => {
      log.info('Debug', '🧵 stop bot');
      await bot.stop();
    }, ERROR_TIMEOUT * 1000);
  });

  // watchdog (node_modules/watchdog/src/watchdog.ts)
  // (bot.puppet as PuppetWeChat).scanWatchdog.on('reset', ()=>{
  // log.info('Debug', '🧵 scanWatchdog reset');
  // }).on('feed', ()=>{
  //   log.info('Debug', '🧵 scanWatchdog feed');
  // }).on('sleep', ()=>{
  //   log.info('Debug', '🧵 scanWatchdog sleep');
  // });

  // bridge (node_modules/wechaty-puppet-wechat/src/bridge.ts)
  (bot.puppet as PuppetWeChat).bridge.on('heartbeat', () => {
    log.info('Debug', '🧵 bridge heartbeat');
    dog.feed(food);
  });

  // agent (node_modules/wechaty-puppet/src/agents/watchdog-agent.ts)
  // agent好像没有事件抛出
}

function handleHeartbeat() {
  log.info('Debug', '🧵 heartbeat no response.');
  terminateProcess();
}

/**
 * 意外异常，退出进程，交由守护进程（pm2）处理。
 *
 * uncaughtException
 * GError: WatchdogAgent reset: lastFood: "{"data":"heartbeat@browserbridge ding","timeoutMilliseconds":60000}"
 * 此异常有时候会被 node_modules/wechaty/src/config.ts 里的process.on代码捕获，有时候又不会。
 */
const handleUncaughtException = (e: Error | any) => {
  log.info('Debug', `🧵 uncaughtException ${e}`);
  terminateProcess();
}

const terminateProcess = () => {
  log.info('Debug', `❌ terminate process in ${ERROR_TIMEOUT} seconds`);
  setTimeout(() => {
    process.exit();
  }, ERROR_TIMEOUT * 1000);
}

process.on('uncaughtException', handleUncaughtException);

export {
  terminateProcess,
  registerMonitor,
}
