import type {RoomInterface} from "wechaty/dist/esm/src/user-modules/room";

const config: IConfig = {
  rooms: [
    {
      topic: '监听群',  // 需要监听的群名
      people: [
        'Wayne 毛',  // 需要监听的群成员的昵称（非群昵称）
      ],
      notifyRooms: [
        '转发群',  // 需要转发消息的群名
      ]
    },
  ]
};

export default config;

interface IConfig {
  rooms: IRoomConfig[],
}

interface ISetting {
  rooms: IRoomSetting[],
}

interface IRoomConfig extends IRoom {
  notifyRooms: INotifyRoomConfig[],
}

interface IRoomSetting extends IRoom {
  notifyRooms: INotifyRoomSetting[],
}

interface IRoom {
  topic: string,
  people: string[],
}

type INotifyRoomConfig = string;

interface INotifyRoomSetting {
  topic: string,
  ref?: RoomInterface | null,
}

export type {
  IConfig,
  ISetting,
  IRoomConfig,
  INotifyRoomSetting,
}
