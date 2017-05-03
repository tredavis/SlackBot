var Botkit = require('botkit');

var beckbot = exports.BeckBot = function() {

        var controller = Botkit.slackbot({
            debug: false
            //include "log: false" to disable logging
            //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
        });

        //connect the bot to a stream of messages
        controller.spawn({
                token: ""
            })
            .startRTM();

        // give the bot something to listen for.
        controller.hears('hello',
            ['direct_message', 'direct_mention', 'mention'],
            function(bot, message) {

                bot.reply(message, 'Hello yourself.');

            });

        controller.on('message_received',
            function(bot, message) {
                if (message.type === "user_typing")
                //do nothing
                    return false;
                if (message.type === "message")
                    console.log(message);
                // carefully examine and
                // handle the message here!
                // Note: Platforms such as Slack send many kinds of messages, not all of which contain a text field!
            });

        // reply to a direct mention - @bot hello
        controller.on('direct_mention',
            function(bot, message) {
                // reply to _message_ by using the _bot_ object
                bot.reply(message, 'I heard you mention me!');
            });

        // reply to a direct message
        controller.on('direct_message',
            function(bot, message) {
                // reply to _message_ by using the _bot_ object
                bot.reply(message, 'You are talking directly to me');
            });

        controller.hears(['data manager', 'estimator', 'bugs', 'stopping release'],
            ['direct_message', 'direct_mention', 'message_received'],
            function(bot, message) {
                bot.reply(message, "would you like here about your bug list?");
            });
    }
    (function() {
        this.callJira = function(response) {

        };
    })
    .call(BeckBot.prototype);