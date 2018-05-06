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

const docClient = new aws.DynamoDB.DocumentClient({ service: dynamo });
const DEFAULT_TAG = "~value";

exports.handler = (event, context, callback) => {
    const tag = (event.tag ? event.tag.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : DEFAULT_TAG);
    const teamID = event.teamID;
    const userID = event.userID;
    const apiKey = event.apiKey;

    if (!teamID || !apiKey) {
        callback(null, { error: "Server validation failed" });
    }

    const teamParams = getParamenters(teamID, userID);
    const authParams = getParamenters(apiKey, teamID);

    const queries = [];
    queries.push (docClient.query(teamParams).promise());
    queries.push (docClient.query(authParams).promise());

    Promise.all(queries).then((results) => {
        if (results[1].Count == 0) {
            callback(null, { error: "Invalid API Key" });
            return;
        }

        const requestData = results[0].Items;

        const result = {
            people: []
        };

        requestData.map (person => {
            if(person[tag]) {
                result.people.push({
                    user: person.user,
                    value: person[tag]
                });
            }
        });
        callback(null, result);
    }).catch((err) => {
        console.log(err);
        callback(null, { error: JSON.stringify(err) });
    });
};

const getParamenters = (teamID, userID) => {
    if (userID) {
        return {
            KeyConditionExpression: '#t = :team and #u = :user',
            TableName: 'paybot',
            ExpressionAttributeNames: {
                "#t": "team",
                "#u": "user"
            },
            ExpressionAttributeValues: {
                ':team': teamID,
                ':user': userID
            }
        };
    } else {
        return {
            KeyConditionExpression: '#t = :team',
            TableName: 'paybot',
            ExpressionAttributeNames: {
                "#t": "team"
            },
            ExpressionAttributeValues: {
                ':team': teamID
            }
        };
    }
};