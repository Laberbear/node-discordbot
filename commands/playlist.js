/*
  Provides a simple interface play, pause and stop commands in a list

  To make a command compatible it has to register the following
  handlers beside the normal one
  command.playlistPause;
  command.playlistStop;
*/

var exports = module.exports = {};

var playlist = [];
var currentPosition = -1;

var addHandler = function(message_content, e, bot, callback){
  console.log("Add handler called!");
  //console.log(bot.getCommand("play"));
  var requestedCommand = bot.getCommand(message_content.split(" ")[1]);
  if(requestedCommand === undefined){
    callback("couldnt find requested command");
    return;
  }
  if(e){
    e.message.reply("The following command was added to the playlist: " + requestedCommand.name);
  }
  console.log("pushing: ", requestedCommand.name + " " + message_content.split(" ")[2])
  playlist.push(requestedCommand.name + " " + message_content.split(" ")[2]);
}

var startHandler = function(message_content, e, bot, callback){
  //If the position is not reset, stop the currently playing command.
  console.log(currentPosition);
  if(currentPosition != -1){
    console.log("trying to stop old shit");
    bot.getCommand(playlist[currentPosition].split(" ")[0]).playlistStop(bot);
  }
  currentPosition = -1;
  nextCommand(bot.discordClient, e, bot);
}

var stopHandler = function(message_content, e, bot, callback){
  bot.getCommand(playlist[currentPosition].split(" ")[0]).playlistStop(bot);
  currentPosition = -1;
}

var nextHandler = function(message_content, e, bot, callback){
  bot.getCommand(playlist[currentPosition].split(" ")[0]).playlistStop(bot);
  nextCommand(bot.discordClient, e, bot);
}

var prevHandler = function(message_content, e, bot, callback){
  bot.getCommand(playlist[currentPosition].split(" ")[0]).playlistStop(bot);
  currentPosition -= 2;
  nextCommand(bot.discordClient, e, bot);
}


exports.getCommands = function(){
  command = [{
    'name' : "add",
    'description' : "Add a song or command to the current playlist",
    'handler' : addHandler
  },
  {
    'name' : "start",
    'description' : "Start the playlist from the beginning",
    'handler' : startHandler
  },
  {
    'name' : "stop",
    'description' : "Stop the playlist",
    'handler' : stopHandler
  },
  {
    'name' : "next",
    'description' : "Start the next playlist command",
    'handler' : nextHandler
  },
  {
    'name' : "prev",
    'description' : "Start the previous playlist command",
    'handler' : nextHandler
  }]
  return command;
}

function nextCommand(discordClient, discordEvent, botInfo){
  console.log("next command to call")

  currentPosition++;
  if(currentPosition >= playlist.length){
    console.log("No more commands available");
    currentPosition = -1;
    return
  }
  botInfo.callBotCommand(playlist[currentPosition], discordEvent,  function (){
    console.log("next was called");
    nextCommand(discordClient, discordEvent, botInfo)
  })

}
