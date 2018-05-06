const aws = require('aws-sdk');
const https = require('https');
const dynamo = new aws.DynamoDB({
    apiVersion: '2012-10-08',
    region: "us-west-2",
    httpOptions: {
        agent: new https.Agent({
            rejectUnauthorized: true,
            keepAlive: true
        })
    }
});

const DEFAULT_TAG = "~value";
const docClient = new aws.DynamoDB.DocumentClient({ service: dynamo });

exports.handler = (event, context, callback) => {
    const payer = event.payer;
    const receiver = event.receiverID;
    const receiverName = event.receiverName;
    let tag = (event.tag ? event.tag.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : undefined);
    const teamID = event.teamID;
    const amount = event.amount;
    const apiKey = event.apiKey;

    if (!payer || !receiver || !receiverName || !teamID || !amount || !apiKey || payer == receiver || amount <= 0) {
        callback(null, { error: "Server validation failed" });
    }

    let message = {
        message: "Sent $" + amount + " to " + receiverName
    };

    if (tag != undefined) {
        message.message += " for " + tag;
    } else {
        tag = '~value';
    }

    let payerItem = {
        'team': { S: teamID },
        'user': { S: payer },
    };

    let receiverItem = {
        'team': { S: teamID },
        'user': { S: receiver },
    };

    var receiverParams = getParameters (teamID, receiver);
    var payerParams = getParameters (teamID, payer);
    var authParams = getParameters (apiKey, teamID);

    var queries = [];
    queries.push (docClient.query(receiverParams).promise());
    queries.push (docClient.query(payerParams).promise());
    queries.push (docClient.query(authParams).promise());

    Promise.all(queries).then((results) => {
        if (results[2].Count == 0) {
            callback(null, { error: "Invalid API Key" });
            return;
        }

        var receiverData = results[0].Items[0];
        var payerData = results[1].Items[0];

        var receiverValue = (receiverData && receiverData[tag]) ? Number(receiverData[tag]) : 0;
        var payerValue = (payerData && payerData[tag]) ? Number(payerData[tag]) : 0;

        receiverValue += amount;
        payerValue -= amount;

        receiverItem[tag] = { N: String(receiverValue) };
        payerItem[tag] = { N: String(payerValue) };

        receiverParams = {
            TableName: 'paybot',
            Key:{
                "team": teamID,
                "user": receiver
            },
            UpdateExpression: `set #k = :a`,
            ExpressionAttributeNames:{
                "#k": tag
            },
            ExpressionAttributeValues:{
                ":a": receiverValue,
            },
            ReturnValues:"UPDATED_NEW"
        };

        payerParams = {
            TableName: 'paybot',
            Key:{
                "team": teamID,
                "user": payer
            },
            UpdateExpression: `set #k = :a`,
            ExpressionAttributeNames:{
                "#k": tag
            },
            ExpressionAttributeValues: {
                ":a": payerValue,
            },
            ReturnValues:"UPDATED_NEW"
        };

        if(tag != DEFAULT_TAG) {
            receiverValue = (receiverData && receiverData[DEFAULT_TAG]) ? Number(receiverData[DEFAULT_TAG]) : 0;
            payerValue = (payerData && payerData[DEFAULT_TAG]) ? Number(payerData[DEFAULT_TAG]) : 0;

            receiverValue += amount;
            payerValue -= amount;

            receiverItem[DEFAULT_TAG] = { N: String(receiverValue) };
            payerItem[DEFAULT_TAG] = { N: String(payerValue) };

            payerParams.UpdateExpression = 'set #k = :a, #b = :b';
            receiverParams.UpdateExpression = 'set #k = :a, #b = :b';
            payerParams.ExpressionAttributeNames['#b'] = DEFAULT_TAG;
            receiverParams.ExpressionAttributeNames['#b'] = DEFAULT_TAG;
            payerParams.ExpressionAttributeValues[':b'] = payerValue;
            receiverParams.ExpressionAttributeValues[':b'] = receiverValue;
        }

        queries = [];

        queries.push(docClient.update(receiverParams).promise());
        queries.push(docClient.update(payerParams).promise());

        Promise.all(queries).then(() => {
            callback(null, message);
        }).catch((err) => {
            callback(null, { error: JSON.stringify(err) });
        });
    }).catch((err) => {
        callback(null, { error: JSON.stringify(err) });
    });
};

const getParameters = (teamID, userID) => {
    return {
        KeyConditionExpression: '#t = :team and #u = :user',
        TableName: 'paybot',
        ExpressionAttributeNames: {
            "#u": "user",
            "#t": "team"
        },
        ExpressionAttributeValues: {
            ':team': teamID,
            ':user': userID
        },
    };
};