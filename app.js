const { BobTheBot } = require('./bot');

async function main() {
  const config = require('./config.json');
  const bob = new BobTheBot(config);
  await bob.init();
  await bob.loadPlugins();
}

main();
