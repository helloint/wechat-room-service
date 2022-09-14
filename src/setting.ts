import type {IRoomConfig, IRoomSetting} from "./type";
// TODO: try to load config.js dynamically using `hot-import`
import config from "./config.js";
import bot from "./bot.js";
import log from "./logger.js";

const ROOM_DETECT_INTERVAL = 60;

/**
 * init setting based on the config
 */
const initSetting = (config: IRoomConfig): IRoomSetting => {
  log.info('App', 'init setting')
  return {
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
    })
  }
};

const initRooms = async () => {
  // 初始化room，绑定room ref，减少后期查询时间
  log.info('App', 'init rooms')
  const totalResults: number[] = await Promise.all(setting.rooms.map((async (roomSetting): Promise<number> => {
    let count = 0;
    if ('notifies' in roomSetting) {
      const listenerRoom = await bot.Room.find({topic: roomSetting.topic});
      if (listenerRoom) {
        log.info('App', '👉 process listener room, topic: %s', roomSetting.topic);
        const results: number[] = await Promise.all(roomSetting.notifies.map(async (notifyRoomSetting): Promise<number> => {
          let count2 = 0;
          if (!notifyRoomSetting.ref) {
            const notifyRoom = await bot.Room.find({topic: notifyRoomSetting.topic});
            if (notifyRoom) {
              log.info('App', '✅ registered notify room, topic: %s', notifyRoomSetting.topic);
              notifyRoomSetting.ref = notifyRoom;
            } else {
              log.error('App', '❗️ notify room not found, topic: %s', notifyRoomSetting.topic);
              count2++;
            }
          }
          return count2;
        }));
        count += results.reduce((a, b) => a + b);
      } else {
        log.error('App', '⚠️ listener room not found, topic: %s', roomSetting.topic);
        count++;
      }
    } else {
      log.info('App', '👉 process share group, name: %s', roomSetting.name);
      const results: number[] = await Promise.all(roomSetting.shares.map(async (shareRoomSetting): Promise<number> => {
        let count2 = 0;
        if (!shareRoomSetting.ref) {
          const shareRoom = await bot.Room.find({topic: shareRoomSetting.topic});
          if (shareRoom) {
            log.info('App', '✅ registered share room, topic: %s', shareRoomSetting.topic);
            shareRoomSetting.ref = shareRoom;
          } else {
            log.error('App', '⚠️ share room not found, topic: %s', shareRoomSetting.topic);
            count2++;
          }
        }
        return count2;
      }));
      count += results.reduce((a, b) => a + b);
    }
    return count;
  })));

  /*
  Due to unknown reason, the `bot.Room.find()` can't find some rooms from time to time.
   */
  const totalCount = totalResults.reduce((a, b) => a + b);
  if (totalCount) {
    log.info('App', `${totalCount} room(s) not found, try initRoom() again later in ${ROOM_DETECT_INTERVAL} seconds`);
    setTimeout(initRooms, ROOM_DETECT_INTERVAL * 1000);
  } else {
    log.info('App', `all rooms inited.`);
  }
}

const setting: IRoomSetting = initSetting(config);

export default setting;
export {
  initRooms,
}
