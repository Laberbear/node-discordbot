// Start Bot
// Join Voice CHannel
// Run Fake Command

const { BobTheBot } = require('../bot');

async function main() {
  // eslint-disable-next-line global-require
  const config = require('../config.json');
  const bob = new BobTheBot(config);
  await bob.init();
  await bob.loadPlugins();
  const guilds = await bob.client.guilds.fetch();
  const desiredGuild = await guilds.find((x) => x.id === '122732994174648320').fetch();
  const channels = await desiredGuild.channels.fetch();
  const textChannel = await channels.find((x) => x.id === '122732994174648320').fetch();
  await bob.joinVoiceChannel({
    id: '122732994174648321',
    guild: desiredGuild,
  });

  bob.allowOwnBotMessages = true;

  await textChannel.send('!play https://www.youtube.com/watch?v=0cko58IR_lA');
}

main();
