import {
  Contact,
  Message,
  ScanStatus,
  WechatyBuilder,
} from 'wechaty';
// @ts-ignore
import qrcodeTerminal from 'qrcode-terminal';
import config from './config.js';
import type {IRoomSetting} from './type.js';
import log from './logger.js';

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
    log.info('[StarterBot] onScan: %s(%s) - %s', ScanStatus[status], status, qrcodeImageUrl)

    qrcodeTerminal.generate(qrcode, {small: true})  // show qrcode on console

  } else {
    log.info('[StarterBot] onScan: %s(%s)', ScanStatus[status], status)
  }
}

function onLogin(user: Contact) {
  log.info('[StarterBot] %s login', user)

  setting.rooms.forEach((async roomSetting => {
    if ('notifies' in roomSetting) {
      const listenerRoom = await bot.Room.find({topic: roomSetting.topic});
      if (listenerRoom) {
        log.info('# registered listener room, topic: %s', roomSetting.topic);
        roomSetting.notifies.forEach((async notifyRoomSetting => {
          const notifyRoom = await bot.Room.find({topic: notifyRoomSetting.topic});
          if (notifyRoom) {
            log.info('## registered notify room, topic: %s', notifyRoomSetting.topic);
            notifyRoomSetting.ref = notifyRoom;
          }
        }));
      } else {
        log.warn('# listener room not found, topic: %s', roomSetting.topic);
      }
    } else {
      log.info('# process share group, name: %s', roomSetting.name);
      roomSetting.shares.forEach((async shareRoomSetting => {
        const shareRoom = await bot.Room.find({topic: shareRoomSetting.topic});
        if (shareRoom) {
          log.info('# registered share room, topic: %s', shareRoomSetting.topic);
          shareRoomSetting.ref = shareRoom;
        } else {
          log.warn('# share room not found, topic: %s', shareRoomSetting.topic);
        }
      }));
    }
  }));
}

function onLogout(user: Contact) {
  log.info('[StarterBot] %s logout', user)
}

async function onMessage(msg: Message) {
  try {
    log.info('[StarterBot] %s', msg.toString());
    const room = msg.room();
    const topic = await room?.topic();
    const sender = msg.talker();
    // const content = msg.text()
    if (room && topic && !sender.self()) {
      log.debug(`message.type: ${msg.type()}`);
      log.debug(`room.id: ${room.id}, room.topic: ${topic}`);
      log.debug(`sender.id: ${sender.id}, sender.name: ${sender.name()}, isSelf: ${sender.self()}`);

      setting.rooms.forEach(roomSetting => {
        if ('notifies' in roomSetting) {
          if (roomSetting.topic === topic) {
            log.verbose('room match!');
            let senderMatch = true;
            if (roomSetting.people && roomSetting.people.length > 0) {
              senderMatch = !!roomSetting.people.find(name => name === sender.name());
            }
            if (senderMatch) {
              log.verbose('sender match!');
              roomSetting.notifies.forEach((notifyRoomSetting) => {
                let notifyRoom = notifyRoomSetting.ref;
                if (notifyRoom) {
                  log.debug(`notifyRoom found: ${notifyRoomSetting.topic}`);
                  // 过滤接龙。接龙属于文本信息，但每个群数据独立，转发没有意义。
                  if (msg.text().startsWith('#接龙')) {
                    notifyRoom.say(sender.name() + ' 发起了一个群接龙。');
                  } else {
                    msg.forward(notifyRoom);
                    msg.text()
                    log.info('[Status] Notify Success');
                  }
                }
              });
            }
          }
        } else {

          if (msg.type() === bot.Message.Type.Text) {
            roomSetting.shares.forEach(shareRoomSetting => {
              if (shareRoomSetting.topic === topic) {
                log.verbose('room match!');
                let senderMatch = true;
                if (shareRoomSetting.people && shareRoomSetting.people.length > 0) {
                  senderMatch = !!shareRoomSetting.people.find(name => name === sender.name());
                }

                if (senderMatch) {
                  log.verbose(`sender match!`);

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
                    // 过滤接龙。接龙属于文本信息，但每个群数据独立，转发没有意义。
                    message = msgPrefix + '发起了一个群接龙。';
                  } else {
                    message = msgPrefix + msg.text();
                  }
                  log.info('message: ' + message);

                  roomSetting.shares.filter(room => room.topic != topic)
                    .forEach(notifyRoomSetting => {
                      let notifyRoom = notifyRoomSetting.ref;
                      if (notifyRoom) {
                        log.debug(`notifyRoom found: ${notifyRoomSetting.topic}: `);
                        notifyRoom.say(message);
                        log.info('[Status] Notify Success');
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
    log.error('Bot on(message) exception: %s', e)
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
  .then(() => log.info('[StarterBot] Starter Bot Started.'))
  .catch(e => log.error('[StarterBot] %s', e))
