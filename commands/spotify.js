/*
  Spotify Playback Plugin

  Requires the playlist and vjoin commands to get the full functionality
*/


var exports = module.exports = {};

//Dependencies
var lame = require('lame');
var Spotify = require('spotify-web');
var async = require('async')



//Consts

//Spotify Auth and Data
var spotifyUsername = process.argv[2];
var spotifyPassword = process.argv[3];

//Global Playback Settings

var paused = false;
var stopped = false
var playHandler = function(message_content, e, bot, callback){
  message_content = message_content.replace("play ", "");
  //First check wether the given uri is for spotify
  if(message_content.indexOf("spotify:") === 0) {
    async.waterfall([
      function(callback2){
        if(!bot.discordClient.VoiceConnections.length){
          bot.callBotCommand("vjoin", e, callback2);
          return;
        } else {
          console.log("callback2 is being called");
          callback2();
          return;
        }
      },
      getSpotify,
      function (spotify, callback3){
          console.log("callback 3 is being called");
          callback3(null, spotify, message_content, e, bot);
          return;
      },
      checkSpotifyUri,
      createPlaylistOrPlay
    ], function(err){
      console.log("Spotify Play Command Callback was called (the last one)");
      console.log(err);
      callback();
    });
  } else {
    e.message.reply("No Spotify URI found!");
  }
}

var pauseHandler = function(){
  //On pause, kill the voice encoder

  //On unpause restart the voice encoder
}

var stopHandler = function(bot){
  //Kill Voice encoder
  //stop spotify stream and disconnect
  bot.stopVoice();
}


exports.getCommands = function(){
  var spotifyDescriptionPrefix = "SPOTIFY - "
  var commands = [
    {
      'name' : "play",
      'description' : spotifyDescriptionPrefix + "Plays a Spotify URI that is specified after the command",
      'handler' : playHandler,
      'playlistPause' : pauseHandler,
      'playlistStop' : stopHandler
    }
  ];
  return commands;
}

function getSpotify(callback){
    Spotify.login(spotifyUsername, spotifyPassword, callback)
}

function checkSpotifyUri(spotify, uri, e, bot, callback){
  // If the URI is a playlist
  if(uri.indexOf(":playlist:") != -1) {
    spotify.playlist(uri, function (err, playlist) {
      if (err) throw err;

      var tracks = [];
      for(var track of playlist.contents.items){
        tracks.push(track.uri);
      }
      console.log(tracks);
      console.log("callback from spotify uri checker is called");
      callback(null,spotify, tracks, bot)
      return;
    });
    return;
  }

  //If the URI is an album
  if(uri.indexOf(":album:") != -1) {
    spotify.get(uri, function (err, album) {
      if (err) throw er;
      // first get the Track instances for each disc
      var tracks = [];
      console.log(album);
      album.disc.forEach(function (disc) {
        if (!Array.isArray(disc.track)) return;
        tracks.push.apply(tracks, disc.track);
      });
      console.log(tracks);
      callback(null,spotify, tracks, bot)
  });
  return;
}

  //If the URI is just a track
  if(uri.indexOf(":track:") != -1) {
    var tracks = [];
    spotify.get(uri, function (err, track) {
      if (err) throw err;
      tracks.push(track);
      console.log(tracks);
      callback(null,spotify, tracks, bot)
      return;
    });
    return;
  }
  callback("Not a valid Spotify URI!");
  return;
}

function createPlaylistOrPlay(spotify, tracks, bot, callback){
  //When you try to play one song directly then do that,
  //If there are more, then create a playlist with the tracks
  if(tracks.length == 1){
    console.log("trying to pipe track")
    pipeTrack(spotify, tracks[0], bot, callback)
  } else {
    //Create new Playlist and Start playing
    for(var track of tracks){
      console.log("add play " + track);
      bot.callBotCommand("add play " + track, undefined, playlistCallbackHandle);
    }
    callback();
    return;
  }
}

function playlistCallbackHandle(err){
  if(err){
    console.log(err);
  }
}


function pipeTrack(spotify, track, bot, callback){
  console.log(track.externalId)
  function decode (pcmfmt) {
    console.log("Start decoding");
    bot.startVoice(track.name, pcmfmt, callback);
    mp3decoder.pipe(bot.voiceStream);
  };
  console.log('Playing: %s - %s', track.artist[0].name, track.name);
  var mp3decoder = new lame.Decoder();
  //mp3decoder.pipe(speaker);
	mp3decoder.on('format', decode);

  if(!spotify.isTrackAvailable(track,"DE")){
    console.log("Song isn't available in Country");
    //callback(null)
    //return
  }
    track.play()
      .pipe(mp3decoder)
      .on('finish', function () {
        return
      });
}
