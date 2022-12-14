# 微信群消息自动转发
* **消息的监听和转发**  
将指定的微信群（监听）里的来自于指定成员的消息，自动转发到指定的微信群（转发）。转发时不会显示转发人昵称，这里假设被转发者都是管理员。  
目前会转发除微信群接龙以外的，包括文件和图片在内的任何类型信息。  
适用场景：班级群 ➡️ 家长群


* **消息互转**  
将若干个微信群组成一个群组，在群组之间互通消息。转发时会显示转发人昵称（或群昵称，配置文件控制）和所在群名（room.abbr）。  
目前只会转发文本消息。  
适用场景：业主群主群 ⬅️➡️ 业主群2群

## 启动
```
npm start
```
控制台会显示一个二维码，用微信扫一扫授权登录。建议用新注册的微信账号作为bot，而不是自己的主账号，规避不必要的风险。  
注意：对于新账号，微信已经屏蔽了网页登陆，但有一个后门，就是通过URL带'[?target=t](https://wx.qq.com/?target=t)'的方式，仍然可以登录。
只是最近增加了一个限制，需要激活微信支付，意思就是说这个账号需要绑定一张银行卡（激活后可以解绑）才能正常登陆。

要求 `Node` v16+

## 配置文件
```
src/config.ts
```
很简单，一看就懂。⚠️注意微信群名可以重复，应注意避免。

## 功能说明
此仓库基于`wechaty/getting-started`，使用`wechaty-puppet-wechat`认证登陆，开启了uos协议。（说不定哪天这个协议又会挂掉的）  

参考文章：
* https://wechaty.js.org/2022/07/26/free-uos-ui/
* https://github.com/wechaty/getting-started/issues/271
* https://wechaty.js.org/docs/api/room

## Troubleshooting
还是有很多奇怪的异常错误需要处理。  
**不显示二维码**  
* GError: there is no WechatyBro in browser(yet)  
多试几次后解决。  
* Error: @swc/core threw an error when attempting to validate swc compiler options.  
一般是依赖包的问题，确保运行环境是Node v16+，以及node_modules是在Node v16+环境下安装的。

**手机扫码后，页面打不开**  
这应该是网络问题导致的。

**手机扫码成功后**
* GError: onLogin() TTL expired.  

**运行过程中中断**
* GError: WatchdogAgent reset: lastFood: "{"data":"heartbeat@browserbridge ding","timeoutMilliseconds":60000}"  
原因暂时未知，发生的周期从1小时到12小时不等。打算通过重启进程解决。
