import type {IConfig} from "./type";

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
