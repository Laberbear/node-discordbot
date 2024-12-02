/**
 * Requires youtube-dl and ffmpeg to be installed and available in PATH
 * or set in the paths below
 * https://www.npmjs.com/package/youtube-dl-wrap
 */
const Discord = require('discord.js');
const ffmpeg = require('fluent-ffmpeg');
const yts = require('yt-search');
const YTDlpWrap = require('yt-dlp-wrap').default;
// const ytDlpWrap = new YTDlpWrap('C:\\Users\\alex2\\Downloads\\yt-dlp.exe');
const {
  createAudioResource,
  AudioPlayerStatus,
} = require('@discordjs/voice');
const fs = require('fs');
const { VoiceConnectionStatus } = require('@discordjs/voice');
const { BobTheBot } = require('../bot');

const fspromises = fs.promises;

const YTDLPATH = null;
const FFMPEGPATH = null;

// Whether to stream the download and/or the ffmpeg conversion
const YTDL_STREAM = false;
const FFMPEG_STREAM = false;

const ytDlpWrap = new YTDlpWrap(YTDLPATH || undefined);
if (FFMPEGPATH) {
  ffmpeg.setFfmpegPath(FFMPEGPATH);
}

const messageStates = {
  ENQUEUED: '🔜',
  QUERYING: '🔭',
  DOWNLOADING: '🚀',
  CONVERTING: '⚙️',
  PLAYING: '🔊',
  FINISHED: '🥳',
  ERROR: '😵‍💫',
  PLAYLIST: '🔢',
};

async function convert(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .audioQuality(0)
      .audioFrequency(44100)
      .output(output)
      .on('end', () => {
        console.log('conversion ended');
        resolve();
      })
      .on('error', (e) => {
        console.log('error: ', e.code, e.msg);
        reject(e);
      })
      .run();
  });
}

function convertPipe(input) {
  return ffmpeg(input)
    .pipe()
    .on('end', () => {
      console.log('conversion ended');
    }).on('error', (e) => {
      console.log('error: ', e.code, e.msg);
    })
    .run();
}

class Youtube {
  queue = [];

  currentlyPlaying = false;

  currentTitle = null;

  currentQueueEntry = null;

  bot = null;

  /**
   * @param {BobTheBot} bot
   */
  constructor(bot) {
    this.bot = bot;
  }

  async enqueueVideoAtStart(command, msg) {
    const videoUrl = msg.content.replace('!next', '').trim();
    console.log(`Found a single video URL ${videoUrl}`);
    const info = await this.getInfoByUrl(videoUrl);
    this.queue.unshift({
      url: videoUrl,
      title: info.title,
      enqueuedBy: msg.author,
      guildId: msg.guild.id,
    });

    this.startQueue();
    msg.channel.send(`Video "${info.videoDetails.title}" added to the queue!`);
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   * @param {BobTheBot} bot
   */
  async messageHandler(command, msg, bot) {
    if (msg.content.indexOf('!skip') === 0) {
      await this.skipSong(command, msg, bot);
    }
    if (msg.content.indexOf('!play') === 0) {
      await this.play(command, msg, bot);
    }
    if (msg.content.indexOf('!queue') === 0) {
      await this.showQueue(command, msg, bot);
    }
    if (msg.content.indexOf('!current') === 0) {
      await this.showCurrent(command, msg, bot);
    }
    if (msg.content.indexOf('!next') === 0) {
      await this.enqueueVideoAtStart(command, msg, bot);
    }
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async showCurrent(command, msg) {
    if (this.currentTitle) {
      msg.reply({
        content: `Currently playing:
      ${this.currentTitle}`,
      });
      return;
    }
    msg.reply('Not playing anything');
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   * @param {BobTheBot} bot
   */
  async skipSong(command, msg, bot) {
    bot.audioPlayer.removeAllListeners();
    bot.createNewAudioPlayer();
    this.currentlyPlaying = false;
    this.bot.client.user.setActivity('', { type: Discord.ActivityType.Playing });
    if (this.currentQueueEntry) {
      await this.updateEmojiState(this.currentQueueEntry.msg, messageStates.FINISHED);
    }
    if (msg.content.split(' ').length > 1) {
      const skipCount = parseInt(msg.content.split(' ')[1], 10);
      this.queue = this.queue.slice(skipCount);
      console.log(`Skipping ${skipCount} songs`);
    } else {
      console.log('Skipping one song');
    }
    this.startQueue();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async showQueue(command, msg) {
    if (!this.queue.length) {
      msg.reply(`
      The queue is empty my friend.
      Add some songs via the !play command
      `);
      return;
    }
    let queueInfo = `Current Queue Contents (${this.queue.length} videos): \n`;
    queueInfo += this.queue
      .slice(0, 10)
      .map((item, i) => `${i + 1}. ${item.title} enqueued by: ${item.enqueuedBy.username}`)
      .join('\n');

    if (this.queue.length > 10) {
      queueInfo += '\n (...and a few more)';
    }
    msg.reply(queueInfo);
  }

  hasPlaylist(message) {
    return message.indexOf('&list=') !== -1 || message.indexOf('?list=') !== -1;
  }

  isYoutubeVideo(message) {
    return message.indexOf('/watch') !== -1 || message.indexOf('youtu.be') !== -1;
  }

  /**
   * @param {Discord.Message} msg
   * @param {String} desiredState
   */
  async updateEmojiState(msg, desiredState) {
    try {
      await msg.react(desiredState);
      for (const [, reaction] of msg.reactions.cache.entries()) {
        if (reaction.emoji.name !== desiredState) {
          try {
            await reaction.remove();
          } catch (error) {
            console.log('Couldnt remove reaction from message', reaction);
          }
        }
      }
    } catch (error) {
      console.error('Error while trying react to message', msg, desiredState);
    }
  }

  async startQueue() {
    if (this.currentlyPlaying) {
      return;
    }
    await this.playNextVideo();
  }

  stopPlaying() {
    this.queue = [];
    this.currentTitle = null;
    this.currentlyPlaying = false;
    this.currentQueueEntry = null;
    console.log('Stopping Playing since not in any voice channel');
  }

  async playNextVideo() {
    if (!this.bot.currentVoiceChannel) {
      this.stopPlaying();
      return;
    }
    let retryCount = 0;
    const MAX_RETRIES = 30;

    let msg;
    let guildId;
    let url;
    while (retryCount < MAX_RETRIES) {
      try {
        if (this.queue.length === 0) {
          this.currentlyPlaying = false;
          this.currentTitle = null;
          this.currentQueueEntry = null;
          console.log('Stopping Playing since the queue is empty');
          return;
        }

        this.currentlyPlaying = true;
        console.log(this.queue.length);
        const queueEntry = this.queue.shift();
        ({ url, guildId, msg } = queueEntry);
        const innerMsg = msg;
        await this.updateEmojiState(msg, messageStates.QUERYING, queueEntry);
        const info = await this.getInfoByUrl(url);
        this.currentTitle = info.title;
        this.currentQueueEntry = queueEntry;
        console.log(`Now playing: ${info.title}`);
        console.log(`URL: ${url}`);
        try {
          await fspromises.rm('./outfolder', { recursive: true, force: true });
        } catch (error) {
        }
        try {
          await fspromises.mkdir('./outfolder');
        } catch (error) {
        }
        const ytdlFileName = './outfolder/output';
        const ffmpegFileName = 'test.mp3';
        try {
          await fspromises.rm(ytdlFileName);
        } catch (error) {}
        try {
          await fspromises.rm(ffmpegFileName);
        } catch (error) {}

        let ytdlOutput;
        if (YTDL_STREAM) {
          ytdlOutput = ytDlpWrap.execStream([
            url,
            '--merge-output-format',
            'mp4',
            '-f',
            'best[ext=mp4]',
          ]);
        } else {
          await this.updateEmojiState(msg, messageStates.DOWNLOADING);
          const x = await ytDlpWrap.execPromise([
            url,
            // '-f',
            // 'best[ext=mp4]',
            '-o',
            ytdlFileName,
          ]);
          console.log(x);
          ytdlOutput = ytdlFileName;
        }
        let ffmpegOutput;
        const file = (await fspromises.readdir('./outfolder'))[0];
        if (FFMPEG_STREAM) {
          ffmpegOutput = convertPipe(`${ytdlOutput}`);
        } else {
          await this.updateEmojiState(msg, messageStates.CONVERTING);
          await convert(`./outfolder/${file}`, ffmpegFileName);
          ffmpegOutput = ffmpegFileName;
        }

        console.log(`${ytdlOutput}`, ffmpegOutput);

        await this.updateEmojiState(msg, messageStates.PLAYING);

        try {
          await this.bot.client.user.setActivity(queueEntry.title, { type: Discord.ActivityType.Playing });
        } catch (error) {
        }
        const resource = createAudioResource(ffmpegOutput, { inlineVolume: true });

        this.bot.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
          await this.updateEmojiState(innerMsg, messageStates.FINISHED);
          console.log(`Finished playing: ${info.videoDetails.title}`);
          await this.bot.client.user.setActivity();
          console.log(this.queue);
          await this.playNextVideo();
        });

        if (!this.bot.currentVoiceChannel) {
          this.stopPlaying();
          await this.updateEmojiState(msg, messageStates.FINISHED);
          await this.bot.client.user.setActivity();
          return;
        }
        await this.bot.playAudioResource(guildId, resource);
        (await this.bot.getVoiceConnection(guildId)).on(VoiceConnectionStatus.Destroyed, async () => {
          this.stopPlaying();
          await this.updateEmojiState(innerMsg, messageStates.FINISHED);
          await this.bot.client.user.setActivity();
        });
        return;
      } catch (error) {
        console.log(error);
        retryCount += 1;
        console.log('Retrying');
      }
    }
    try {
      await this.updateEmojiState(msg, messageStates.ERROR);
    } catch (error) {
    }
    console.log(`Failed after ${MAX_RETRIES} retries`);
    await this.playNextVideo();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async enqueuePlayList(command, msg) {
    const videoUrl = msg.content.replace('!play ', '');
    const playlistId = videoUrl.slice(videoUrl.indexOf('&list=') + 6).split('&')[0];
    console.log(`Found a playlist in the sent message: ${playlistId}`);
    await this.updateEmojiState(msg, messageStates.QUERYING);
    let playlist;
    try {
      playlist = await yts({ listId: playlistId });
    } catch (error) {
      await this.updateEmojiState(msg, messageStates.ERROR);
      if (playlistId.startsWith('RD')) {
        await msg.reply(`Youtube Mixes are AI Generated suggestions for you
        and therefore not playable by a non humanoid like me.
        And with that I mean the library I use to fetch the playlist info
        does not support Mixes yet.
        https://github.com/talmobi/yt-search/issues/46`);
        throw error;
      }
      await msg.reply(`Couldn't parse playlist.
      ${error}`);
      throw error;
    }
    await this.updateEmojiState(msg, messageStates.PLAYLIST);
    console.log(`Playlist has ${playlist.videos.length} items`);
    console.log(`Playlist Name: ${playlist.title}`);
    this.queue.push(...playlist.videos.map((video) => ({
      url: `https://youtube.com/watch?v=${video.videoId}`,
      enqueuedBy: msg.author,
      title: video.title,
      guildId: msg.guild.id,
      msg,
    })));

    this.startQueue();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async enqueueVideo(command, msg) {
    const videoUrl = msg.content.replace('!play ', '');
    console.log(`Found a single video URL ${videoUrl}`);
    let info;
    try {
      info = await this.getInfoByUrl(videoUrl);
    } catch (error) {
      await this.updateEmojiState(msg, messageStates.ERROR);
    }
    this.queue.push({
      url: videoUrl,
      title: info.title,
      enqueuedBy: msg.author,
      guildId: msg.guild.id,
      msg,
    });

    await this.updateEmojiState(msg, messageStates.ENQUEUED);
    this.startQueue();
  }

  async getInfoByUrl(videoUrl) {
    const videoId = videoUrl.slice(videoUrl.indexOf('v=') + 2).split('&')[0];
    return yts({ videoId });
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async searchYoutube(command, msg) {
    const searchText = msg.content.replace('!play', '');
    console.log(`Searching for youtube results for ${searchText}`);
    await this.updateEmojiState(msg, messageStates.QUERYING);
    const results = await yts(searchText);

    console.log(`Found ${results.videos.length} search results`);
    const firstItem = results.videos[0];
    console.log(`Playing first item in results: ${firstItem.title}`);
    await this.updateEmojiState(msg, messageStates.ENQUEUED);

    this.queue.push({
      url: firstItem.url,
      enqueuedBy: msg.author,
      guildId: msg.guild.id,
      msg,
    });

    this.startQueue();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   * @param {BobTheBot} bot
   */
  async play(command, msg, bot) {
    const message = msg.content;
    if (!bot.currentVoiceChannel) {
      await bot.joinVoiceChannel(await bot.getVoiceChannelOfUser(msg));
    }
    if (this.hasPlaylist(message)) {
      await this.enqueuePlayList(command, msg, bot);
    } else if (this.isYoutubeVideo(message)) {
      await this.enqueueVideo(command, msg, bot);
    } else {
      await this.searchYoutube(command, msg, bot);
    }
  }

  getCommands() {
    return [{
      name: 'play',
      description: `
      Play youtube songs by writing !play and then the link to the video. Also enqueues songs now
      Can also search youtube if you just type text.
      `,
    }, {
      name: 'next',
      description: `
      Add to command to the beginning of the queue
      `,
    }, {
      name: 'skip',
      description: 'Skip a song!',
    }, {
      name: 'queue',
      description: 'Show the current video queue',
    }, {
      name: 'current',
      description: 'Show the current video',
    }];
  }
}

module.exports = Youtube;
