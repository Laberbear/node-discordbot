/*
  Simple pong response on a ping message directed at the bot
*/

var exports = module.exports = {};

var message_handler = function(discordClient, discordEvent, message_content, botInfo){
  var reply_message = "Currently installed commands are: \n";

  for(command of botInfo.registeredCommands){
    reply_message += command.name + " - " + command.description + "\n"
  }
  discordEvent.message.reply(reply_message);
}

exports.getCommands = function(){
  command = {
    'name' : "help",
    'description' : "Displays the bot's help message",
    'handler' : message_handler
  }
  return command;
}
