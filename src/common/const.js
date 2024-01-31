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

        ACTION_SEND_MSG: "one_bot_api_send_msg",
        ACTION_RECALL_MSG: "one_bot_api_recall_msg",


        ACTION_UPDATE_SELF_INFO: "one_bot_api_set_self_info",
        ACTION_UPDATE_FRIENDS: "one_bot_api_update_friends",
        ACTION_UPDATE_GROUPS: "one_bot_api_update_groups",


        ACTION_NT_CALL: "one_bot_api_nt_call",
        ACTION_GET_USER_BY_UID: "one_bot_api_get_user_by_uid",


        ACTION_DOWNLOAD_FILE: "one_bot_api_download_file",

        /**
         * 主界面是否已加载
         */
        ACTION_IS_LOADED: "one_bot_api_is_loaded",

        /**
         * 主界面加载
         */
        ACTION_LOAD_MAIN_PAGE: "one_bot_api_load_main_page",

        /**
         * 获取HTTP服务器运行状态
         */
        ACTION_HTTP_SERVER_STATUS: 'one_bot_api_http_server_status',
    },

    // 默认设置文件
    defaultSetting: {
        "http": {
            "port": 5000,

            'enable': true,
            "host": "http://127.0.0.1:8080/"
        },

        "setting": {
            "autoAcceptFriendRequest": false
        },

        "debug": {
            "debug": false,
            "ipc": false,
        }
    }
}