/*
  Spotify Playback Plugin
*/

var exports = module.exports = {};

var stopPlaying = false;
var nextPlaying = false;

var playlistUri = ""

var globalVolume = 1

var volume = require("pcm-volume");
var lame = require('lame');
var Spotify = require('spotify-web');
var async = require('async')

// Spotify credentials...
var spotifyUsername = process.argv[2];
var spotifyPassword = process.argv[3];


var playHandler = function(discordClient, discordEvent, message_content){
  const requestedUri = message_content.replace("play  ", "");
  stopPlaying = false;
  nextPlaying = false;
  if(requestedUri.indexOf("playlist") != -1){
    console.log("Trying to playlist " + requestedUri)
    playlistUri = requestedUri
    startPlaylist(discordClient, discordEvent, donePlaying);
  } else if (requestedUri.indexOf("track") != -1){
    console.log("Trying to play song" + requestedUri)
    var songUri = requestedUri
    var tempJSON = {}
    tempJSON.songUri = songUri
    tempJSON.discordEvent = discordEvent
    tempJSON.discordClient = discordClient
    playUri(tempJSON, donePlaying)
  } else {
    console.log("Trying to play example song " + requestedUri)
    var songUri = "spotify:track:1OsCKwNZxph96EkNusILRy"
    var tempJSON = {}
    tempJSON.songUri = songUri
    tempJSON.discordEvent = discordEvent
    tempJSON.discordClient = discordClient
    playUri(tempJSON, donePlaying)
  }
}

var nextHandler = function(discordClient, discordEvent, message_content){
  nextPlaying = true;
}
var stopHandler = function(discordClient, discordEvent, message_content){
  stopPlaying = true;
}
var volHandler = function(discordClient, discordEvent, message_content){
  var requestedVolume = message_content.replace("vol ", "");
  globalVolume = requestedVolume
}

exports.getCommands = function(){
  var spotifyDescriptionPrefix = "SPOTIFY - "
  commands = [
    {
      'name' : "play",
      'description' : spotifyDescriptionPrefix + "Plays a Spotify URI that is specified after the command",
      'handler' : playHandler
    },{
      'name' : "next",
      'description' : spotifyDescriptionPrefix + "Plays the next song in the Playlist",
      'handler' : nextHandler
    },{
      'name' : "stop",
      'description' : spotifyDescriptionPrefix + "Stops the playback",
      'handler' : stopHandler
    },{
      'name' : "vol",
      'description' : spotifyDescriptionPrefix + "Sets the volume of the bot",
      'handler' : volHandler
    }
  ];
  return commands;
}

function playUri(uriEventAndClient, callback) {
  var songuri = uriEventAndClient.songUri
  var discordEvent = uriEventAndClient.discordEvent
  var client = uriEventAndClient.discordClient
	nextPlaying = false;

	var mp3decoder = new lame.Decoder();
  var v = new volume()
	mp3decoder.on('format', decode);
  mp3decoder.pipe(v)
  //mp3decoder.pipe(v)
  Spotify.login(spotifyUsername, spotifyPassword, function (err, spotify) {
    if (err) throw err;

    // first get a "Track" instance from the track URI

    console.log(songuri)
    spotify.get(songuri, function (err, track) {
      if (err) throw err;
      console.log('Playing: %s - %s', track.artist[0].name, track.name);
      // play() returns a readable stream of MP3 audio data
      console.log(track)
      if(!spotify.isTrackAvailable(track,"DE")){
        try{
          discordEvent.message.reply("This song is not available in Germany, sorry!")
        } catch(err) {
          console.log("Tried to reply to undefined event")
        }
        nextPlaying =  true
        callback(null)
        return
      }
        track.play()
          .pipe(mp3decoder)
          .on('finish', function () {
            spotify.disconnect();
            stopPlaying = true;
            callback()
            return
          });
    });
  });
	function decode(pcmfmt) {
		// note: discordie encoder does resampling if rate != 48000
		var options = {
			frameDuration: 60,
			sampleRate: pcmfmt.sampleRate,
			channels: pcmfmt.channels,
			float: false,

			multiThreadedVoice: true
		};

		const frameDuration = 60;

		var readSize =
			pcmfmt.sampleRate / 1000 *
			options.frameDuration *
			pcmfmt.bitDepth / 8 *
			pcmfmt.channels;

		v.once('readable', function() {
			if(!client.VoiceConnections.length) {
				return console.log("Voice not connected");
			}

			var voiceConnectionInfo = client.VoiceConnections[0];

			var voiceConnection = voiceConnectionInfo.voiceConnection;

			// one encoder per voice connection
			var encoder = voiceConnection.getEncoder(options);

			const needBuffer = () => encoder.onNeedBuffer();
      var lastChunk = v.read(readSize)
			encoder.onNeedBuffer = function() {
        //console.log(v)
        //console.log("Need a new Chunk after" + ((new Date()) - oldNeedTime))
        //oldNeedTime = new Date()
        v.setVolume(globalVolume)
				if (stopPlaying){
          console.log("stopped playing")
          callback("Stop play")
          return;
        }
        if (nextPlaying){
          console.log("playing next track")
          callback(null)
          return;
        }
				// delay the packet if no data buffered
				if (!lastChunk) {
          console.log("No packet to send!")
          lastChunk = v.read(readSize)
          return setTimeout(needBuffer, options.frameDuration);
        }

				var sampleCount = readSize / pcmfmt.channels / (pcmfmt.bitDepth / 8);
				encoder.enqueue(lastChunk, sampleCount);
        lastChunk = v.read(readSize)
			};

			needBuffer();
		});

		v.once('end', () => callback);
	}
}

function getSpotify(callback){
    Spotify.login(spotifyUsername, spotifyPassword, callback)
}

function getPlaylist(spotify, callback){
  if(playlistUri == ""){
    callback("Playlist Uri isn't set")
    return
  }
  spotify.playlist(playlistUri, function (err, playlist) {
    if (err) throw err;

    console.log(playlist.contents);
    var uriArray = [];
    for(var i = 0;i<playlist.contents.items.length;i++){
      uriArray.push(playlist.contents.items[i].uri)
    }
    spotify.disconnect();
    callback(err, uriArray)
    return
  });
}


function startPlaylist(discordClient, e, callback){
  async.waterfall(
    [
      getSpotify,
      getPlaylist
    ],
  function(err, results){
    console.log(results)
    for(var i = 0; i<results.length;i++){
      var tempUri = results[i]
      results[i] = {}
      results[i].songUri = tempUri
      results[i].discordClient = discordClient
      results[i].discordEvent = e
    }
    async.mapSeries(results, playUri, function(err, results){
      console.log("Async Complete")
      callback(err)
      return
    })

});
}

function donePlaying(err){
  console.log("Done playing requestedUri")
}
