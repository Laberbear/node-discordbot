/*
  Shows the number of messages that each channel member have posted
*/

var exports = module.exports = {};

var message_handler = function(message_content, e, bot, callback){
  var messagesToFetch = message_content.replace("messagerank", "");
  if(messagesToFetch == ""){
    messagesToFetch = 100;
  }
  var userlist = [];
  var userdata = {};
  console.log(e.message.channel.messages)
  var messagelist = [];
  var fetchMessagesEx = (channel, limit) => {
    var before = (channel.messages[0] || {}).id;
    return channel.fetchMessages(limit, before).then(e => onFetch(e, channel, limit));
  }
  var onFetch = (e, channel, left) => {
      if (!e.messages.length) return Promise.resolve();
      left -= e.messages.length;
      messagelist.push.apply(messagelist, e.messages);
      if (left <= 0) return Promise.resolve();
      return fetchMessagesEx(channel, left);
  }
  fetchMessagesEx(e.message.channel, messagesToFetch).then(function(messages, err){
      console.log("Data arrived")
      for(var i = 0;i<messagelist.length;i++){
        var msg = messagelist[i]
        if(msg === undefined){
          break;
        }
        if(userdata[msg.author.username] != undefined){
          userdata[msg.author.username]++;
        } else {
          userdata[msg.author.username] = 1;
          userlist.push(msg.author.username);
        }
      }
      var sortable = [];
      for(var i = 0;i<userlist.length;i++){
        sortable.push([userlist[i], userdata[userlist[i]]]);
      }
      console.log("unsorted", sortable);
      sortable.sort(function(a,b) {
        console.log("sorting var")
        return b[1] - a[1];
      });
      console.log("sorted", sortable)
      var percentages = [];

      console.log(sortable)
      for(var i = 0; i<sortable.length;i++){
              e.message.reply(sortable[i][0] + " " + sortable[i][1] + " Messages");
      }
      console.log(userdata)

  });
}

exports.getCommands = function(){
  command = {
    'name' : "messagerank",
    'description' : "Gives a breakdown of message contribution by each user for the last week",
    'handler' : message_handler
  }
  return command;
}
