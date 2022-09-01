import {
  Contact,
  Message,
  ScanStatus,
  WechatyBuilder,
  log,
} from 'wechaty';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
import config, {INotifyRoomSetting} from './config.js';
// TODO: try hotImport
// import {hotImport} from "hot-import";
// const config: IConfig = await hotImport('config.js')

function onScan(qrcode: string, status: ScanStatus) {
  /*
  各种奇怪的异常：
  不出二维码：
    GError: there is no WechatyBro in browser(yet)
    Error: @swc/core threw an error when attempting to validate swc compiler options.
  手机扫码页面打不开：
  手机扫码成功后：
    GError: onLogin() TTL expired.
   */
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

  // log.info(config.rooms);
  config.rooms.forEach((async listenerRoomConfig => {
    // log.info(roomConfig);
    const listenerRoom = await bot.Room.find({topic: listenerRoomConfig.topic});
    if (listenerRoom) {
      log.info('# registered listener room, topic: ', listenerRoomConfig.topic);
      listenerRoomConfig.ref = listenerRoom; // 这个好像不需要
      const notifyRoomsSetting: INotifyRoomSetting[] = [];
      listenerRoomConfig.notifyRooms.forEach((async notifyRoomTopic => {
        const notifyRoom = await bot.Room.find({topic: notifyRoomTopic});
        if (notifyRoom) {
          log.info('## registered notify room, topic: ', notifyRoomTopic);
          notifyRoomTopic = notifyRoom;
          notifyRoomsSetting.push({
            topic: notifyRoomTopic,
            ref: notifyRoom,
          });
        }
      }));
      listenerRoomConfig.notifyRooms = notifyRoomsSetting;
    }
  }));
}

function onLogout(user: Contact) {
  log.info('StarterBot', '%s logout', user)
}

async function onMessage(msg: Message) {
  try {
    log.info('StarterBot', msg.toString());
    const room = msg.room();
    const topic = await room?.topic();
    const sender = msg.talker();
    // const content = msg.text()
    if (room && topic) {
      log.verbose(`message.type: ${msg.type()}`);
      log.verbose(`room.id: ${room.id}, room.topic: ${topic}`);
      log.verbose(`sender.id: ${sender.id}, sender.name: ${sender.name()}, isSelf: ${sender.self()}`);

      config.rooms.forEach(roomSetting => {
        if (roomSetting.topic === topic) {
          log.verbose(`room match!`);
          let senderMatch = roomSetting.people.find(name => name === sender.name());
          if (senderMatch) {
            log.verbose(`sender match!`);
            roomSetting.notifyRooms.forEach(notifyRoomSetting => {
              let notifyRoom = notifyRoomSetting.ref;
              if (notifyRoom) {
                log.verbose(`notifyRoom found: ${notifyRoomSetting.topic}`);
                // 过滤接龙。接龙属于文本信息，但每个群数据独立，转发没有意义。
                if (msg.text().startsWith('#接龙')) {
                  notifyRoom.say(sender.name() + ' 发起了一个群接龙。');
                } else {
                  msg.forward(notifyRoom);
                  log.info(`【Notify Succeed】`);
                }
              }
            });
          }
        }
      });
    }
  } catch (e) {
    log.error('Bot', 'on(message) exception: %s', e)
  }
}

const bot = WechatyBuilder.build({
  name: 'room-message-forward',
  /**
   * How to set Wechaty Puppet Provider:
   *
   *  1. Specify a `puppet` option when instantiating Wechaty. (like `{ puppet: 'wechaty-puppet-whatsapp' }`, see below)
   *  1. Set the `WECHATY_PUPPET` environment variable to the puppet NPM module name. (like `wechaty-puppet-whatsapp`)
   *
   * You can use the following providers locally:
   *  - wechaty-puppet-wechat (web protocol, no token required)
   *  - wechaty-puppet-whatsapp (web protocol, no token required)
   *  - wechaty-puppet-padlocal (pad protocol, token required)
   *  - etc. see: <https://wechaty.js.org/docs/puppet-providers/>
   */
  puppet: 'wechaty-puppet-wechat',
  puppetOptions: {
    uos: true  // 开启uos协议
  },

  /**
   * You can use wechaty puppet provider 'wechaty-puppet-service'
   *   which can connect to remote Wechaty Puppet Services
   *   for using more powerful protocol.
   * Learn more about services (and TOKEN) from https://wechaty.js.org/docs/puppet-services/
   */
  // puppet: 'wechaty-puppet-service'
  // puppetOptions: {
  //   token: 'xxx',
  // }
})

bot.on('scan', onScan)
bot.on('login', onLogin)
bot.on('logout', onLogout)
bot.on('message', onMessage)

bot.start()
  .then(() => log.info('StarterBot', 'Starter Bot Started.'))
  .catch(e => log.error('StarterBot', e))
