/*
  Simple pong response on a ping message directed at the bot
*/

class Command {
  async messageHandler() {
    process.exit(1);
  }

  getCommands() {
    return [{
      name: 'restart',
      description: 'Forcefully restart the bot (assuming it is using forever.js)',
    }];
  }
}

module.exports = Command;
