//index.js
//获取应用实例
var webim = require('../../utils/webim_wx.js');
var webimhandler = require('../../utils/webim_handler.js');
var tls = require('../../utils/tls.js');

global.webim = webim;
var Config = {
  sdkappid: 1400037025,
  accountType: 884,
  accountMode: 1 //帐号模式，0-表示独立模式，1-表示托管模式
};

tls.init({
  sdkappid: Config.sdkappid
})
var app = getApp()
Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    msgs: [],
    Identifier: null,
    UserSig: null,
    msgContent: ""
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },

  clearInput: function() {
    this.setData({
      msgContent: ""
    })
  },

  bindConfirm: function(e) {
    var that = this;
    var content = e.detail.value;
    if (!content.replace(/^\s*|\s*$/g, '')) return;
    webimhandler.onSendMsg(content, function() {
      that.clearInput();
    })
  },
  onCreateGroup: function(e) {
    //如果是医生就能创建群组,如果不是就拒绝创建
    if (!loginInfo.identifier == '250') {
      if (accountMode == 1) { //托管模式
        //将account_type保存到cookie中,有效期是1天
        webim.Tool.setCookie('accountType', loginInfo.accountType, 3600 * 24);
        //调用tls登录服务
        tlsLogin();
      } else { //独立模式
        alert('您没有权限创建群组~~');
        // $('#login_dialog').show();
      }
      return;
    }
    var options = {
      'Owner_Account': '250', //群主的userId
      'Type': 'AVChatRoom',  //群组类型
      'Name': 'testGroup',  //群名称
      'Notification': '群公告: 直播内容标题', //群公告
      'GroupId': 'MyTestGroup', //自定义群组id
      'Name': 'lxyGroup'
    }
    webim.createGroup(options, function (resp) {
      console.log('成功的回调resp', resp);
    }, function (err) {
      alert('错误的回调err.ErrorInfo', err.ErrorInfo);
    })
  },
  bindTap: function() {
    webimhandler.sendGroupLoveMsg();
    applyJoinGroup();
  },

  login: function(cb) {
    var that = this;
    tls.login({
      success: function(data) {
        that.setData({
          Identifier: data.Identifier,
          UserSig: data.UserSig
        })
        cb();
      }
    });
  },


  receiveMsgs: function(data) {
    var msgs = this.data.msgs || [];
    msgs.push(data);
    //最多展示10条信息
    if (msgs.length > 10) {
      msgs.splice(0, msgs.length - 10)
    }

    this.setData({
      msgs: msgs
    })
  },

  initIM: function(userInfo) {
    var that = this;

    var avChatRoomId = 'MyTestGroup';
    webimhandler.init({
      accountMode: Config.accountMode,
      accountType: Config.accountType,
      sdkAppID: Config.sdkappid,
      avChatRoomId: avChatRoomId //默认房间群ID，群类型必须是直播聊天室（AVChatRoom），这个为官方测试ID(托管模式)
      ,
      selType: webim.SESSION_TYPE.GROUP,
      selToID: avChatRoomId,
      selSess: null //当前聊天会话
    });

    
    //当前用户身份
    var loginInfo = {
      'sdkAppID': Config.sdkappid, //用户所属应用id,必填
      'appIDAt3rd': Config.sdkappid, //用户所属应用id，必填
      'accountType': Config.accountType, //用户所属应用帐号类型，必填
      'identifier': that.data.Identifier, //当前用户ID,必须是否字符串类型，选填
      'identifierNick': userInfo.nickName, //当前用户昵称，选填
      'userSig': that.data.UserSig, //当前用户身份凭证，必须是字符串类型，选填
    };

    //监听（多终端同步）群系统消息方法，方法都定义在demo_group_notice.js文件中
    var onGroupSystemNotifys = {
      "5": webimhandler.onDestoryGroupNotify, //群被解散(全员接收)
      "11": webimhandler.onRevokeGroupNotify, //群已被回收(全员接收)
      "255": webimhandler.onCustomGroupNotify //用户自定义通知(默认全员接收)
    };

    //监听连接状态回调变化事件
    var onConnNotify = function(resp) {
      switch (resp.ErrorCode) {
        case webim.CONNECTION_STATUS.ON:
          //webim.Log.warn('连接状态正常...');
          break;
        case webim.CONNECTION_STATUS.OFF:
          webim.Log.warn('连接已断开，无法收到新消息，请检查下你的网络是否正常');
          break;
        default:
          webim.Log.error('未知连接状态,status=' + resp.ErrorCode);
          break;
      }
    };


    //监听事件
    var listeners = {
      "onConnNotify": webimhandler.onConnNotify, //选填
      "onBigGroupMsgNotify": function(msg) {
        webimhandler.onBigGroupMsgNotify(msg, function(msgs) {
          that.receiveMsgs(msgs);
        })
      }, //监听新消息(大群)事件，必填
      "onMsgNotify": webimhandler.onMsgNotify, //监听新消息(私聊(包括普通消息和全员推送消息)，普通群(非直播聊天室)消息)事件，必填
      "onGroupSystemNotifys": webimhandler.onGroupSystemNotifys, //监听（多终端同步）群系统消息事件，必填
      "onGroupInfoChangeNotify": webimhandler.onGroupInfoChangeNotify //监听群资料变化事件，选填
    };

    //其他对象，选填
    var options = {
      'isAccessFormalEnv': true, //是否访问正式环境，默认访问正式，选填
      'isLogOn': false //是否开启控制台打印日志,默认开启，选填
    };

    if (Config.accountMode == 1) { //托管模式
      webimhandler.sdkLogin(loginInfo, listeners, options, avChatRoomId);
    } else { //独立模式
      //sdk登录
      webimhandler.sdkLogin(loginInfo, listeners, options);
    }
  },
  onGotUserInfo(e) {
    var that = this;

    console.log(e.detail.errMsg)
    console.log(e.detail.userInfo)
    console.log(e.detail.rawData)

    let userInfo = e.detail.userInfo;
    //更新数据
    console.debug(userInfo);
    that.setData({
      userInfo: userInfo
    })

    that.login(function () {
      that.initIM(userInfo);
    });
  },
  onLoad: function() {
    var that = this;
    //调用应用实例的方法获取全局数据

    console.log('onLoad');
    app.getUserInfo(function(userInfo) {
      console.log('getUserInfo callback');
      //更新数据
      console.debug(userInfo);
      that.setData({
        userInfo: userInfo
      })

      that.login(function() {
        that.initIM(userInfo);
      });
    })
  }
})