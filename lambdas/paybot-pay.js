const aws = require('aws-sdk');
const dynamo = new aws.DynamoDB({apiVersion: '2012-10-08'});

exports.handler = (event, context, callback) => {
    const payer = event.payer;
    const receiver = event.receiverID;
    const receiverName = event.receiverName;
    let tag = event.tag;
    const teamID = event.teamID;
    const amount = event.amount;

    if (payer == undefined || receiver == undefined || receiverName == undefined || teamID == undefined || amount == undefined || payer == receiver || amount <= 0) {
        callback(null, { error: "Server validation failed" });
    }

    let message = {
        message: "Sent $" + amount + " to " + receiverName
    };

    if (tag != undefined) {
        message.message += " for " + tag
    } else {
        tag = 'value'
    }

    let item = {
        'team': { S: teamID },
        'user': { S: receiver },
    };

    item[tag] = { N: String(amount) };

    var params = {
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

    var docClient = new aws.DynamoDB.DocumentClient();

    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            console.log(data.Items[0]);
            data.Items.forEach((item) => {
                console.log(" -", item.year + ": " + item.title);
            });
        }
    });

    // var params = {
    //     TableName: 'paybot',
    //     Item: item
    // };

    // dynamo.putItem(params, function(err, data) {
    //     if (err) {
    //         callback(null, { error: JSON.stringify(err) });
    //     } else {
    //         callback(null, message);
    //     }
    // });
};