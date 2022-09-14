import type {Message} from "wechaty";
import bot from "./bot.js";
import log from "./logger.js";
import setting from "./setting.js";

const processMessage = async (msg: Message) => {
  try {
    const room = msg.room();
    const talker = msg.talker();
    const talkerName = talker.name();
    const [topic, talkerAlias, mentionSelf] = await Promise.all([room?.topic(), room?.alias(talker), msg.mentionSelf()]);
    if (room && topic && !talker.self()) {
      /*
      Web登陆下，room.id和sender.id在每次登陆后都是随机生成的变量，所以没办法用来做唯一标识匹配。
      好在sender.name是WeChat唯一的。
      而群名则需要注意避免重名，不过一般也不会发生。最好是用群备注名做匹配，但不知道如何取到。
       */
      log.verbose('App', `message.type: ${msg.type()}`);
      log.verbose('App', `roomId: ${room.id}, roomAlias: unsupported, roomTopic: ${topic}`);
      log.verbose('App', `talkerId: ${talker.id}, talkerName: ${talkerName}, talkerAlias: ${talkerAlias}, isSelf: ${talker.self()}`);
      log.verbose('App', `mentionSelf: ${mentionSelf}`);

      setting.rooms.forEach(roomSetting => {
        if ('notifies' in roomSetting) {
          if (roomSetting.topic === topic) {
            log.verbose('App', 'Room match!');
            let senderMatch = true;
            if (roomSetting.people && roomSetting.people.length > 0) {
              senderMatch = !!roomSetting.people.find(name => name === talkerName);
            }
            if (senderMatch) {
              log.verbose('App', 'Sender match!');
              roomSetting.notifies.forEach(notifyRoomSetting => {
                let notifyRoom = notifyRoomSetting.ref;
                if (notifyRoom) {
                  log.verbose('App', `Notify Room found: ${notifyRoomSetting.topic}`);
                  if (isJieLong(msg.text())) {
                    notifyRoom.say(createMessage(msg));
                  } else {
                    msg.forward(notifyRoom);
                  }
                  log.info('App', `👌 Notify Success, topic: ${notifyRoomSetting.topic}`);
                }
              });
            }
          }
        } else {
          // 目前只转发文本信息。因为其他类型的消息，没有很好的办法用来标明sender。
          if (msg.type() === bot.Message.Type.Text) {
            roomSetting.shares.forEach(shareRoomSetting => {
              if (shareRoomSetting.topic === topic) {
                log.verbose('App', 'Room match!');
                let senderMatch = true;
                if (shareRoomSetting.people && shareRoomSetting.people.length > 0) {
                  senderMatch = !!shareRoomSetting.people.find(name => name === talkerName);
                }
                if (senderMatch) {
                  log.verbose('App', `Sender match!`);
                  const roomShortName = shareRoomSetting.abbr || shareRoomSetting.topic || 'Nowhere';
                  const content = createMessage(msg, roomSetting.useAlias ? talkerAlias || talkerName : talkerName, roomShortName);
                  log.verbose('App', 'Message: ' + content);
                  roomSetting.shares.filter(room => room.topic != topic)
                    .forEach(notifyRoomSetting => {
                      let notifyRoom = notifyRoomSetting.ref;
                      if (notifyRoom) {
                        log.verbose('App', `Share room found: ${notifyRoomSetting.topic}`);
                        notifyRoom.say(content);
                        log.info('App', `👌 Notify Success, topic: ${notifyRoomSetting.topic}`);
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
 * Generate the message
 * Sample:
 *  [idealist@Home 9]: 只要用gateway，就是经过服务器绕一圈
 *  [Juzi@Home 6]: 「Friday BOT：[Wayne 毛@Home 2]: [咖啡]」
 *  - - - - - - - - - - - - - - -
 *  [偷笑]
 *  [Juzi@Home 6]: 「Friday BOT：[Wayne 毛@Home 2]: [咖啡]」
 *  - - - - - - - - - - - - - - -
 *  [偷笑]
 * @param msg
 * @param talkerName
 * @param roomName
 */
const createMessage = (msg: Message, talkerName?: string, roomName?: string): string => {
  if (!talkerName) {
    talkerName = msg.talker().name();
  }
  let msgPrefix = roomName ? `[${talkerName}@${roomName}]:` : talkerName;
  let ret = '';
  if (isJieLong(msg.text())) {
    // 过滤接龙。接龙属于文本信息，但每个群数据独立，直接转发没有意义。
    ret = [msgPrefix, '发起了一个群接龙:', parseJieLongTitle(msg.text())].join(' ');
  } else {
    ret = [msgPrefix, msg.text()].join(' ');
  }
  return ret;
}

/**
 * 返回接龙的主题
 * Sample: #接龙<br/>234<br/>234<br/><br/>1. Wayne 毛，
 * return: <br/>234<br/>234<br/><br/>
 * @param msg
 */
const parseJieLongTitle = (msg: string): string => {
  if (isJieLong(msg)) {
    const content = msg.split('#接龙');
    if (content.length >= 2 && content[1]) {
      return content[1].split('1.')[0] || '';
    }
  }
  return '';
}

/**
 * 判断是否为接龙类型的文本消息
 * @param msg
 */
const isJieLong = (msg: string): boolean => {
  return msg?.startsWith('#接龙');
}

export {
  processMessage,
  createMessage,
};
