const { BobTheBot } = require('../bot');
const config = require('../config.json');

jest.setTimeout(20000);
/**
 *
 * @param {BobTheBot} bot
 * @param {string} text
 * @returns
 */
function createFakeMessage(bot, text, mentionBob) {
  return {
    author: {
      id: 'test',
    },
    content: text,
    delete: jest.fn(),
    mentions: {
      users: mentionBob ? [{ id: bot.userId }] : [],
    },
    reply: jest.fn(),
  };
}

describe('app', () => {
  const bob = new BobTheBot(config, true);
  beforeEach(async () => {
    await bob.init();
    await bob.loadPlugins();
  });
  afterEach(async () => {
    await bob.stop();
  });
  fit('it should test the reviewmeta commenter', async () => {
    const mockMessage = createFakeMessage(bob, 'https://www.amazon.com/dp/B09LD8T445');
    await bob.checkMessageListeners(mockMessage);
    expect(mockMessage.reply).toHaveBeenCalledTimes(1);
  });
});
