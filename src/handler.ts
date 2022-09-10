import type {PuppetWeChat} from "wechaty-puppet-wechat";
import log from "./logger.js";
import bot from "./bot.js";
import {Watchdog} from 'watchdog';

const WATCHDOG_TIMEOUT = 300 * 1000;  // 5 minutes
const dog = new Watchdog(WATCHDOG_TIMEOUT);
dog.on('reset', handleHeartbeat);
const food = {data: 'delicious'};

const registerMonitor = () => {
  dog.feed(food);
  // puppet (node_modules/wechaty-puppet-wechat/src/puppet-wechat.ts)
  log.info('🧵Debug', `registerMonitor`);
  bot.puppet.on('error', async () => {
    const timeout = 5;
    log.info('🧵Debug', `puppet error. stop bot in ${timeout} seconds`)
    setTimeout(async () => {
      log.info('🧵Debug', 'stop bot');
      await bot.stop();
    }, timeout * 1000);
  });

  // watchdog (node_modules/watchdog/src/watchdog.ts)
  // (bot.puppet as PuppetWeChat).scanWatchdog.on('reset', ()=>{
  // log.info('🧵Debug', 'scanWatchdog reset');
  // }).on('feed', ()=>{
  //   log.info('🧵Debug', 'scanWatchdog feed');
  // }).on('sleep', ()=>{
  //   log.info('🧵Debug', 'scanWatchdog sleep');
  // });

  // bridge (node_modules/wechaty-puppet-wechat/src/bridge.ts)
  (bot.puppet as PuppetWeChat).bridge.on('heartbeat', () => {
    log.info('🧵Debug', 'bridge heartbeat');
    dog.feed(food);
  });

  // agent (node_modules/wechaty-puppet/src/agents/watchdog-agent.ts)
  // agent好像没有事件抛出
}

function handleHeartbeat() {
  log.info('🧵Debug', 'heartbeat no response.');
  terminateProcess();
}

/**
 * uncaughtException 这个异常:
 * GError: WatchdogAgent reset: lastFood: "{"data":"heartbeat@browserbridge ding","timeoutMilliseconds":60000}"
 * 有时候会被 node_modules/wechaty/src/config.ts 里的process.on代码捕获，有时候又不会。
 * 不管怎么说，在这里再捕获一下，然后强制推出。
 */
const handleUncaughtException = (e: Error | any) => {
  log.info('🧵Debug', `uncaughtException ${e}`);
  terminateProcess();
}

const terminateProcess = () => {
  const timeout = 5;
  log.info('❌Debug', `terminate process in ${timeout} seconds`);
  setTimeout(() => {
    process.exit();
  }, timeout * 1000);
}

process.on('uncaughtException', handleUncaughtException);

export {
  terminateProcess,
  registerMonitor,
}
