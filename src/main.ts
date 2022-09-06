import {
  Contact,
  Message,
  ScanStatus,
  WechatyBuilder,
} from 'wechaty';
import log from './logger.js';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
import config from './config.js';
import type {IRoomSetting} from './type.js';

// TODO: use hotImport to renew config.js
// import {hotImport} from "hot-import";
// const config: IConfig = await hotImport('config.js')

// init setting based on the config
const setting: IRoomSetting = {
  rooms: config.rooms.map(room => {
    if ('notifies' in room) {
      return {
        topic: room.topic,
        people: room.people,
        notifies: room.notifies.map(notifyRoomTopic => {
          return {
            topic: notifyRoomTopic,
            ref: null,
          }
        }),
        ref: null,
      }
    }
    return {...room}
  }),
}

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

  setting.rooms.forEach((async roomSetting => {
    if ('notifies' in roomSetting) {
      const listenerRoom = await bot.Room.find({topic: roomSetting.topic});
      if (listenerRoom) {
        log.info('App','# registered listener room, topic: %s', roomSetting.topic);
        roomSetting.notifies.forEach((async notifyRoomSetting => {
          const notifyRoom = await bot.Room.find({topic: notifyRoomSetting.topic});
          if (notifyRoom) {
            log.info('App','## registered notify room, topic: %s', notifyRoomSetting.topic);
            notifyRoomSetting.ref = notifyRoom;
          }
        }));
      } else {
        log.warn('App','# listener room not found, topic: %s', roomSetting.topic);
      }
    } else {
      log.info('App','# process share group, name: %s', roomSetting.name);
      roomSetting.shares.forEach((async shareRoomSetting => {
        const shareRoom = await bot.Room.find({topic: shareRoomSetting.topic});
        if (shareRoom) {
          log.info('App','# registered share room, topic: %s', shareRoomSetting.topic);
          shareRoomSetting.ref = shareRoom;
        } else {
          log.warn('App','# share room not found, topic: %s', shareRoomSetting.topic);
        }
      }));
    }
  }));
}

function onLogout(user: Contact) {
  log.info('StarterBot', '%s logout', user)
}

async function onMessage(msg: Message) {
  try {
    log.info('StarterBot', '%s', msg.toString());
    const room = msg.room();
    const topic = await room?.topic();
    const sender = msg.talker();
    // const content = msg.text()
    if (room && topic && !sender.self()) {
      log.verbose('App',`message.type: ${msg.type()}`);
      log.verbose('App',`room.id: ${room.id}, room.topic: ${topic}`);
      log.verbose('App',`sender.id: ${sender.id}, sender.name: ${sender.name()}, isSelf: ${sender.self()}`);

      setting.rooms.forEach(roomSetting => {
        if ('notifies' in roomSetting) {
          if (roomSetting.topic === topic) {
            log.verbose('App','room match!');
            let senderMatch = true;
            if (roomSetting.people && roomSetting.people.length > 0) {
              senderMatch = !!roomSetting.people.find(name => name === sender.name());
            }
            if (senderMatch) {
              log.verbose('App','sender match!');
              roomSetting.notifies.forEach((notifyRoomSetting) => {
                let notifyRoom = notifyRoomSetting.ref;
                if (notifyRoom) {
                  log.verbose('App',`notifyRoom found: ${notifyRoomSetting.topic}`);
                  // 过滤接龙。接龙属于文本信息，但每个群数据独立，直接转发没有意义。
                  if (msg.text().startsWith('#接龙')) {
                    notifyRoom.say(sender.name() + ' 发起了一个群接龙: ' + getJieLongTitle(msg.text()));
                  } else {
                    msg.forward(notifyRoom);
                    msg.text()
                    log.info('App', 'Notify Success');
                  }
                }
              });
            }
          }
        } else {

          if (msg.type() === bot.Message.Type.Text) {
            roomSetting.shares.forEach(shareRoomSetting => {
              if (shareRoomSetting.topic === topic) {
                log.verbose('App','room match!');
                let senderMatch = true;
                if (shareRoomSetting.people && shareRoomSetting.people.length > 0) {
                  senderMatch = !!shareRoomSetting.people.find(name => name === sender.name());
                }

                if (senderMatch) {
                  log.verbose('App',`sender match!`);

                  const talkerDisplayName = msg.talker().name();
                  const roomShortName = shareRoomSetting.abbr || shareRoomSetting.topic || 'Nowhere';
                  let msgPrefix = `[${talkerDisplayName}@${roomShortName}]: `;
                  let message = '';
                  // process the message pattern
                  /*
                  [idealist@Home 9]: 只要用gateway，就是经过服务器绕一圈
                  [Juzi@Home 6]: 「Friday BOT：[Wayne 毛@Home 2]: [咖啡]」
                  - - - - - - - - - - - - - - -
                  [偷笑]
                  [Juzi@Home 6]: 「Friday BOT：[Wayne 毛@Home 2]: [咖啡]」
                  - - - - - - - - - - - - - - -
                  [偷笑]
                   */
                  if (msg.text().startsWith('#接龙')) {
                    // 过滤接龙。接龙属于文本信息，但每个群数据独立，直接转发没有意义。
                    message = msgPrefix + '发起了一个群接龙: ' + getJieLongTitle(msg.text());
                  } else {
                    message = msgPrefix + msg.text();
                  }
                  log.info('App','message: ' + message);

                  roomSetting.shares.filter(room => room.topic != topic)
                    .forEach(notifyRoomSetting => {
                      let notifyRoom = notifyRoomSetting.ref;
                      if (notifyRoom) {
                        log.verbose('App',`notifyRoom found: ${notifyRoomSetting.topic}: `);
                        notifyRoom.say(message);
                        log.info('App', 'Notify Success');
                      }
                    });
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

/**
 * 返回接龙的主题
 * Sample: #接龙<br/>234<br/>234<br/><br/>1. Wayne 毛，
 * return: <br/>234<br/>234<br/><br/>
 * @param message
 */
const getJieLongTitle = (message: string): string => {
  const content = message.split('#接龙');
  if (content.length >= 2 && content[1]) {
    return content[1].split('1.')[0] || '';
  } else {
    return '';
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
  // Use UOS for Newly Wechat account
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
  .catch(e => log.error('StarterBot', '%s', e))
