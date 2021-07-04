//export const COMMUNITY_TAG = "hive-122193";
// @test
//export const COMMUNITY_TAG = 'hive-196917';
export const NUM_FETCH_POSTS = 10;
export const NUM_FETCH_BLOG_POSTS = 20;
export const NUM_FETCH_COMMENTS = 50;
export const TRUNCATE_BODY_LENGTH = 1000;

// categories for steem posts
export const POST_CATEGORY = ['trending', 'created', 'feed', 'blog'];

export const TARGET_BLOCKCHAIN = 'steem';
export const TARGET_APP = 'PLAYSTEEM';

export const CHAIN_ID =
  '0000000000000000000000000000000000000000000000000000000000000000';
export const CHAIN_PREFIX = 'STM';
export const CHAIN_TIMEOUT = 5000;
export const RPC_SERVERS = [
  'https://api.steemit.com',
  'https://api.steemitdev.com',
  'https://api.steemzzang.com',
  'https://api.steem.buzz',
];
export const IMAGE_SERVERS = ['https://steemitimages.com'];

export const BASE_URL = 'https://steemit.com';

export const PRICE_ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price?ids=steem,steem-dollars,snax-token&vs_currencies=usd&include_24hr_change=true';

export const BENEFICIARY_WEIGHT = 500;

export const VOTING_DELAY_MILLS = 5.1 * 60 * 1000; // 5.1 minutes delayed

// max number of tags
export const MAX_NUM_TAGS = 8;

export const TOP_TAGS = [
  ['hive-144703', 'Communities Feedback'],
  ['hive-101145', 'SCT.암호화폐.Crypto'],
  ['hive-150232', 'Amaze Creater Union'],
  ['hive-196917', 'Korea • 한국 • KR • KO'],
  ['hive-185836', 'WORLD OF XPILAR'],
  ['hive-193637', 'Steem Venezuela'],
  ['hive-193186', 'WhereIN'],
  ['hive-167622', 'SteemAlive'],
  ['hive-188403', 'SteemWomen Club'],
  ['hive-138339', 'Steem Bangladesh'],
  ['hive-108451', 'crypto-academy'],
  ['hive-120412', 'LifeStyle'],
];

export const POSTING_POSTFIX = '<br /><br /><blockquote><p>Posted using PLAY STEEM <a href="https://playsteem.app">https://playsteem.app</a></p></blockquote>';
// export const BLURT_CHAIN_ID =
//   'cd8d90f29ae273abec3eaa7731e25934c63eb654d55080caff2ebb7f5df6381f';
// export const BLURT_CHAIN_PREFIX = 'BLT';
// export const CHAIN_TIMEOUT = 5000;
// export const BLURT_MAINNETS = [
//   'https://rpc.blurt.world',
//   'https://rpc.blurt.buzz',
//   'https://api.blurt.blog',
//   'https://blurtd.privex.io',
// ];
// export const BLURT_IMAGE_SERVERS = [
//   'https://images.blurt.blog',
//   'https://images.blurt.buzz',
// ];
// export const BLURT_BASE_URL = 'https://blurt.world';
// export const BLURT_TAG_ENDPOINT = 'https://api.blurt.buzz/tags';
// export const BLURT_PRICE_ENDPOINT = 'https://api.blurt.buzz/price_info';
// export const BLURT_NOTIFICATIONS_ENDPOINT = 'wss://notifications.blurt.world/';
// test version
//export const BLURT_BENEFICIARY_WEIGHT = 100;
// official version
