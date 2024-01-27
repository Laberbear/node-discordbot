const { BobTheBot } = require('./bot');

async function main() {
  // eslint-disable-next-line global-require
  const config = require('./config.json');
  const bob = new BobTheBot(config);
  await bob.init();
  await bob.loadPlugins();
}

main();
