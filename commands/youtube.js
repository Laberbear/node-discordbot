/*
  Automatically converts requested youtube videos to mp3s and plays them afterwards
  Currently deprecated
*/

var exports = module.exports = {};
var request = require('request')
var fs = require('fs')

var volume = require("pcm-volume");
var lame = require('lame');

var stopPlaying = false;
var nextPlaying = false;

var playlistUri = ""

var globalVolume = 1
var pause = false;

var needBuffer
var message_handler = function(message_content, e, bot, callback){
  e.message.reply("Playing Video link")


  var baseOutputLink = "http://mp3fiber.com/include2/index.php?output="
  message_content = message_content.replace("vplay ", "")
  request('http://mp3fiber.com/include2/index.php?videoURL=' + message_content + '&ftype=mp3&quality=128', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(body) // Show the HTML for the Google homepage.
      var searchstring = 'showConversionResult("'
      var functioncallpos = body.indexOf(searchstring) + searchstring.length
      if(body.indexOf(searchstring) == -1){
        console.log("couldnt retrieve download url")
        return
      }
      var endpos = body.indexOf('"', functioncallpos)
      var finalOutputString = body.substring(functioncallpos, endpos)
      console.log("Call starts at " + functioncallpos);
      console.log("String ends at " + endpos)
      console.log(finalOutputString)
      var tempJSON = {}
      tempJSON.discordEvent = e
      tempJSON.discordClient = bot.discordClient
      playmp3(baseOutputLink + finalOutputString, tempJSON, function(){})

    }
  })
}
var volHandler = function(message_content, e, bot, callback){
  var requestedVolume = message_content.replace("vvol ", "");
  globalVolume = requestedVolume
}
exports.getCommands = function(){
  command = [{
    'name' : "vplay",
    'description' : "Play a youtube video",
    'handler' : message_handler
  },{
    'name' : "vvol",
    'description' : "Sets the volume of the bot",
    'handler' : volHandler
  }]
  return command;
}

function playmp3(url,eventAndClient, callback) {
  url = "http://mp3fiber.com/include2/index.php?output=yt/ozYao1Mju7A/128::256::Cute_Russian_army_girl_sings_When_we_were_at_war_-_%D0%9A%D0%BE%D0%B3%D0%B4%D0%B0_%D0%BC%D1%8B_%D0%B1%D1%8B%D0%BB%D0%B8_%D0%BD%D0%B0_%D0%B2%D0%BE%D0%B9%D0%BD%D0%B5_uuid-5680b33e1f016.mp3"
  var discordEvent = eventAndClient.discordEvent
  var client = eventAndClient.discordClient
	nextPlaying = false;

	var mp3decoder = new lame.Decoder();
  request("http://mp3fiber.com/include2/index.php?output=yt/vmOoAWrn1kM/128::256::Thermoducha_-_Suicide_Shower_uuid-56c91b0bb394b.mp3").pipe(mp3decoder)
  var v = new volume()
  v.setVolume(globalVolume);

	mp3decoder.on('format', decode);
  var start = new Date()
  var trackname = ""
  var trackduration = 0;

	function decode(pcmfmt) {
		// note: discordie encoder does resampling if rate != 48000
    console.log(pcmfmt)
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
    mp3decoder.pipe(v)
		v.once('readable', function() {
			if(!client.VoiceConnections.length) {
				return console.log("Voice not connected");
			}
			var voiceConnectionInfo = client.VoiceConnections[0];

			var voiceConnection = voiceConnectionInfo.voiceConnection;

			// one encoder per voice connection
			var encoder = voiceConnection.getEncoder(options);

      function testsend(){
        setTimeout(testsend, options.frameDuration)
        var sampleCount = readSize / pcmfmt.channels / (pcmfmt.bitDepth / 8);
        var lastChunk = v.read(readSize)
        encoder.enqueue(lastChunk, sampleCount);
      }
      //testsend()
			needBuffer = () => encoder.onNeedBuffer();
      var lastChunk
      console.log(encoder)
			encoder.onNeedBuffer = function() {
        console.log("so many buffer")
        //console.log(v)
        //console.log("Need a new Chunk after" + ((new Date()) - oldNeedTime))
        //oldNeedTime = new Date()
        if(pause){
          console.log("stream is paused")
          return
        }
        v.setVolume(globalVolume)
        client.User.setGame({ "name": ((trackduration - ((new Date()) - start)) / 1000) + "s " +trackname})
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
        lastChunk = v.read(readSize)
				if (!lastChunk) {
          console.log("No packet to send!")
          lastChunk = v.read(readSize)
          return setTimeout(needBuffer, options.frameDuration);
        }

				var sampleCount = readSize / pcmfmt.channels / (pcmfmt.bitDepth / 8);
        console.log("yes?");
				encoder.enqueue(lastChunk, sampleCount);

			};

			needBuffer();
		});

		v.once('end', () => {
      client.User.setGame({"name":''})
      callback()
    });
	}
}
