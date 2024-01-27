/*
  based on: https://github.com/librespot-org/librespot/issues/521
  dont forget this shizzle: https://github.com/MainSilent/Discord-Screenshare
*/
const {
  createAudioResource, createAudioPlayer, getVoiceConnection,
} = require('@discordjs/voice');
const { spawn } = require('child_process');

const speakerName = 'discordBot';
const spotifyPass = 'x';

class Command {
  async messageHandler(command, msg, bot) {
    if (!bot.currentVoiceChannel) {
      await bot.joinVoiceChannel(await bot.getVoiceChannelOfUser(msg));
    }

    const source = spawn(
      'bash',
      // eslint-disable-next-line max-len
      ['-c', `librespot -v -n "${speakerName}" --enable-volume-normalisation --normalisation-pregain 0 -b 160 -u 1127676976 --backend pipe --passthrough -p "${spotifyPass}"`],
      { stdio: ['ignore', 'pipe', process.stdout] },
    );
    const resource = createAudioResource(source.stdout, {
      inlineVolume: true,
    });
    const player = createAudioPlayer();
    (await getVoiceConnection(msg.guild.id)).subscribe(player);
    player.play(resource);
    player.on('error', (error) => {
      console.log(error);
    });
    resource.volume.setVolume(1);
  }

  getCommands() {
    return [{
      name: 'spotify',
      description: 'Start the Bot as a Spotify Client',
    }];
  }
}

module.exports = Command;
