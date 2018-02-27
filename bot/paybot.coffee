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

module.exports = (robot) ->
  robot.respond /pay ([^ ]*) to ([^ ]*)$/i, (msg) ->
    amount = parseFloat(msg.match[1])
    msg.reply "DEMO: payment register for " + amount + " to " + msg.match[2]
  robot.respond /pay ([^ ]*) to ([^ ]*) for ([^ ]*)$/i, (msg) ->
    amount = parseFloat(msg.match[1])
    msg.reply "DEMO: payment register for " + amount + " to " + msg.match[2] + " for " + msg.match[3]
  robot.respond /balance$/i, (msg) ->
    msg.reply "DEMO: Showing your team's balance: "
  robot.respond /balance me$/i, (msg) ->
    msg.reply "DEMO: Showing your balance: "
  robot.respond /balance for ([^ ]*)$/i, (msg) ->
    msg.reply "DEMO: Showing your team's balance for event " + msg.match[1]
  robot.respond /balance me for ([^ ]*)$/i, (msg) ->
    msg.reply "DEMO: Showing your balance for event  " + msg.match[1]