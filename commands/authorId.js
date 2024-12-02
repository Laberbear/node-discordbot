const { Message } = require('discord.js');

class Command {
  /**
   * @param {*} command
   * @param {Message} msg
   */
  async messageHandler(command, msg) {
    const channels = await msg.guild.channels.fetch();
    await msg.reply(`Hey ${msg.author.username} heres your info:
      AuthorId: ${msg.author.id}
      GuildId: ${msg.guild.id}
      Channels: 
      ${
      channels.map((channel) => `
        ${channel.name} (${channel.type === 2 ? 'Voice' : 'Text'})
        ID: ${channel.id}`).join('\n')
    }
      `);
  }

  getCommands() {
    return [{
      name: 'authorId',
      description: 'Bot responds with the authors discord id',
    }];
  }
}

module.exports = Command;
