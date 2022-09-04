import type {RoomInterface} from "wechaty/dist/esm/src/user-modules/room";

interface IRoomConfig {
  rooms: (IRoomForwardConfig | IRoomShareConfig) [],
}

interface IRoomForwardConfig extends IRoom {
  notifies: string[],
}

interface IRoom {
  topic: string,
  abbr?: string,
  people?: string[],
  ref?: RoomInterface | null,
}

interface IRoomShareConfig {
  name: string,
  shares: IRoom[],
}

interface IRoomSetting {
  rooms: (IRoomForwardSetting | IRoomShareSetting)[],
}

interface IRoomForwardSetting extends IRoom {
  notifies: IRoom[],
}

interface IRoomShareSetting extends IRoomShareConfig {
}

export type {
  IRoomConfig,
  IRoomForwardConfig,
  IRoomShareConfig,
  IRoomSetting,
  IRoomForwardSetting,
  IRoomShareSetting,
}
