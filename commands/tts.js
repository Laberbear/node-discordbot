/*
  Simple pong response on a ping message directed at the bot
*/

const textToSpeech = require('@google-cloud/text-to-speech');

const fs = require('fs');
const Discord = require('discord.js');
const {
  createAudioResource,
  createAudioPlayer,
  getVoiceConnection,
} = require('@discordjs/voice');
// https://evilinsult.com/
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient({});
async function quickStart(text) {
  // The text to synthesize

  // Construct the request
  const request = {
    input: { text },
    // Select the language and SSML voice gender (optional)
    voice: {
      languageCode: 'de-DE',
      ssmlGender: 'FEMALE',
      name: 'de-DE-Wavenet-F',
    },
    // select the type of audio encoding
    audioConfig: { audioEncoding: 'MP3' },
  };

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);

  const writeFile = util.promisify(fs.writeFile);
  await writeFile('output.mp3', response.audioContent, 'binary');
}
class Ping {
  /**
   * @param {*} cmd
   * @param {Discord.Message} msg
   */
  async messageHandler(cmd, msg) {
    await quickStart(msg.content.replace(cmd, ''));
    const resource = createAudioResource('output.mp3', {
      inlineVolume: true,
    });
    const player = createAudioPlayer();
    // // Play "track.mp3" across two voice connections
    (await getVoiceConnection(msg.guild.id)).subscribe(player);
    player.play(resource);
    player.on('error', (error) => {
      console.log(error);
    });
    resource.volume.setVolume(1);
  }

  getCommands() {
    return [{
      name: 'tts',
      description: 'Use Google TTS to generate some voice',
    }];
  }
}

module.exports = Ping;
