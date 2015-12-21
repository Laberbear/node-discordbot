'use strict'

var lame = require('lame');
var Spotify = require('spotify-web');
var async = require('async')
var uri = process.argv[2] || 'spotify:track:2aEuA8PSqLa17Y4hKPj5rr';
var volume = require("pcm-volume");
var globalVolume = 1

// Spotify credentials...
var spotifyUsername = process.argv[2];
var spotifyPassword = process.argv[3];

var discordEmail = process.argv[4]
var discordPassword = process.argv[5]

var Discordie = require("discordie");
var Events = Discordie.Events;

var client = new Discordie();

var playlistUri = ""

function getSpotify(callback){
    Spotify.login(spotifyUsername, spotifyPassword, callback)
}

function getPlaylist(spotify, callback){
  if(playlistUri == ""){
    callback("Playlist Uri isn't set")
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
  });
}


function startPlaylist(callback){
  async.waterfall(
    [
      getSpotify,
      getPlaylist
    ],
  function(err, results){
    console.log(results)
    async.mapSeries(results, playUri, function(err, results){
      console.log("Async Complete")
      callback(err)
    })

});
}

function donePlaying(err){
  console.log("Done playing requestedUri")
}

client.connect({ email: discordEmail, password: discordPassword });

client.Dispatcher.on(Events.GATEWAY_READY, e => {
  console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
   console.log(e.message.content)
  if (e.message.content == "ping"){
    e.message.channel.sendMessage("pong");
  }
  if(e.message.content.indexOf("vjoin ") == 0) {
      const targetChannel = e.message.content.replace("vjoin ", "");
      console.log("trying to join" + targetChannel)
      e.message.channel.guild.voiceChannels
      .forEach(channel => {
        if(channel.name.toLowerCase().indexOf(targetChannel) >= 0)
          channel.join().then(v => play(v));
          // channel.join() returns a promise with voiceConnectionInfo
      });
  }
  if(e.message.content.indexOf("play") == 0) {
      if(!client.VoiceConnections.length) {
        return e.message.reply("Not connected to any channel");
      }
      const requestedUri = e.message.content.replace("play  ", "");
      stopPlaying = false;
      nextPlaying = false;
      if(requestedUri.indexOf("playlist") != -1){
        console.log("Trying to playlist " + requestedUri)
        playlistUri = requestedUri
        startPlaylist(donePlaying);
      } else if (requestedUri.indexOf("track") != -1){
        console.log("Trying to play song" + requestedUri)
        var songUri = requestedUri
        playUri(songUri, donePlaying)
      } else {
        console.log("Trying to play example song " + requestedUri)
        var songUri = "spotify:track:1OsCKwNZxph96EkNusILRy"
        playUri(songUri, donePlaying)
      }
  }
  if(e.message.content.indexOf("stop") == 0) {
      stopPlaying = true;

  }
  if(e.message.content.indexOf("next") == 0) {
      nextPlaying = true;
  }
  if(e.message.content.indexOf("vol") == 0) {
    var requestedVolume = e.message.content.replace("vol ", "");
    globalVolume = requestedVolume
  }
});

var oldNeedTime = new Date()

console.log("test1")


var stopPlaying = false;
var nextPlaying = false;
//function play(voiceConnectionInfo, songuri) {
function playUri(songuri, callback) {
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
      track.play()
        .pipe(mp3decoder)
        .on('finish', function () {
          spotify.disconnect();
          callback()
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
				if (stopPlaying || nextPlaying){
          console.log("stopped playing")
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
