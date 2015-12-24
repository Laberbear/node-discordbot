'use strict'


var async = require('async')
var fs = require("fs");



var discordEmail = process.argv[4]
var discordPassword = process.argv[5]

var Discordie = require("discordie");
var Events = Discordie.Events;

var client = new Discordie();

var botInfo = {};
botInfo.registeredCommands = [];



client.connect({ email: discordEmail, password: discordPassword });

client.Dispatcher.on(Events.GATEWAY_READY, e => {
  console.log("Connected as: " + client.User.username);
  console.log("User ID is: " + client.User.id);
  console.log("Bot has access to the following Guilds:");
  for(var i = 0;i< e.data.guilds.length; i++){
    console.log(e.data.guilds[i].name);
  }
});

client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
  if(!messageIsDirectedAtBot(e.message, client.User.id) && !e.message.isPrivate){
    console.log("Message was not directed at bot");
    return;
  }
  var message_content = e.message.content.replace("<@" + client.User.id + "> ", "");

  console.log("Message directed at bot found: " + message_content)
  for(var regCommand of botInfo.registeredCommands){
    if(message_content.indexOf(regCommand.name) == 0){
      console.log("Trying to call: " + regCommand.name)
      try{
        regCommand.handler(client, e, message_content, botInfo);
      } catch(err){
        console.error("+++ERROR+++");
        console.error("Unhandled Exception during command execution");
        console.error("Command Name: " + regCommand.name);
        console.error(err);
        console.error("+++ERROR+++");
      }
      return
    }
  }
  //If no fitting command was found respond and show the help command
  e.message.reply("The command you tried to use doesn't exist!");
  for(var regCommand of botInfo.registeredCommands){
    if(regCommand.name == "help"){
      console.log("Trying to call: " + regCommand.name)
      regCommand.handler(client, e, message_content, botInfo);
    }
  }
});

var oldNeedTime = new Date()

function messageIsDirectedAtBot(message, userid){
  for(var mentioned_user of message.mentions){
    if(mentioned_user.id == userid){
      return true;
    }
  }
  return false;
}

init()
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
        botInfo.registeredCommands.push(command)
      }
    } else {
      botInfo.registeredCommands.push(pluginCommands)
    }
  }
  console.log(botInfo.registeredCommands);
}
