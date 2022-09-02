import type {RoomInterface} from "wechaty/dist/esm/src/user-modules/room";

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
