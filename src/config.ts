import type {IRoomConfig} from "./type";

const config: IRoomConfig = {
  rooms: [
    {
      topic: '监听群',  // 需要监听的群名
      people: [
        'Wayne 毛',  // 需要监听的群成员的昵称（非群昵称）
      ],
      notifies: [
        '转发群',  // 需要转发消息的群名
      ]
    },
    {
      name: '业主群', // 组的标识，没有具体功能
      shares: [{ // 这组群里的消息会相互转发
        topic: '业主群主群', // 群名
        abbr: '1群', // 别名，会显示在转发消息的开头，[昵称@群别名或群名]: 说的话
      }, {
        topic: '业主群2群',
        abbr: '2群'
      }]
    }
  ]
};

export default config;
