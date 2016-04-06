var snsArn = "arn:aws:sns:us-east-1:825429109316:FromAlexa";
var AWS = require('aws-sdk'); 
AWS.config.region = 'us-east-1';

exports.handler = function (event, context) {
    var contextMessage;
    var sessionMessage;
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    contextMessage = buildResponse(sessionAttributes, speechletResponse);
                    sessionMessage = sessionAttributes;
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    contextMessage = buildResponse(sessionAttributes, speechletResponse);
                    sessionMessage = sessionAttributes;
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }

    var eventText = JSON.stringify(sessionMessage, null, 2);
    console.log("Received event:", eventText);
    var sns = new AWS.SNS();
    var params = {
        Message: eventText, 
        Subject: "EV3 Alexa Command",
        TopicArn: snsArn
    };
    
    console.log('context message: ');
    console.log(contextMessage);
    sns.publish(params, function (err, data) { 
        console.log('published data: ');
        console.log(data);
        context.succeed(contextMessage);
    });
    
    var timeout = new Date().getTime();
    while ((new Date().getTime()) - timeout > 500) {}

};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    if ("MoveIntent" === intentName) {
        setMoveSession(intent, session, callback);
    } else if ("StopIntent" === intentName) {
        endMoveSession(intent, session, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Welcome to the Alexa E. V. Three Command Tool. " +
        "Please tell me how you want me to control your E. V. Three, by saying things" +
		"like, forward 10, backward 5, left, right, turn -45, go, stop, or reverse.";

    var repromptText = "Please tell me how you want me to control your E. V. Three, by saying things" +
		"like, forward 10, backward 5, left, right, turn -45, go, stop, or reverse.";

    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setMoveSession(intent, session, callback) {
    var cardTitle = "Move";
    var actionSlot = intent.slots.Action;
    var valueSlot = intent.slots.Value;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    if (actionSlot) {
        var action = actionSlot.value;
        var value = null;
        if (valueSlot) { value = valueSlot.value; }
        sessionAttributes = createActionAttributes(action, value);
        speechOutput = action;
        repromptText = "";
    } else {
        speechOutput = "I'm not sure what action you want me to have your E. V. Three perform.";
        repromptText = "I'm not sure what action you want me to have your E. V. Three perform." +
		"Please tell me how you want me to control your E.V.Three, by saying things" +
		"like, forward 10, backward 5, left, right, turn -45, go, stop, or reverse.";
    }

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));         
}

function createActionAttributes(action, value) {
    return {
        action: action,
		value: value
    };
}

function endMoveSession(intent, session, callback) {
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "Done controlling E. V. Three.";

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
         buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "EV3 - " + title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}