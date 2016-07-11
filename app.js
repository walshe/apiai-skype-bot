'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');

const SkypeBot = require('./skypebot');
const SkypeBotConfig = require('./skypebotconfig');

const REST_PORT = (process.env.PORT || 5000);

const API_AI = 'API_AI';
const MS_LUIS = 'LUIS';

const AGENT = (process.env.NLP_SERVICE || API_AI);

const botConfig = new SkypeBotConfig(
    process.env.APIAI_ACCESS_TOKEN,
    process.env.APIAI_LANG,
    process.env.BOT_ID,
    process.env.APP_ID,
    process.env.APP_SECRET
);

const skypeBot = new SkypeBot(botConfig);

// console timestamps
require('console-stamp')(console, 'yyyy.mm.dd HH:MM:ss.l');

const app = express();
app.use(bodyParser.json());

app.post('/chat', (req, res) => {
    try {
        skypeBot.botService.processMessagingRequest(req.body);
        res.status(201);
        res.end();
    } catch (err) {
        res.status(400);
        res.end();
    }
});

app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});