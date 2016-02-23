/*
  Global Volume Setting
*/

var volHandler = function(message_content, e, bot, callback){
  var requestedVolume = message_content.replace("vol ", "");
  bot.voiceVolume = Math.max(0, Math.min(requestedVolume, 5));
  if(bot.voiceStream){
    bot.voiceStream.setVolume(bot.voiceVolume);  
  }

}

exports.getCommands = function(){
  var spotifyDescriptionPrefix = "SPOTIFY - "
  command = {
      'name' : "vol",
      'description' : "Sets the volume of the bot",
      'handler' : volHandler
    };
  return command;
}
