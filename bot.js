const Discord = require('discord.js');
const {
  createAudioPlayer, getVoiceConnection, NoSubscriberBehavior,
} = require('@discordjs/voice');
const { joinVoiceChannel } = require('@discordjs/voice');
const plugins = require('./commands');

class BobTheBot {
  constructor(config, failOnCommandError = false) {
    this.config = config;
    this.failOnCommandError = failOnCommandError;
  }

  resetProperties() {
    this.plugins = [];
    this.registeredCommands = {};
    this.authToken = this.config.authToken;
    this.allowOwnBotMessages = false;
    this.client = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
      ],
    });
    this.audioResource = null;
    this.audioPlayer = createAudioPlayer(1);
    this.currentVoiceChannel = null;
  }

  async init() {
    this.resetProperties();
    await this.client.login(this.authToken);
    this.client.on('messageCreate', (msg) => this.onMessage(msg));
    // this.enableAutoVoiceLeave();
    this.userId = this.client.user.id;
  }

  async stop() {
    this.client.destroy();
  }

  /**
   *
   * @param {string} content
   * @param {Discord.MessageMentions} mentions
   * @returns
   */
  messageIsDirectedAtBot(content, mentions) {
    console.log(content);
    for (const mentionedUser of mentions.users) {
      if (mentionedUser.id === this.userId) {
        return true;
      }
    }
    if (content.indexOf('!') === 0) {
      return true;
    }
    return false;
  }

  /**
   *
   * @param {Discord.Message} msg
   */
  async onMessage(msg) {
    console.log('message');
    if (!this.allowOwnBotMessages && msg.author.id === this.userId) {
      console.debug('Ignoring Message sent by the bot itself');
      return;
    }
    console.log(msg);
    if (!this.messageIsDirectedAtBot(msg.content, msg.mentions)) {
      console.log('Message was not directed at bot');
      await this.checkMessageListeners(msg);
      return;
    }
    let content = msg.content.replace(`<@${this.userId}> `, '');
    content = content.replace('!', '');
    const [command] = content.split(' ');
    console.log(`Message directed at bot found: ${content} by: ${msg.author.username}`);
    try {
      await this.callBotCommand(command, msg);
      await msg.delete();
    } catch (error) {
      if (this.failOnCommandError) {
        throw error;
      } else {
        console.warn('Command Failed', content, error);
      }
    }
  }

  async checkMessageListeners(msg) {
    for (const plugin of this.plugins) {
      if (plugin.messageListener) {
        try {
        // eslint-disable-next-line no-await-in-loop
          await plugin.messageListener(msg);
        } catch (error) {
          if (this.failOnCommandError) {
            throw error;
          } else {
            console.error(`Error in a messageListener:
            Error: ${error}
            Plugin: ${plugin.constructor.name}`);
            console.error(error);
          }
        }
      }
    }
  }

  async callBotCommand(command, msg) {
    const { plugin } = this.registeredCommands[command] || {};
    if (!plugin) {
      throw new Error('Not a valid Command');
    }
    await plugin.messageHandler(command, msg, this);
  }

  async loadPlugins() {
    // Register all commands in the plugin folder
    for (const Plugin of plugins) {
      const newPlugin = new Plugin(this);
      this.plugins.push(newPlugin);
      newPlugin.getCommands().forEach((command) => {
        this.registeredCommands[command.name] = {
          description: command.description,
          plugin: newPlugin,
        };
      });
    }
    console.log(this.registeredCommands);
  }

  async getVoiceConnection(guildId) {
    await getVoiceConnection(guildId);
  }

  async playAudioResource(guildId, resource, startVolume = 0.6) {
    const player = this.audioPlayer;
    (await getVoiceConnection(guildId)).subscribe(player);
    player.play(resource);
    player.on('error', (error) => {
      console.log(error);
    });
    player.on('debug', (debug) => console.log(debug));
    resource.volume.setVolume(startVolume);
  }

  getCurrentAudioResource() {
    return this.audioResource;
  }

  enableAutoVoiceLeave() {
    this.client.on('voiceStateUpdate', async (oldState, newState) => {
      // check for bot
      if (newState.member.voice.channelId) return;
      const channel = await oldState.member.voice.channel.fetch();
      if (channel.members.size === 0) {
        this.leaveVoiceChannel(channel.guildId);
      }
    });
  }

  async joinVoiceChannel(foundChannel) {
    console.log(foundChannel);
    await joinVoiceChannel({
      channelId: foundChannel.id,
      guildId: foundChannel.guild.id,
      adapterCreator: foundChannel.guild.voiceAdapterCreator,
    });
    this.currentVoiceChannel = foundChannel;
  }

  async leaveVoiceChannel(guildId) {
    (await getVoiceConnection(guildId)).destroy();
    this.currentVoiceChannel = null;
  }

  async getVoiceChannelOfUser(msg) {
    console.log(msg);
    const channels = await msg.guild.channels.fetch();
    console.log(channels);
    const voiceChannels = channels
      .filter((channel) => channel.type === Discord.ChannelType.GuildVoice);
    const authorChannel = voiceChannels.find(
      (channel) => channel.members.find((member) => member.id === msg.author.id),
    );
    return authorChannel;
  }

  createNewAudioPlayer() {
    this.audioPlayer.stop();
    this.audioPlayer = createAudioPlayer({
      behaviors: NoSubscriberBehavior.Play,
    });
  }
}

module.exports = {
  BobTheBot,
};
