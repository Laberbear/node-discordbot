const authorId = require('./authorId');
const help = require('./help');
const oldRedditInsulter = require('./oldRedditInsulter');
const ping = require('./ping');
const renault = require('./vehicle');
const restart = require('./restart');
const spotify = require('./spotify');
const tts = require('./tts');
const vjoin = require('./vjoin');
const youtube = require('./youtube');
const ReviewMeta = require('./reviewmeta');

module.exports = [
  authorId,
  help,
  oldRedditInsulter,
  ping,
  renault,
  restart,
  spotify,
  tts,
  vjoin,
  youtube,
  ReviewMeta,
];
