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

exports.handler = (event, context, callback) => {
    const tag = (event.tag ? event.tag : DEFAULT_TAG).normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const teamID = event.teamID;
    const userID = event.userID;

    if (!teamID) {
        callback(null, { error: "Server validation failed" });
    }

    const teamParams = getParamenters(teamID, userID);

    const docClient = new aws.DynamoDB.DocumentClient({ service: dynamo });

    const queries = [];
    queries.push (docClient.query(teamParams).promise());

    Promise.all(queries).then((results) => {
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