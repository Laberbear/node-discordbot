const Discord = require('discord.js');
/*
  Simple pong response on a ping message directed at the bot
*/

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

class Command {
  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async vjoin(command, msg) {
    const channels = await msg.guild.channels.fetch();
    const voiceChannels = channels.filter((channel) => channel.type === 'GUILD_VOICE');
    console.log(voiceChannels);
    const authorChannel = voiceChannels
      .find((channel) => channel.members.find((member) => member.id === msg.author.id));
    const desiredChannel = msg.content.replace('!vjoin', '').trim();
    let foundChannel;
    console.log(desiredChannel);
    if (desiredChannel) {
      foundChannel = voiceChannels
        .find((channel) => channel.name.indexOf(desiredChannel) !== -1);
    } else if (authorChannel) {
      foundChannel = authorChannel;
    } else {
      throw new Error('No channel specified and Author is not in Channel)');
    }
    joinVoiceChannel({
      channelId: foundChannel.id,
      guildId: foundChannel.guild.id,
      adapterCreator: foundChannel.guild.voiceAdapterCreator,
    });
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async vleave(command, msg) {
    (await getVoiceConnection(msg.guild.id)).destroy();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async messageHandler(command, msg) {
    if (command === 'vjoin') {
      return this.vjoin(command, msg);
    }
    if (command === 'vleave') {
      return this.vleave(command, msg);
    }
    return null;
  }

  getCommands() {
    return [{
      name: 'vjoin',
      description: 'Either joins the voicechannel of the calling user or the specified one',
    }, {
      name: 'vleave',
      description: 'Either joins the voicechannel of the calling user or the specified one',
    }];
  }
}

module.exports = Command;
