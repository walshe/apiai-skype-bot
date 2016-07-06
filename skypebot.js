'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const skype = require('skype-sdk');

module.exports = class SkypeBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get botService() {
        return this._botService;
    }

    set botService(value) {
        this._botService = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "skype"
        };

        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);
        this._sessionIds = new Map();

        this._botService = new skype.BotService({
            messaging: {
                botId: this.botConfig.skypeBotId,
                serverUrl: "https://apis.skype.com",
                requestTimeout: 15000,
                appId: this.botConfig.skypeAppId,
                appSecret: this.botConfig.skypeAppSecret
            }
        });

        this.botService.on('contactAdded', (bot, data) => {
            console.log("contactAdded", data.from);
        });

        this.botService.on('personalMessage', (bot, data) => {
            this.processMessage(bot, data);
        });

    }

    processMessage(bot, data) {

        let messageText = data.content;
        let sender = data.from;

        if (messageText && sender) {

            console.log(sender, messageText);

            if (!this._sessionIds.has(sender)) {
                this._sessionIds.set(sender, uuid.v1());
            }

            let apiaiRequest = this._apiaiService.textRequest(messageText,
                {
                    sessionId: this._sessionIds.get(sender)
                });

            apiaiRequest.on('response', (response) => {
                if (this._botConfig.devConfig) {
                    console.log(sender, "Received api.ai response");
                }

                if (SkypeBot.isDefined(response.result)) {
                    let responseText = response.result.fulfillment.speech;

                    console.log("response from api.ai------->"+JSON.stringify(response.result));

                    if (SkypeBot.isDefined(responseText)) {
                        console.log(sender, 'Response as text message');
                        bot.reply(responseText, true);

                    } else {
                        console.log(sender, 'Received empty speech');
                    }
                } else {
                    console.log(sender, 'Received empty result');
                }
            });

            apiaiRequest.on('error', (error) => {
                console.error(sender, 'Error while call to api.ai', error);
            });

            apiaiRequest.end();
        } else {
            console.log('Empty message');
        }
    }

    static isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }
}