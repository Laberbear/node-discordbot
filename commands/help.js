class Help {
  getCommands() {
    return [{
      name: 'help',
      description: "Displays the bot's help message",
    }];
  }

  async messageHandler(c, msg, bot) {
    let answer = 'Currently installed commands are: \n';

    console.log(answer);
    for (const [commandName, { description }] of Object.entries(bot.registeredCommands)) {
      answer += `!${commandName} - ${description}\n`;
    }
    console.log(answer);
    await msg.reply(answer);
  }
}

module.exports = Help;
