module.exports = {
    IPCAction: {
        /**
         * 获取配置信息
         */
        ACTION_GET_CONFIG: "one_bot_api_get_config",
        /**
         * 保存配置信息
         */
        ACTION_SET_CONFIG: "one_bot_api_set_config",
            
        ACTION_LOG: "one_bot_api_log",

        /**
         * 获取好友列表
         */
        ACTION_GET_FRIENDS: "one_bot_api_get_friends",

        /**
         * 获取群列表
         */
        ACTION_GET_GROUPS: "one_bot_api_get_groups",

        /**
         * 主界面加载
         */
        ACTION_LOAD_MAIN_PAGE: "one_bot_api_load_main_page",

        /**
         * 重启HTTP服务
         */
        ACTION_RESTART_HTTP_SERVER: "one_bot_api_restart_http_server",

        /**
         * 重启ws服务
         */
        ACTION_RESTART_WS_SERVER: "one_bot_api_restart_ws_server",

        /**
         * 关闭ws服务
         */
        ACTION_STOP_WS_SERVER: "one_bot_api_stop_ws_server",

        /**
         * 重启ws reverse服务
         */
        ACTION_RESTART_WS_REVERSE_SERVER: "one_bot_api_restart_ws_reverse_server",

        /**
         * 关闭ws reverse服务
         */
        ACTION_STOP_WS_REVERSE_SERVER: "one_bot_api_stop_ws_reverse_server",

        /**
         * 获取服务运行状态
         */
        ACTION_SERVER_STATUS: 'one_bot_api_server_status',

        /**
         * API测试
         */
        ACTION_HTTP_TEST: 'one_bot_api_http_test',
    },

    // 默认设置文件
    defaultSetting: {
        "http": {
            'enableServer': true,
            "port": 5000,

            "host": "http://127.0.0.1:8080/",

            'enableReport': true,
            "hosts": ["http://127.0.0.1:8080/"]
        },

        "ws": {
            'enable': false,
            'host': '0.0.0.0',
            "port": 5001,
        },

        "wsReverse": {
            enable: false,
            url: '',
            apiUrl: '',
            eventUrl: '',
            useUniversalClient: false,
            reconnectInterval: 3000
        },

        "setting": {
            "reportSelfMsg": true,
            "reportOldMsg": false,
            "autoAcceptFriendRequest": false
        },

        "misc": {
            'disableUpdate': true
        },

        "debug": {
            "debug": false,
            "ipc": false,
        }
    }
}