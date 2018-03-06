const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB({apiVersion: '2012-10-08'});

exports.handler = (event, context, callback) => {
    const payer = event.payer;
    const receiver = event.receiverID;
    const receiverName = event.receiverName;
    let tag = event.tag;
    const teamID = event.teamID;
    const amount = event.amount;

    if (!payer || !receiver || !receiverName || !teamID || !amount || payer == receiver || amount <= 0) {
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

    tag = "~value";

    let payerItem = {
        'team': { S: teamID },
        'user': { S: payer },
    };

    let receiverItem = {
        'team': { S: teamID },
        'user': { S: receiver },
    };

    var receiverParams = {
        KeyConditionExpression: '#t = :team and #u = :user',
        TableName: 'paybot',
        ExpressionAttributeNames: {
            "#u": "user",
            "#t": "team"
        },
        ExpressionAttributeValues: {
            ':team': teamID,
            ':user': receiver
        },
    };

    var payerParams = {
        KeyConditionExpression: '#t = :team and #u = :user',
        TableName: 'paybot',
        ExpressionAttributeNames: {
            "#u": "user",
            "#t": "team"
        },
        ExpressionAttributeValues: {
            ':team': teamID,
            ':user': payer
        },
    };

    var docClient = new aws.DynamoDB.DocumentClient();

    var queries = [];
    queries.push (docClient.query(receiverParams).promise());
    queries.push (docClient.query(payerParams).promise());

    Promise.all(queries).then((results) => {
        var receiverData = results[0].Items[0];
        var payerData = results[1].Items[0];

        var receiverValue = (receiverData && receiverData[tag]) ? Number(receiverData[tag]) : 0;
        var payerValue = (payerData && payerData[tag]) ? Number(payerData[tag]) : 0;

        receiverValue += amount;
        payerValue -= amount;

        receiverItem[tag] = { N: String(receiverValue) };
        payerItem[tag] = { N: String(payerValue) };

        if(tag != "~value") {
            tag = "~value";
            receiverValue = (receiverData && receiverData[tag]) ? Number(receiverData[tag]) : 0;
            payerValue = (payerData && payerData[tag]) ? Number(payerData[tag]) : 0;

            receiverValue += amount;
            payerValue -= amount;

            receiverItem[tag] = { N: String(receiverValue) };
            payerItem[tag] = { N: String(payerValue) };
        }

        receiverParams = {
            TableName: 'paybot',
            Item: receiverItem,
        };
        payerParams = {
            TableName: 'paybot',
            Item: payerItem,
        };

        queries = [];

        queries.push(dynamo.putItem(receiverParams).promise());
        queries.push(dynamo.putItem(payerParams).promise());

        Promise.all(queries).then(() => {
            callback(null, message);
        }).catch((err) => {
            callback(null, { error: JSON.stringify(err) });
        });
    }).catch((err) => {
        callback(null, { error: JSON.stringify(err) });
    });
};