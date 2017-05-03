var express = require('express');
var router = express.Router();

//JIRA dlls
var JiraApi = require('c:\\users\\montredavis\\documents\\visual studio 2015\\Projects\\EasierMusic\\EasierMusic\\public\\javascripts\\jira.js').JiraApi;


//Slack Dlls
var Botkit = require('botkit');

var bugApi;

/* GET home page. */
router.get('/', function (req, res) {
    if (JiraApi == null) {
        console.log("could not find the Jira Plugin, make sure you are pointing to the right file");
        res.render('index', { title: "There was an issue finding the jira object" });

    } else {

        //let's login to Beck Tech's JIRA Server
        var jira = new JiraApi('https', "becktechnology.atlassian.net", "443", "MontreDavis", "mnimld18", '2');

        //let's initialize the Jira object
        JiraContainer.init(jira);

        //the botkit controller
        var controller = Botkit.slackbot({
            debug: false
            //include "log: false" to disable logging
            //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
        });

        //make sure the controller was made properly
        if (controller !== null && typeof controller !== "undefined") {
            Bot.init(controller);


            // give the bot something to listen for.
            controller.hears('hello',
                ['direct_message', 'direct_mention', 'mention'],
                function (bot, message) {

                    
                    bot.reply(message, 'Hey there!. Please say one of the following commands to get started \n *bugs*, *stopping release*, *show me bugs*, *my bugs*, *issues* \n\n *Note: All commands are case sensitive*');

                });
        }

        res.render('index', { title: "Everything is working!" });
    }
});

function SlackMessageBuilder() {
    this.createMessage = function (issue) {
        var newBug = Bug.init(issue);

        var url = newBug.url();
        var summary = newBug.description();
        var reproSteps = newBug.reproductionSteps();
        var assignee = newBug.bug.fields.assignee.displayName;
        var status = newBug.bug.fields.status.name;

        var responseMessage = "Bug Description: " +
            summary +
            "\n\n" +
            "Status: " +
            status +
            "\n\n" +
            "Assignee: " +
            assignee +
            "\n\n" +
            "Reproduction Steps" +
            reproSteps;

        var slackMessageObject = {
            text: responseMessage,
            attachments: [
                {
                    "text": url
                }
            ],
            icon_emoji: ":beetle:"
        }

        return slackMessageObject;
    }
};

function ConversationCreator(bot, message) {
    this.slackBot = bot;
    this.convoMessage = message;
    this.startNewConvo = function() {
        //sanity check
        if (typeof this.slackBot !== "undefined" && typeof this.convoMessage !== "undefined" && this.slackBot !== null && this.convoMessage !== null) {

            this.slackBot.createConversation(this.convoMessage,
                function(err, convo) {
                    var currentlyDisplayedBugs = [];

                    //the thread which holds the questions for the currently selected bugs
                    var selectionThread = new BugSelectionThreadBuilder();

                    var messageBuilder = new SlackMessageBuilder();

                    var estThread = 'estimator_thread';
                    var dataThread = 'dataManager_thread';
                    var viewBugsThread = 'viewBugs_thread';

                    //estimater thread
                    convo.addMessage({
                            text: 'You said estimator! Hold on one sec...'
                        },
                        estThread);

                    convo.addQuestion({
                            text: 'Would like to see stopping release or dev complete'
                        },
                        [
                            {
                                pattern: 'stopping release',
                                callback: function(rMessage, converstation) {

                                    currentlyDisplayedBugs = [];


                                    if (typeof convo.messages !== "undefined")
                                        convo.messages = [];

                                    var offset = 0;

                                    //let's only grab the first 5 bugs and cache them
                                    for (var i = 0; i < 5; i++) {

                                        //lets cache the currently displayed bugs so we can use them for selection
                                        currentlyDisplayedBugs.push(JiraContainer.estimatorStopping[i + offset]);


                                        //lets build the bugs into messages and then load then into the message queue
                                        var slackResponse = messageBuilder
                                            .createMessage(JiraContainer.estimatorStopping[i + offset]);

                                        convo.addMessage(slackResponse, viewBugsThread);

                                    }

                                    //call change topic with each message add. This helps me simulate someone pasting them one at a time
                                    convo.changeTopic(viewBugsThread);

                                    //now let's build questions for them
                                    if (currentlyDisplayedBugs.length > 0)
                                        selectionThread.buildThread(convo, currentlyDisplayedBugs, 'estimator');

                                    //to start working on a bug text
                                    convo.addQuestion({
                                            text:
                                                "If you would like to start working on one of the bugs above please type *Yes*. \n\n If you would like to see the next set of bugs please say *Next* or *More*. \n\n Or say *Cancel* if you would like to return to the previous question."
                                        },
                                        [
                                            {
                                                pattern: 'next',
                                                callback: function(response, convo) {
                                                    //lets clear out the current message
                                                    if (typeof convo.messages !== "undefined")
                                                        convo.messages = [];

                                                    offset += 5;

                                                    convo.changeTopic(viewBugsThread);

                                                    buildBugList(convo, offset);
                                                }
                                            },
                                            {
                                                pattern: 'more',
                                                callback: function(response, convo) {
                                                    //lets clear out the current message
                                                    if (typeof convo.messages !== "undefined")
                                                        convo.messages = [];

                                                    offset += 5;

                                                    buildBugList(convo, offset);

                                                    convo.changeTopic(viewBugsThread);
                                                }
                                            },
                                            {
                                                pattern: 'cancel',
                                                callback: function(response, convo) {
                                                    convo.changeTopic('default');
                                                }
                                            },
                                            {
                                                pattern: 'yes',
                                                callback: function(response, convo) {

                                                    if (currentlyDisplayedBugs.length > 0)
                                                        convo.changeTopic('selectBug_thread');

                                                }
                                            }
                                        ],
                                        {},
                                        viewBugsThread);

                                    //let's ask them this question
                                    convo.changeTopic(viewBugsThread);

                                }
                            }, {
                                pattern: 'dev complete',
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    console.log(converstation);
                                }
                            }, {
                                pattern: 'qa verification',
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    console.log(converstation);
                                }
                            }, {
                                pattern: ['stop'],
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    convo.changeTopic('default');
                                }
                            },
                            {
                                pattern: ['cancel'],
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    convo.changeTopic('default');
                                }
                            }
                        ],
                        {},
                        estThread);

                    // data manager thread
                    convo.addMessage({
                            text: 'You said data manager!'
                        },
                        dataThread);

                    convo.addQuestion({
                            text: 'Would like to see stopping release or dev complete'
                        },
                        [
                            {
                                pattern: 'stopping release',
                                callback: function(rMessage, converstation) {

                                    currentlyDisplayedBugs = [];

                                    if (typeof convo.messages !== "undefined")
                                        convo.messages = [];

                                    var offset = 0;

                                    //let's only grab the first 5 bugs and cache them
                                    for (var i = 0; i < 5; i++) {

                                        //lets cache the currently displayed bugs so we can use them for selection
                                        currentlyDisplayedBugs.push(JiraContainer.dataManagerStopping[i + offset]);


                                        //lets build the bugs into messages and then load then into the message queue
                                        var slackResponse = messageBuilder
                                            .createMessage(JiraContainer.dataManagerStopping[i + offset]);

                                        convo.addMessage(slackResponse, viewBugsThread);

                                    }

                                    //call change topic with each message add. This helps me simulate someone pasting them one at a time
                                    convo.changeTopic(viewBugsThread);

                                    //now let's build questions for them
                                    if (currentlyDisplayedBugs.length > 0)
                                        selectionThread.buildThread(convo, currentlyDisplayedBugs, 'data manager');

                                    //to start working on a bug text
                                    convo.addQuestion({
                                            text:
                                                "If you would like to start working on one of the bugs above please type *Yes*. \n\n If you would like to see the next set of bugs please say *Next* or *More*. \n\n Or say *Cancel* if you would like to return to the previous question."
                                        },
                                        [
                                            {
                                                pattern: 'next',
                                                callback: function(response, convo) {
                                                    //lets clear out the current message
                                                    if (typeof convo.messages !== "undefined")
                                                        convo.messages = [];

                                                    offset += 5;

                                                    convo.changeTopic(viewBugsThread);

                                                    buildBugList(convo, offset);
                                                }
                                            },
                                            {
                                                pattern: 'more',
                                                callback: function(response, convo) {
                                                    //lets clear out the current message
                                                    if (typeof convo.messages !== "undefined")
                                                        convo.messages = [];

                                                    offset += 5;

                                                    buildBugList(convo, offset);

                                                    convo.changeTopic(viewBugsThread);
                                                }
                                            },
                                            {
                                                pattern: 'cancel',
                                                callback: function(response, convo) {
                                                    convo.changeTopic('default');
                                                }
                                            },
                                            {
                                                pattern: 'yes',
                                                callback: function(response, convo) {

                                                    if (currentlyDisplayedBugs.length > 0)
                                                        convo.changeTopic('selectBug_thread');

                                                }
                                            }
                                        ],
                                        {},
                                        viewBugsThread);

                                    //let's ask them this this question
                                    convo.changeTopic(viewBugsThread);

                                }
                            }, {
                                pattern: 'dev complete',
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues


                                    console.log(converstation);
                                }
                            }, {
                                pattern: 'qa verification',
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    console.log(converstation);
                                }
                            }, {
                                pattern: ['stop'],
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    convo.changeTopic('default');
                                }
                            },
                            {
                                pattern: ['cancel'],
                                callback: function(rMessage, converstation) {
                                    // the user asked for a list of the stopping release issues
                                    convo.changeTopic('default');
                                }
                            }
                        ],
                        {},
                        dataThread);

                    // create a path where neither option was matched
                    // this message has an action field, which directs botkit to go back to the `default` thread after sending this message.
                    convo.addMessage({
                            text: 'Sorry I did not understand.',
                            action: 'complete'
                        },
                        'bad_response');

                    // Create a yes/no question in the default thread...
                    convo.ask('Ok, which project\'s bug list?  Data Manager or Estimator',
                    [
                        {
                            pattern: 'estimator',
                            callback: function(response, convo) {
                                convo.changeTopic(estThread);
                            }
                        },
                        {
                            pattern: 'data manager',
                            callback: function(response, convo) {
                                convo.changeTopic(dataThread);
                            }
                        },
                        {
                            default: true,
                            callback: function(response, convo) {
                                convo.changeTopic('bad_response');
                            }
                        }
                    ]);

                    //the end of a conversation
                    convo.on('end',
                        function(convo) {

                            if (convo.status === 'completed') {

                                var conversationObject = new ConversationCreator();
                                conversationObject.startNewConvo();

                                // do something useful with the users responses
                                var res = convo.extractResponses();
                                console.log('the convo has completed + \n' + res);

                                // reference a specific response by key
                                var value = convo.extractResponse('key');

                                // ... do more stuff...

                            } else {
                                // something happened that caused the conversation to stop prematurely
                            }

                        });

                    convo.activate();
                });
        }
    }
}

function ActionThreadBuilder() {
    this.threadName = 'bugAction_thread';
    this.buildThread = function (convo, bug) {
        convo.addQuestion({ text: "are you sure you would like to start working on this bug?" },
            [
                {
                    pattern: "yes",
                    callback: function(response, convo) {
                        Bug.transitionBug(bug);

                        convo.say("You are now working on this bug");

                        //complete conversation
                        convo.changeTopic('completed');
                    }
                },
                {
                    pattern: "no",
                    callback: function(response, convo) {
                        convo.changedTopic('selectBug_thread');

                    }
                },
                {
                    pattern: "cancel",
                    callback: function (response, convo) {
                        convo.changeTopic('default');
                    }
                }
            ],
            {},
            'bugAction_thread'
        );
    }
}

function BugSelectionThreadBuilder() {
    this.threadName = 'selectBug_thread';
    this.buildThread = function (convo, currentlyDisplayedBugs, project) {
        //since it looks like the user is about to select an item
        //lets queue up the thread
        var actionThread = new ActionThreadBuilder();

        //let's load up the estimator questions so there are no issues when we change the topic
        if (project === 'estimator') {
            convo.addQuestion({ text: "Please type in the key (number) of one of the bugs above " },
                [
                    {
                        pattern: currentlyDisplayedBugs[0].key.substring(10),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[0]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[1].key.substring(10),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[1]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[2].key.substring(10),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[2]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[3].key.substring(10),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[3]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[4].key.substring(10),

                        callback: function (response, convo) {
                            console.log(convo);

                            actionThread.buildThread(convo, currentlyDisplayedBugs[4]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                ],
                {},
                'selectBug_thread');
        }

        //load the questions for data manager
        if (project === 'data manager') {
            convo.addQuestion({ text: "Please type in the key (number) of one of the bugs above " },
                [
                    {
                        pattern: 'no',
                        callback: function(response, convo) {
                            convo.changeTopic('defualt');
                        }
                    },
                    {
                        pattern: 'cancel',
                        callback: function (response, convo) {
                            convo.changeTopic('defualt');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[0].key.substring(6),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[0]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[1].key.substring(6),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[1]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[2].key.substring(6),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[2]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[3].key.substring(6),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[3]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                    {
                        pattern: currentlyDisplayedBugs[4].key.substring(6),

                        callback: function (response, convo) {
                            actionThread.buildThread(convo, currentlyDisplayedBugs[4]);

                            convo.changeTopic('bugAction_thread');
                        }
                    },
                ],
                {},
                'selectBug_thread');
        }
    }
}

var buildBugList = function (convo, offset) {
    var viewBugsThread = 'viewBugs_thread';

    //lets clear the list of bugs
    var currentlyDisplayedBugs = [];
    //the thread which holds the questions for the currently selected bugs
    var selectionThread = new BugSelectionThreadBuilder();
    var messageBuilder = new SlackMessageBuilder();

    //let's only grab the first 5 bugs and cache them
    for (var i = 0; i < 5; i++) {

        //lets cache the currently displayed bugs so we can use them for selection
        currentlyDisplayedBugs.push(JiraContainer.estimatorStopping[i + offset]);

        //lets build the bugs into messages and then load then into the message queue
        var slackResponse = messageBuilder
            .createMessage(JiraContainer.estimatorStopping[i + offset]);

        convo.addMessage(slackResponse, viewBugsThread);
    }

    //call change topic with each message add. This helps me simulate someone pasting them one at a time
    convo.changeTopic(viewBugsThread);

    //now let's build questions for them
    if (currentlyDisplayedBugs.length > 0)
        selectionThread.buildThread(convo, currentlyDisplayedBugs, 'estimator');
}

//The bot object
//contains all the logic for interactive with the bot
var Bot = {
    init: function (controller) {

        Bot.startBot(controller);
        Bot.listen(controller);
    },
    createUrl: function (bug) {
        console.log(bug);

        return "" + bug.key;
    },
    startBot: function (controller) {
        //connect the bot to a stream of messages
        controller.spawn({ token: "xoxb-104879529874-DqCdoou9kZDIE8e7WZkYwtnC" }).startRTM();
       
    },
    listen: function (controller) {
        // reply to a direct message
        controller.hears(['bugs', 'stopping release', 'show me bugs', 'my bugs', 'issues'], ['direct_message', 'direct_mention', 'message_received'], function (bot, message) {

            // lets create a new convo object and start one
            var conversationConstructor = new ConversationCreator(bot, message);
            conversationConstructor.startNewConvo();
            
        });
    }
}

//Container Object
var JiraContainer = {
    init: function (api) {

        //I need to make sure the same api is being used by both
        bugApi = api;

        JiraContainer.getCurrentUser(api);
        JiraContainer.getAllProjects(api);
        JiraContainer.getAllUserIssues(api);
        JiraContainer.getDmStoppingRelease(api);
        JiraContainer.getEstimatorStoppingRelease(api);
        JiraContainer.getEstimatorDevCompleteBugs(api);
        JiraContainer.getDataManagerDevCompleteBugs(api);

        JiraContainer.startTimer(5000);
    },
    timer: null,
    currentUser: {},
    projects: [],
    userIssues: [],
    dataManagerStopping: [],
    estimatorStopping: [],
    estimatorDevComplete: [],
    dataManagerDevComplete: [],

    //polling
    startTimer: function (time) {
        JiraContainer.timer = setTimeout(function () {

            if (JiraContainer.allDataIsGathered()) {
                console.log(JiraContainer);
                JiraContainer.stopTimer();
            }

        }, time);
    },
    stopTimer: function () {
        clearTimeout(JiraContainer.timer);
    },

    allDataIsGathered: function () {
        if (JiraContainer.projects.length > 0 &&
            JiraContainer.userIssues.length > 0 &&
            JiraContainer.dataManagerStopping.length > 0 &&
            JiraContainer.estimatorStopping.length > 0 &&
            JiraContainer.estimatorDevComplete.length > 0 &&
            JiraContainer.dataManagerDevComplete.length > 0 &&
            JiraContainer.currentUser !== {})
            return true;
        else
            return false;
    },
    getCurrentUser: function (api) {
        api.getCurrentUser(function (error, user) {
            if (!(user)) {
                JiraContainer.currentUser = user;
            }
            else
                console.log("unable to get the current user");

        });
    },
    getAllProjects: function (api) {
        //get the list of projects associated with our JIRA Server
        api.listProjects(function (error, data) {

            if (error != null) {
                console.log(error);
                return null;
            }

            if (data != null) {
                JiraContainer.projects = [];
                var projects = data;

                for (var i = 0; i < projects.length; i++) {
                    JiraContainer.projects.push({ id: projects[i].id, key: projects[i].key, name: projects[i].name });
                };

                return true;
            }

            return false;
        });
    },
    getAllUserIssues: function (api) {
        //get the list of issues associated with the currently signed in user
        api.getUsersIssues('MontreDavis',
            false,
            function (error, data) {

                //sanity check
                if (data != null && data.issues.length > 0) {

                    //clear the current issues
                    if (JiraContainer.userIssues.length > 0)
                        JiraContainer.userIssues = [];

                    //let's cache the data
                    for (var i = 0; i > data.issues.length; i++) {
                        JiraContainer.userIssues.push(data.issues[i]);
                    }
                }
            });
    },
    getDmStoppingRelease: function (api) {
        //get all data manager stopping release issues
        api.getDataManagerStoppingReleaseIssues(function (error, data) {
            if (error)
                console.log(error);

            if (data != null) {
                if (JiraContainer.dataManagerStopping.length > 0 || data.issues.length > 0) {
                    JiraContainer.dataManagerStopping = [];

                    for (var i = 0; i < data.issues.length; i++) {
                        JiraContainer.dataManagerStopping.push(data.issues[i]);
                    }
                }
            }
        });
    },
    getEstimatorStoppingRelease: function (api) {
        //get all estimator stopping release issues
        api.getEstimatorStoppingReleaseIssues(function (error, data) {
            if (error)
                console.log(error);

            if (data != null) {
                if (JiraContainer.estimatorStopping.length > 0 || data.issues.length > 0) {
                    JiraContainer.estimatorStopping = [];

                    for (var i = 0; i < data.issues.length; i++) {
                        JiraContainer.estimatorStopping.push(data.issues[i]);
                    }
                }
            }
        });
    },
    getEstimatorDevCompleteBugs: function (api) {

        //get all the users dev complete bugs stopping release issues
        api.getUsersDevCompleteBugsEstimator(function (error, data) {
            if (error)
                console.log(error);

            if (data != null) {
                if (JiraContainer.estimatorDevComplete.length > 0 || data.issues.length > 0) {
                    JiraContainer.estimatorDevComplete = [];

                    for (var i = 0; i < data.issues.length; i++) {
                        JiraContainer.estimatorDevComplete.push(data.issues[i]);
                    }
                }
            }
        });
    },
    getDataManagerDevCompleteBugs: function (api) {

        //get all the users dev complete bugs stopping release issues
        api.getUsersDevCompleteBugsEstimator(function (error, data) {
            if (error)
                console.log(error);

            if (data != null) {
                if (JiraContainer.dataManagerDevComplete.length > 0 || data.issues.length > 0) {
                    JiraContainer.dataManagerDevComplete = [];

                    for (var i = 0; i < data.issues.length; i++) {
                        JiraContainer.dataManagerDevComplete.push(data.issues[i]);
                    }
                }
            }
        });
    }
}

//Bug object, which stores all things bugg related 
var Bug = {
    bug: null,
    api: null,
    init: function (bug) {
        Bug.bug = bug;
        Bug.api = bugApi;

        //on initialization, we the available transitions of an issue and the fields that we can edit it. 
        Bug.getEditableFields(Bug.bug, Bug.api);

        return this;
    },
    //creates and returns a url associated with this bug
    url: function () {
        if (typeof Bug !== "undefined")
            return Bug.createUrl(Bug.bug);

        return "";
    },

    //creates and returns a url associated with this bug
    description: function () {
        if (typeof Bug !== "undefined")
            return Bug.getDescription(Bug.bug);

        return "";
    },

    reproductionSteps: function () {
        if (typeof Bug !== "undefined")
            return Bug.getReproductionSteps(Bug.bug);

        return "";
    },

    createUrl: function (bug) {
        console.log(bug);

        return "https://becktechnology.atlassian.net/browse/" + bug.key;
    },
    getDescription: function (bug) {

        return bug.fields.summary;
    },
    getReproductionSteps: function (bug) {

        return bug.fields.description;
    },
    transitionBug: function (bug) {
        var transitionArray = [];

        var transitions = Bug.api.listTransitions(bug.key,
            function (error, data) {
                if (error)
                    return [];

                if (data) {
                    var editablefields = Bug.getEditableFields(bug);
                    transitionArray = data.transitions;

                    if (transitionArray != undefined && transitionArray.length > 0) {
                        var transitionTwice = false;
                        var stephanie = "StephanieGreen";

                        var nameToAssign = "MontreDavis";

                        if (transitionArray[0].name === "Assign To Developer")
                            transitionTwice = true;


                        if (!transitionTwice) {

                            //transition the bug twice, this will move it from Assing To Developer to in development
                            for (var i = 0; i < 1; i++) {
                                Bug.api.transitionIssue(bug.key,
                                    {
                                        "fields": { "assignee": { "name": nameToAssign } },
                                        "transition": transitionArray[0].id
                                    },
                                    function(error, data) {
                                        if (error)
                                            console.log(error);

                                        if (data)
                                            console.log(data);
                                    });
                            }
                        } else {
                            if (transitionArray[0].name === "QA Verification") {
                                nameToAssign = stephanie;
                            }

                            //only transition this bug once. This will move it to development complete or qa verification
                                Bug.api.transitionIssue(bug.key,
                                    {
                                        "fields": { "assignee": { "name": nameToAssign } },
                                        "transition": transitionArray[0].id
                                    },
                                    function(error, data) {
                                        if (error)
                                            console.log(error);

                                        if (data)
                                            console.log(data);
                                    });
                        }
                    }
                }
                return [];
            });
    },
    update: function (bug, api) {

        var fields = bug.fields || {};

        if (fields !== {}) {
            console.log(fields);
        }

        //api.updateIssue(bug.key,
        //    {
        //        "fields": {
        //             "summary" : "testing chaning the description from my application TD"
        //         }
        //    },
        //    function(error, data) {
        //        if (error)
        //            console.log("There was an error updating the issue : " + bug);

        //        if (data)
        //            console.log(data);
        //    });
    },
    getEditableFields: function (bug, api) {
        var fields = [];

        //calls into the api to get the editable fields
        Bug.api.editableFields(bug.key,
            function (error, data) {
                if (error)
                    return fields;

                if (data) {
                    fields = data;
                    return fields;
                }

                return fields;
            });

        return fields;
    }
}

module.exports = router;