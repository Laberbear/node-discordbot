/* eslint-disable no-unused-vars */
/**
 * Modify main function to iterate changes quicker
 */
const { BobTheBot } = require('../bot');

async function testRegularPlay(textChannel) {
  await textChannel.send('!play https://www.youtube.com/watch?v=0cko58IR_lA');
}

async function testYTSearch(textChannel) {
  await textChannel.send('!play Taylor Swift Fairytale');
}

async function testPlaylist(textChannel) {
  await textChannel.send('!play https://www.youtube.com/watch?v=Kwf7P2GNAVw&list=PLNPMW9kftjmInubQIY4CDGCUF9VY2HxaC');
}

async function testMix(textChannel) {
  await textChannel.send(
    '!play https://www.youtube.com/watch?v=e-ORhEE9VVg&list=RDEMb1vAi4rwXXeDlr7NZ68C_w&start_radio=1',
  );
}

async function main() {
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

  await testPlaylist(textChannel);
}

main();
