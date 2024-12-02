const fetch = require('node-fetch');

const { EmbedBuilder, Message } = require('discord.js');

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const metaReviewUrls = {
  amazon: 'https://reviewmeta.com/api/amazon/',
  'amazon-de': 'https://reviewmeta.com/api/amazon-de/',
};

function createMetaReviewUrl(shop, productId) {
  return metaReviewUrls[shop] + productId;
}

/**
 * https://www.amazon.de/gp/product/B07JKJTDWC/ref=ewc_pr_img_1?smid=A3OJWAJQNSBARP&psc=1
 * @param {*} text
 */
function isAmazonUrl(text) {
  return text.indexOf('amazon.') !== -1
    && /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/.test(text);
}

async function getReviewMetaData(url) {
  return (await fetch(url)).json();
}

function getAmazonProductId(url) {
  let productSearchString;
  if (url.indexOf('/product/') !== -1) {
    productSearchString = '/product/';
  } else if (url.indexOf('/dp/') !== -1) {
    productSearchString = '/dp/';
  }
  const startProductId = url.indexOf(productSearchString) + productSearchString.length;
  const endProductIdSlash = url.indexOf('/', startProductId);
  const endProductIdQuestion = url.indexOf('?', startProductId);
  let endProductId;
  if (endProductIdSlash !== -1) {
    endProductId = endProductIdSlash;
  } else if (endProductIdQuestion !== -1) {
    endProductId = endProductIdQuestion;
  } else {
    endProductId = url.length;
  }
  if (!startProductId || !endProductId) {
    throw new Error("Couldn't find product Id");
  }

  const productId = url.substring(startProductId, endProductId);

  if (!productId || productId === url) {
    throw new Error("Couldn't find product Id");
  }
  return productId;
}

const reviewMetaToColor = {
  1: '#00ff00',
  2: '#ffa500',
  3: '#ff0000',
};

const reviewMetaToText = {
  1: 'PASS',
  2: 'WARNING',
  3: 'FAIL',
};

/**
 * @param {Message} msg
 * @param {Object} reviewMetaResult
 */
function sendReviewMetaResult(msg, reviewMetaResult) {
  const exampleEmbed = new EmbedBuilder()
    .setColor(reviewMetaToColor[reviewMetaResult.s_overall])
    .setTitle(reviewMetaResult.title)
    .setURL(reviewMetaResult.href)
    .setAuthor({
      name: 'ReviewMeta Result',
      iconURL: 'https://www.android-user.de/wp-content/uploads/2017/12/icon-revie.png',
      url: reviewMetaResult.href,
    })
    .setDescription('Some description here')
    .setThumbnail(reviewMetaResult.image)
    .addFields(
      { name: 'Adjusted Rating', value: `${reviewMetaResult.rating}/5` },
      { name: 'Adjusted Review Count', value: `${reviewMetaResult.count} reviews` },
      { name: 'Overall Grade', value: reviewMetaToText[reviewMetaResult.s_overall] },
    )
    .setTimestamp();

  msg.reply({ embeds: [exampleEmbed] });
}

function getShopName(url) {
  if (url.indexOf('amazon.de') !== -1) {
    return 'amazon-de';
  }
  return 'amazon';
}

async function handleMessage(msg) {
  console.log(msg.content);
  console.log(isAmazonUrl(msg.content));
  if (isAmazonUrl(msg.content)) {
    const productId = getAmazonProductId(msg.content);
    const shopName = getShopName(msg.content);
    const reviewMetaUrl = createMetaReviewUrl(shopName, productId);
    console.log('ProductID', productId);
    console.log('shopName', shopName);
    console.log('ReviewMetaUrl', reviewMetaUrl);
    let retryCount = 0;
    let reviewMetaData;
    while (true) {
      console.log('Trying to fetch API Data');
      if (retryCount > 3) {
        throw new Error('Reached Retry Limit');
      }
      reviewMetaData = await getReviewMetaData(reviewMetaUrl);
      if (reviewMetaData.rating === '' && reviewMetaData.href) {
        console.log(reviewMetaData);
        console.log('Fetching failed, retrying after 3s');
        retryCount += 1;
        await sleep(3000);
      } else if (reviewMetaData.rating !== '' && reviewMetaData.href) {
        console.log('Data valid, continuing');
        break;
      }
    }
    console.log(reviewMetaData);
    sendReviewMetaResult(msg, reviewMetaData);
  }
}

class Command {
  async messageListener(msg) {
    await handleMessage(msg);
  }

  getCommands() {
    return [];
  }
}

module.exports = Command;
