'use strict'


var async = require('async')
var fs = require("fs");
var Discordie = require("discordie");
var volume = require("pcm-volume");

var discordEmail = process.argv[4]
var discordPassword = process.argv[5]

var discordAuth = {
  'email' : process.argv[4],
  'password' : process.argv[5]
};

var bot = {};
bot.registeredCommands = [];
bot.availableGuilds = [];
bot.discordClient = new Discordie();
bot.discordEvents = Discordie.Events;

bot.discordClient.connect(discordAuth);

/*
  Connect Event handling
*/
bot.discordClient.Dispatcher.on(bot.discordEvents.GATEWAY_READY, e => {
  console.log("Connected as: " + bot.discordClient.User.username);
  console.log("User ID is: " + bot.discordClient.User.id);
  console.log("Bot has access to the following Guilds:");
  for(var i = 0;i< e.data.guilds.length; i++){
    console.log(e.data.guilds[i].name);
  }
  bot.availableGuilds = e.data.guilds;
});

/*
  Automatic AFK moving on initial connect
*/
bot.discordClient.Dispatcher.on(bot.discordEvents.PRESENCE_UPDATE, function(e, socket){
  console.log(e);
  console.log(e.member.status)
  console.log(e.member.previousStatus);
  if(e.member.status == "online" && e.member.previousStatus == "offline"){
    console.log("trying to move " + e.member.username);
    console.log(e.guild.afk_channel);
    e.member.setChannel(e.guild.afk_channel);
  }
});

/*
  Main Command Execution Event handling
*/
bot.discordClient.Dispatcher.on(bot.discordEvents.MESSAGE_CREATE, e => {
  if(!messageIsDirectedAtBot(e.message, bot.discordClient.User.id) && !e.message.isPrivate){
    console.log("Message was not directed at bot");
    return;
  }
  var message_content = e.message.content.replace("<@" + bot.discordClient.User.id + "> ", "");
  message_content = message_content.replace("!","");
  console.log("Message directed at bot found: " + message_content + " by: " + e.message.author.username)
  bot.callBotCommand(message_content, e, commandCallback);
});

/*
  Automatic reconnection on Disconnect event
  Copied straight from the examples
*/
bot.discordClient.Dispatcher.on(Discordie.Events.DISCONNECTED, (e) => {
  console.log("Disconnected from Discord Server");
  const delay = 5000;
	const sdelay = Math.floor(delay/100)/10;

	if (e.error.message.indexOf("gateway") >= 0) {
		console.log("Disconnected from gw, resuming in " + sdelay + " seconds");
	} else {
		console.log("Failed to log in or get gateway, reconnecting in " + sdelay + " seconds");
	}
	setTimeout(function(){
    bot.discordClient.connect(discordAuth);
  }, delay);
});


var oldNeedTime = new Date()

function messageIsDirectedAtBot(message, userid){
  for(var mentioned_user of message.mentions){
    if(mentioned_user.id == userid){
      return true;
    }
  }
  if(message.content.indexOf("!") == 0){
    return true;
  }
  return false;
}

bot.callBotCommand = function (message_content, e, callback){
  for(var regCommand of this.registeredCommands){
    if(message_content.indexOf(regCommand.name) == 0){
      console.log("Trying to call: " + regCommand.name)
      try{
        regCommand.handler(message_content, e, this, callback);
      } catch(err){
        console.error("+++ERROR+++");
        console.error("Unhandled Exception during command execution");
        console.error("Command Name: " + regCommand.name);
        console.error(err);
        console.error("+++ERROR+++");
        throw err;
      }
      return
    }
  }

  //If no fitting command was found respond and show the help command
  if(e){
    e.message.reply("The command you tried to use doesn't exist!");
    this.callBotCommand('help', e, function(){});
  }
}

bot.getCommand = function (commandName){
  for(var command of bot.registeredCommands){
    if (command.name.toLowerCase() == commandName.toLowerCase()){
      return command;
    }
  }
  console.log("Couldn't find requested command: |" + commandName + "|");
  return undefined
}

bot.startVoice = function (currentlyPlaying, pcmformat, callback)  {
  console.log("Setting current Song to: " + currentlyPlaying);
  bot.voiceStream = new volume();
  bot.voiceStream.setVolume(bot.voiceVolume || 0.02);
  bot.discordClient.User.setGame({ "name": currentlyPlaying});

  bot.voiceIsPaused = false;
  bot.voiceIsStopped = false;

  var options = {
    frameDuration: 60,
    sampleRate: pcmformat.sampleRate,
    channels: pcmformat.channels,
    float: false,

    multiThreadedVoice: true
  };

  // How much data will be read per discord voice buffer
  var readSize =
    pcmformat.sampleRate / 1000 *
    options.frameDuration *
    pcmformat.bitDepth / 8 *
    pcmformat.channels;

  bot.voiceStream.once('readable', function() {
    console.log("Stream Incoming!");
    if(!bot.discordClient.VoiceConnections.length) {
       callback("Voice is not conected");
      return console.log("BOT | Voice not connected");
    }
    var voiceConnectionInfo = bot.discordClient.VoiceConnections[0];
    var voiceConnection = voiceConnectionInfo.voiceConnection;
    // one encoder per voice connection
    bot.voiceEncoder = voiceConnection.getEncoder(options);

    //Map onNeedBuffer event to bot.voiceNeedBuffer (can be called easily from outside)

    var lastChunk;
    bot.voiceNeedBuffer = function(){
      //If the playback is paused don't insert more data into the encoder
      if(bot.voiceIsPaused){
        return;
      }

      //If the playback should be stopped indefinetely
      if (bot.voiceIsStopped){
        console.log("BOT | Voice Playback manually stopped");
        callback();
        return;
      }
      // If the playback should happen, then read a new chunk
      lastChunk = bot.voiceStream.read(readSize);
      if (!lastChunk) {
        console.log("BOT | No readable packets for voice playback");
        return setTimeout(bot.voiceNeedBuffer, options.frameDuration);
      }
      var sampleCount = readSize / pcmformat.channels / (pcmformat.bitDepth / 8);
      bot.voiceEncoder.enqueue(lastChunk, sampleCount);
    };
    bot.voiceEncoder.onNeedBuffer = bot.voiceNeedBuffer;
    bot.voiceNeedBuffer();
  });
  bot.voiceStream.once('end', () => {
    console.log("BOT | Stream has ended");
    bot.discordClient.User.setGame({"name":''})
    this.voiceIsStopped = true;
    bot.voiceEncoder.kill();
    callback();
  });
};

bot.stopVoice = function (){
  bot.discordClient.User.setGame({"name":''});
  this.voiceIsStopped = true;
  this.voiceEncoder.kill();

};

bot.pauseVoice = function(){
  this.voiceIsPaused = true;
  this.voiceEncoder.kill();
};

bot.unpauseVoice = function(){
  this.voiceIsPaused = false;

  //Recreate the voice encoder
  //Check voice connection again
  if(!this.discordClient.VoiceConnections.length) {
    return console.log("Voice not connected");
  }
  var voiceConnectionInfo = this.discordClient.VoiceConnections[0];
  var voiceConnection = voiceConnectionInfo.voiceConnection;
  // one encoder per voice connection
  this.voiceEncoder = voiceConnection.getEncoder(options);

  //Map onNeedBuffer event to this.voiceNeedBuffer (can be called easily from outside)
  this.voiceEncoder.onNeedBuffer = this.voiceNeedBuffer;
  this.voiceNeedBuffer;
};

function checkDiscordConnection(){

}

function commandCallback(err){
  if(err){
    console.log("Command Callback retrieved the following error: ");
    console.log(err);
  }
  console.log("Command was executed flawlessly!");
}


function init(){
  //Get all plugin files in the folder
  var pluginFiles = fs.readdirSync("commands");
  var plugins = []
  for(var file of pluginFiles){
    plugins.push(require("./commands/" + file))
  }
  //Register all commands in the plugin folder
  for(var plugin of plugins){
    var pluginCommands = plugin.getCommands();
    if(pluginCommands instanceof Array){
      for(var command of pluginCommands){
        bot.registeredCommands.push(command)
      }
    } else {
      bot.registeredCommands.push(pluginCommands)
    }
  }
  console.log(bot.registeredCommands);
}

init()
