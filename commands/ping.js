/*
  Simple pong response on a ping message directed at the bot
*/

var exports = module.exports = {};

var message_handler = function(message_content, e, bot, callback){
  bot.discordEvent.message.reply("Pong")
  callback()
}

exports.getCommands = function(){
  command = {
    'name' : "ping",
    'description' : "Bot responds with pong",
    'handler' : message_handler
  }
  return command;
}
