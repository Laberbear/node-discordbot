class Command {
  async messageHandler(command, msg) {
    await msg.reply(`Hey ${msg.author.username} your ID is: ${msg.author.id}`);
  }

  getCommands() {
    return [{
      name: 'authorId',
      description: 'Bot responds with the authors discord id',
    }];
  }
}

module.exports = Command;
