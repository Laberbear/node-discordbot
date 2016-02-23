/*
  Simple pong response on a ping message directed at the bot
*/

var exports = module.exports = {};

var message_handler = function(message_content, e, bot, callback){
  var reply_message = "Currently installed commands are: \n!";
  if(!e){
    console.log("Event isn't set, I can't reply to this message!");
  }


  for(var command of bot.registeredCommands){
    reply_message += command.name + " - " + command.description + "\n"
  }
  e.message.reply(reply_message);

  callback();
}

exports.getCommands = function(){
  var command = {
    'name' : "help",
    'description' : "Displays the bot's help message",
    'handler' : message_handler
  }
  return command;
}
