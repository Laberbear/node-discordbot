/*
  Command to join a requested voice channel
*/

var exports = module.exports = {};

var message_handler = function(discordClient, discordEvent, message_content){
  console.log("Bot is called with vjoin")
  //console.log(discordEvent.message.author)
  //console.log(discordClient)
  const targetChannel = message_content.replace("vjoin ", "");
  discordEvent.message.channel.guild.voiceChannels
  .forEach(channel => {
    if(channel.name.toLowerCase().indexOf(targetChannel) >= 0)
      channel.join().then(v => play(v));
      // channel.join() returns a promise with voiceConnectionInfo
  });
}

exports.getCommands = function(){
  command = {
    'name' : "vjoin",
    'description' : "Either joins the voicechannel of the calling user or the specified one",
    'handler' : message_handler
  }
  return command;
}
