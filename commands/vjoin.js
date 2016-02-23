/*
  Command to join a requested voice channel
*/

var Discordie = require("discordie");

var exports = module.exports = {};

var message_handler = function(message_content, e, bot, callback){

  const targetChannel = message_content.replace("vjoin ", "");

  for (var channel of e.message.channel.guild.voiceChannels){
    if(channel.name.toLowerCase().indexOf(targetChannel.toLowerCase()) >= 0){
      channel.join().then(function(){
        callback()
        return
      });

    }
  }

  //If specfied channel isn't found (or isn't given), try to join the requesters
  var voiceChannels = bot.discordClient.Guilds.getBy(bot.availableGuilds[0].name).voiceChannels
  for(var channel of voiceChannels){
    console.log("Users of: " + channel.name);
    for(var user of channel.members){
      if(user.id == e.message.author.id){
        channel.join().then(function(){
          callback()
          return
        });
      }
    }
  }
}

exports.getCommands = function(){
  command = {
    'name' : "vjoin",
    'description' : "Either joins the voicechannel of the calling user or the specified one",
    'handler' : message_handler
  }
  return command;
}
