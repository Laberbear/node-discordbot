/*
  Simple pong response on a ping message directed at the bot
*/

var exports = module.exports = {};

var message_handler = function(discordClient, discordEvent, message_content){
  discordEvent.message.reply("Pong")
}

exports.getCommands = function(){
  command = {
    'name' : "ping",
    'description' : "Bot responds with pong",
    'handler' : message_handler
  }
  return command;
}
