// The bot is a Wechaty instance, and it maintains a puppet instance.
import {WechatyBuilder} from "wechaty";

const bot = WechatyBuilder.build({
  name: 'room-message-forward',
  // Enable UOS for web login for new WeChat account. See detail: https://www.npmjs.com/package/wechaty-puppet-wechat
  puppet: 'wechaty-puppet-wechat',
  puppetOptions: {
    uos: true,  // 开启uos协议
  },
})

export default bot;
