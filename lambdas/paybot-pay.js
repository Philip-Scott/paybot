exports.handler = (event, context, callback) => {
    const payer = event.payer;
    const receiver = event.receiverID;
    const receiverName = event.receiverName;
    const tag = event.tag;
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
    }

    callback(null, message);
};