/*
  Simple pong response on a ping message directed at the bot
*/

class Command {
  async messageHandler(command, msg) {
    await msg.reply('Pong');
  }

  getCommands() {
    return [{
      name: 'ping',
      description: 'Bot responds with pong',
    }];
  }
}

module.exports = Command;
