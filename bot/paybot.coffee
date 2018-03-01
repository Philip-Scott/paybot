# Description:
#   Allows Hubot to make payment requests
#
# Dependencies:
#   None
#
# Configuration:
#   None
#
# Commands:
#   hubot pay <x> to <person> - Adds a payment of X to PERSON
#   hubot pay <x> to <person> for <EVENT> - Adds a payment of X to PERSON for EVENT
#   hubot balance - Gets the group's balance
#   hubot balance me - Gets your balance
#   hubot balance for <EVENT> - Gets the group's balance for an event
#   hubot balance me for <EVENT> - Gets your balance for an event
#
# Author:
#   philip-scott

request = require('request');

PAY_HELP = '- `pay X to @person` - Adds a payment of X to person\n- `pay <x> to <person> for <EVENT>` - Adds a payment for an EVENT'

module.exports = (robot) ->
  robot.respond /pay \$?([0-9]*\.?[0-9]?[0-9]?) to @([^ ]*)\s*$/i, (msg) ->
    paymentValidator(robot, msg)

  robot.respond /pay \$?([0-9]*\.?[0-9]?[0-9]?) to @([^ ]*) for ([\w|\s]*)\s*$/i, (msg) ->
    paymentValidator(robot, msg)

  robot.respond /balance\s*$/i, (msg) ->
    msg.reply "DEMO: Showing your team's balance: "

  robot.respond /balance me\s*$/i, (msg) ->
    msg.reply "DEMO: Showing your balance: "

  robot.respond /balance for ([\w|\s]*)\s*$/i, (msg) ->
    msg.reply "DEMO: Showing your team's balance for event " + msg.match[1]

  robot.respond /balance me for ([\w|\s]*)\s*$/i, (msg) ->
    msg.reply "DEMO: Showing your balance for event  " + msg.match[1]

  robot.respond /pay(\s+help)?\s*$/, (msg) ->
    sendMessage msg, PAY_HELP



paymentValidator = (robot, msg) ->
  amount = parseFloat(msg.match[1])
  if amount <= 0 or isNaN amount
    sendError msg, "Amount must be greater than 0"
    return false

  if amount > 2048
    sendError msg, "You should not be sending this much money"
    return false

  payer = msg.message.user
  receiver = robot.brain.userForName msg.match[2]

  if receiver is null
    sendError msg, "This user does not exist"
    return false

  if receiver.slack.is_bot or receiver.slack.is_restricted or receiver.slack.is_app_user
    sendError msg, "This user cannot receive a payment"
    return false

  if (payer is null or payer is undefined or payer.is_bot or payer.is_restricted or payer.is_app_user)
    sendError msg, "You're not allowed to send a payment"
    return false

  if (payer.id is receiver.slack.id)
    sendError msg, "You're not allowed to send a payment to yourself"
    return false

  message = msg.match[3];

  payload = {
    'payer': payer.id,
    'receiverID': receiver.slack.id,
    'receiverName': receiver.slack.real_name,
    'tag': message,
    'teamID' : receiver.slack.team_id,
    'amount' : amount
  }

  sendPayment msg, payload


sendError = (msg, message) ->
  msg.send({
    attachments: [{
        title: 'Error: ' + message,
        fallback: 'Error: ' + message,
        color: "#ed5353"
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  });


sendConfirmation = (msg, message) ->
  msg.send({
    attachments: [{
        title: 'Success! ' + message,
        fallback: 'Success! ' + message,
        color: "#9bdb4d"
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  });


sendMessage = (msg, message) ->
  msg.send({
    attachments: [{
        title: 'Your Help Is Here!',
        fallback: message,
        color: "#64BAFF",
        text: message,
        mrkdwn: true,
        footer: "Made with :heart: for Valiendo Verga"
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  });


sendPayment = (msg, object) ->
  request({
    url: process.env.PAYBOT_URL + 'pay',
    method: "POST",
    json: true,
    headers: {
      'x-api-key': process.env.PAYBOT_API_KEY
    },
    body: object
  }, (error, response, body) ->
      if response.body.error isnt undefined
        sendError msg, response.body.error
      else
        sendConfirmation msg, response.body.message
  );