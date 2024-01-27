/**
 * Requires youtube-dl and ffmpeg to be installed and available in PATH
 * or set in the paths below
 * https://www.npmjs.com/package/youtube-dl-wrap
 *
 */
const ytdl = require('ytdl-core');
const Discord = require('discord.js');
const ffmpeg = require('fluent-ffmpeg');
const YTDlpWrap = require('yt-dlp-wrap').default;
// const ytDlpWrap = new YTDlpWrap('C:\\Users\\alex2\\Downloads\\yt-dlp.exe');
const {
  createAudioResource, AudioPlayerStatus,
} = require('@discordjs/voice');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
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

  bot = null;

  /**
   *
   * @param {BobTheBot} bot
   */
  constructor(bot) {
    this.bot = bot;
  }

  async enqueueVideoAtStart(command, msg) {
    const videoUrl = msg.content.replace('!next', '').trim();
    console.log(`Found a single video URL ${videoUrl}`);
    const info = await ytdl.getInfo(videoUrl);
    this.queue.unshift({
      url: videoUrl,
      title: info.videoDetails.title,
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

  async startQueue() {
    if (this.currentlyPlaying) {
      return;
    }
    await this.playNextVideo();
  }

  async playNextVideo() {
    let retryCount = 0;
    const MAX_RETRIES = 3;
    // eslint-disable-next-line no-unreachable-loop
    while (retryCount < MAX_RETRIES) {
      try {
        if (this.queue.length === 0) {
          this.currentlyPlaying = false;
          this.currentTitle = null;
          console.log('Stopping Playing since the queue is empty');
          return;
        }

        this.currentlyPlaying = true;
        console.log(this.queue.length);
        const { url, guildId } = this.queue.shift();
        const info = (await ytdl.getInfo(url));
        this.currentTitle = info.videoDetails.title;
        console.log(`Now playing: ${info.videoDetails.title}`);
        console.log(`URL: ${url}`);
        const ytdlFileName = 'output.mp4';
        const ffmpegFileName = 'test.mp3';
        try {
          await fspromises.rm(ytdlFileName);
        // eslint-disable-next-line no-empty
        } catch (error) { }
        try {
          await fspromises.rm(ffmpegFileName);
        // eslint-disable-next-line no-empty
        } catch (error) { }

        let ytdlOutput;
        if (YTDL_STREAM) {
          ytdlOutput = ytDlpWrap.execStream([
            url,
            '-f',
            'best[ext=mp4]',
          ]);
        } else {
          await ytDlpWrap.execPromise([
            url,
            '-f',
            'best',
            '-o',
            ytdlFileName,
          ]);
          ytdlOutput = ytdlFileName;
        }
        let ffmpegOutput;
        if (FFMPEG_STREAM) {
          ffmpegOutput = convertPipe(ytdlOutput);
        } else {
          await convert(ytdlOutput, ffmpegFileName);
          ffmpegOutput = ffmpegFileName;
        }

        const resource = createAudioResource(ffmpegOutput, { inlineVolume: true });

        this.bot.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
          console.log(`Finished playing: ${info.videoDetails.title}`);
          console.log(this.queue);
          await this.playNextVideo();
        });

        await this.bot.playAudioResource(guildId, resource);
        return;
      } catch (error) {
        console.log(error);
        retryCount += 1;
        console.log('Retrying');
      }
    }
    console.log(`Failed after ${MAX_RETRIES} retries`);
    throw new Error();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async enqueuePlayList(command, msg) {
    const videoUrl = msg.content.replace('!play ', '');
    const playlistId = videoUrl.slice(videoUrl.indexOf('&list=') + 6).split('&')[0];
    console.log(`Found a playlist in the sent message: ${playlistId}`);
    const playlist = await ytpl(playlistId);
    console.log(`Playlist has ${playlist.items.length} items`);
    console.log(`Playlist Name: ${playlist.title}`);
    this.queue.push(...playlist.items.map((video) => ({
      url: video.shortUrl,
      enqueuedBy: msg.author,
      title: video.title,
      guildId: msg.guild.id,
    })));
    console.log(playlist);

    this.startQueue();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async enqueueVideo(command, msg) {
    const videoUrl = msg.content.replace('!play ', '');
    console.log(`Found a single video URL ${videoUrl}`);
    const info = (await ytdl.getInfo(videoUrl));
    this.queue.push({
      url: videoUrl,
      title: info.videoDetails.title,
      enqueuedBy: msg.author,
      guildId: msg.guild.id,
    });

    this.startQueue();
  }

  /**
   * @param {*} command
   * @param {Discord.Message} msg
   */
  async searchYoutube(command, msg) {
    const searchText = msg.content.replace('!play', '');
    console.log(`Searching for youtube results for ${searchText}`);
    const results = await ytsr(searchText);
    console.log(`Found ${results.items.length} search results`);
    const firstItem = results.items[0];
    console.log(`Playing first item in results: ${firstItem.title}`);

    this.queue.push({
      url: firstItem.url,
      enqueuedBy: msg.author,
      guildId: msg.guild.id,
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
