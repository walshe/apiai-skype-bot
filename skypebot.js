'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const skype = require('skype-sdk');
const _ = require('underscore');


/**
 * use this cache for mapping user menu choices to productIds
 * @type {{}}
 */
var recipientMenuCache =  {

};


var db = {
    restaurant : [
        {
            productId: 1,
            name: "5 Napkin Burger",
            city: "New York",
            url: "http://5napkinburger.com/",
            image: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/5%20Napkin%20Burger/5%20Napkin%20Logo.jpg",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        },
        {
            productId: 2,
            name: "PJ Clarke's",
            city: "New York",
            url: "http://pjclarkes.com/",
            image: "http://www.crainsnewyork.com/apps/pbcsi.dll/storyimage/CN/20100110/SMALLBIZ/301109968/AR/0/P.J.-Clarke's&imageversion=widescreen&maxw=770",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        },
        {
            productId: 3,
            name: "McDonalds",
            city: "Boston",
            url: "http://www.mcdonalds.com/us/en/home.html",
            image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Mcdonalds-90s-logo.svg/2000px-Mcdonalds-90s-logo.svg.png",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        }
    ],

    clothing : [
        {
            productId: 4,
            name: "The Gap",
            city: "New York",
            url: "http://www.gap.com/",
            image: "https://lh6.ggpht.com/LKRb7hffPEcZOvKWHUpGo-7ajEYkcMXQw8ewHldpydXfl0hG2K4Ae35NxffRmUU4LZmM=w300",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        },
        {
            productId: 5,
            name: "Banana Republic",
            city: "New York",
            url: "http://bananarepublic.com/",
            image: "http://images.military.com/media/mail/deals-and-discounts/bananarepublic.jpg",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        },
        {
            productId: 6,
            name: "Old Navy",
            city: "Boston",
            url: "www.oldnavy.com",
            image: "http://res.cloudinary.com/goodsearch/image/upload/v1439940283/hi_resolution_merchant_logos/old-navy_coupons.jpg",
            coupon: "http://bot-mediator.herokuapp.com/UWS/Logo_Restaurants/QR_Code_Coupon/images.png"
        }

    ]
}

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



            if(/^\d+$/.test(messageText)){
                //user made a menu choice
                bot.reply("You chose " + messageText +",  thats a great choice", true, function(){

                    _.each(recipientMenuCache[sender], function(menuToProductIdMapping){

                        if(menuToProductIdMapping.menuId.toString() == messageText){

                            _.each(db.restaurant, function(restaurant){
                                if(restaurant.productId == Number(messageText)){
                                    bot.reply(restaurant.name ,true);
                                }
                            })

                            _.each(db.clothing, function(clothingStore){
                                if(clothingStore.productId == Number(messageText)){
                                    bot.reply(clothingStore.name ,true);
                                }
                            })
                        }

                    });

                });


                return;

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

                        bot.reply(responseText, true, function(){

                            let action = response.result.action;
                            let actionIncomplete = response.result.actionIncomplete;

                            if(action == 'getProductsByLocation' && !actionIncomplete){


                                var city = response.result.parameters['geo-city-us'];
                                var productType = response.result.parameters['product'];

                                var products = [];

                                if(db[productType]){

                                    _.each(db[productType], function(product){
                                        if(product.city == city){
                                            //collect
                                            products.push(product);
                                        }
                                    });

                                    if(products){

                                        recipientMenuCache[sender] = [];

                                        var customText = '';
                                        _.each(products, function(product, index){

                                            customText += (index+1).toString() + '.' +product.name +"\n";

                                            recipientMenuCache[sender].push {menuId: (index+1) , productId : product.productId};

                                        });

                                        customText += "\n\n Enter a number to make a choice e.g. 1"

                                        bot.reply(customText, true)


                                    }else{
                                        bot.reply("Couldn't find any results", true);
                                    }

                                }else{
                                    bot.reply('Couldnt find any results', true)



                                }


                            };
                        });

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