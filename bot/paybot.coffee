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

request = require('request')

PAY_HELP = [
  '- `pay X to @person` - Adds a payment of X to person',
  '- `pay <x> to <person> for <EVENT>` - Adds a payment for an EVENT',
  '- `balance`  Gets the group\'s balance',
  '- `balance me` Gets your balance',
  '- `balance for <EVENT>` Gets balance for EVENT'
]

COLOR_ERROR = "#ed5353"
COLOR_SUCCESS = "#9bdb4d"
COLOR_NORMAL = "#64BAFF"

module.exports = (robot) ->
  robot.respond /pay \$?([0-9]*\.?[0-9]?[0-9]?) to @([^ ]+)\s*$/i, (msg) ->
    amount = parseFloat(msg.match[1])
    receiver = robot.brain.userForName msg.match[2]
    paymentValidator robot, msg, amount, receiver

  robot.respond /pay \$?([0-9]*\.?[0-9]?[0-9]?) to @([^ ]+) for ([\w|\s]+)\s*$/i, (msg) ->
    amount = parseFloat(msg.match[1])
    receiver = robot.brain.userForName msg.match[2]
    tag = msg.match[3]
    paymentValidator robot, msg, amount, receiver, tag

  robot.respond /pay \s*@([^ ]+) \s*\$?([0-9]*\.?[0-9]?[0-9]?)\s*$/i, (msg) ->
    amount = parseFloat(msg.match[2])
    receiver = robot.brain.userForName msg.match[1]
    paymentValidator robot, msg, amount, receiver

  robot.respond /pay \s*@([^ ]+) \s*\$?([0-9]*\.?[0-9]?[0-9]?)\s* for ([\w|\s]+)\s*$/i, (msg) ->
    amount = parseFloat(msg.match[2])
    receiver = robot.brain.userForName msg.match[1]
    tag = msg.match[3]
    paymentValidator robot, msg, amount, receiver, tag

  robot.respond /balance\s*$/i, (msg) ->
    sendBalance robot, msg

  robot.respond /balance me\s*$/i, (msg) ->
    sendBalance robot, msg, "ME"

  robot.respond /balance for ([\w|\s]*)\s*$/i, (msg) ->
    sendBalance robot, msg, undefined, "EVENT"

  robot.respond /balance me for ([\w|\s]*)\s*$/i, (msg) ->
    sendBalance robot, msg, "ME", "EVENT"

  robot.respond /pay(\s+help)?\s*$/, (msg) ->
    sendHelp msg, PAY_HELP.join('\n')

paymentValidator = (robot, msg, amount, receiver, tag) ->
  if amount <= 0 or isNaN amount
    sendError msg, "Amount must be greater than 0"
    return false

  if amount > 2048
    sendError msg, "You should not be sending this much money"
    return false

  if receiver is null
    sendError msg, "This user does not exist"
    return false

  if receiver.slack.is_bot or receiver.slack.is_restricted or receiver.slack.is_app_user
    sendError msg, "This user cannot receive a payment"
    return false

  payer = msg.message.user

  if (payer.is_bot or payer.is_restricted or payer.is_app_user)
    sendError msg, "You're not allowed to send a payment"
    return false

  if (payer.id is receiver.slack.id)
    sendError msg, "You're not allowed to send a payment to yourself"
    return false

  payload = {
    'payer': payer.id,
    'receiverID': receiver.slack.id,
    'receiverName': receiver.slack.real_name,
    'tag': tag,
    'teamID': receiver.slack.team_id,
    'amount': amount,
    "apiKey": process.env.PAYBOT_API_KEY
  }

  sendPayment msg, payload

sendError = (msg, message) ->
  msg.send({
    attachments: [{
        title: 'Error: ' + message,
        fallback: 'Error: ' + message,
        color: COLOR_ERROR
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  })

sendConfirmation = (msg, message, extraInfo, robot) ->
  message = {
    attachments: [{
        title: message,
        fallback: message,
        color: COLOR_SUCCESS,
        fields: new Array,
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  }

  if extraInfo isnt undefined
    fields = []
    if extraInfo.people.length > 0
      extraInfo.people.forEach ((element) ->
        name = (robot.brain.userForId element.user).real_name
        bill = {
          title: name
          value: element.value
          short: true
        }
        fields.push bill
      )
    else
      message.attachments[0].color = COLOR_NORMAL
      error = {
        title: "There's nothing here"
        value: "Try using the pay command first!"
        short: true
      }
      fields.push error

    message.attachments[0].fields = fields


  msg.send(message)

sendHelp = (msg, message) ->
  msg.send({
    attachments: [{
        title: 'Your Help Is Here!',
        fallback: message,
        color: COLOR_NORMAL,
        text: message,
        mrkdwn: true,
        footer: "Made with :heart: for Valiendo Verga"
    }],
    username: process.env.HUBOT_SLACK_BOTNAME,
    as_user: true,
  })

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
  )

sendBalance = (robot, msg, fromMe, useTag) ->
  payload = {
    "teamID": msg.message.user.team_id,
    "apiKey": process.env.PAYBOT_API_KEY
  }

  if fromMe
    messageTitle = "Your Balance "
    payload.userID = msg.message.user.id
  else
    messageTitle = "Team Balance "

  if useTag
    tag = msg.match[1]
    payload.tag = tag
    messageTitle += "for " + tag

  request({
    url: process.env.PAYBOT_URL + 'balance',
    method: "POST",
    json: true,
    headers: {
      'x-api-key': process.env.PAYBOT_API_KEY
    },
    body: payload
  }, (error, response, body) ->
      if response.body.error isnt undefined
        sendError msg, response.body.error
      else
        sendConfirmation msg, messageTitle, response.body, robot
  )