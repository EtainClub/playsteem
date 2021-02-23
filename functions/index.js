const functions = require('firebase-functions');
const axios = require('axios');
const dsteem = require('@hiveio/dhive');

const MAINNET_OFFICIAL = [
  'https://api.steemit.com',
  'https://api.steemitdev.com',
  'https://api.steemzzang.com',
  'https://api.steem.buzz',
];
const client = new dsteem.Client(MAINNET_OFFICIAL, {
  timeout: 5000,
  addressPrefix: 'STM',
  chainId: '0000000000000000000000000000000000000000000000000000000000000000',
});

// proxy for google custom search
exports.searchRequest = functions.https.onCall(async (data, res) => {
  console.log('input data', data);
  const {query, startAt = 1, num = 10, sort = 'date'} = data;
  const encoding = 'utf8';
  const key = functions.config().search.key;
  const cx = functions.config().search.cx;
  const search = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${query}&ie=${encoding}&oe=${encoding}&num=${num}&start=${startAt}&sort=${sort}`;
  console.log('search', search);

  let result = null;
  await axios
    .get(search)
    .then((response) => {
      console.log('response', response);
      result = response.data;
      console.log('response result', result);
    })
    .catch((error) => console.log('failed to search', error));

  return result;
});

// proxy for getting supported languages for google translation
exports.getTranslationLanguagesRequest = functions.https.onCall(async () => {
  const key = functions.config().translation.key;
  const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${key}`;

  let result = null;
  await axios
    .get(url)
    .then((response) => {
      result = response.data.data.languages;
    })
    .catch((error) => console.log('failed to get supported translate', error));

  return result;
});

// proxy for google translation v3
exports.translationRequest = functions.https.onCall(async (data, context) => {
  //  console.log('input data', data);
  const {text, targetLang, format} = data;

  const options = {
    target: targetLang,
    q: text,
    format,
  };

  const key = functions.config().translation.key;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;

  let result = null;
  await axios
    .post(url, options)
    .then((response) => {
      result = response.data;
      //      console.log('response result', result);
    })
    .catch((error) => console.log('failed to translate', error));

  return result;
});

// proxy for creating blurt account
exports.createAccountRequest = functions.https.onCall(async (data, context) => {
  // TODO: setup active key and decide the account to be used, ACT?
  return null;

  const {username, password, creationFee} = data;

  // get creator account
  const creator = functions.config().creator.account;
  const creatorWif = functions.config().creator.wif;
  const welcomeBlurt = functions.config().creator.welcome_blurt;

  // private active key of creator account
  const creatorKey = dsteem.PrivateKey.fromString(creatorWif);
  // create keys
  const ownerKey = dsteem.PrivateKey.fromLogin(username, password, 'owner');
  const activeKey = dsteem.PrivateKey.fromLogin(username, password, 'active');
  const postingKey = dsteem.PrivateKey.fromLogin(username, password, 'posting');
  const memoKey = dsteem.PrivateKey.fromLogin(
    username,
    password,
    'memo',
  ).createPublic(client.addressPrefix);

  const ownerAuth = {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [[ownerKey.createPublic(client.addressPrefix), 1]],
  };
  const activeAuth = {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [[activeKey.createPublic(client.addressPrefix), 1]],
  };
  const postingAuth = {
    weight_threshold: 1,
    account_auths: [],
    key_auths: [[postingKey.createPublic(client.addressPrefix), 1]],
  };

  //// send creation operation
  // operations
  let operations = [];
  //create operation to transmit
  const create_op = [
    'account_create',
    {
      fee: creationFee,
      creator: creator,
      new_account_name: username,
      owner: ownerAuth,
      active: activeAuth,
      posting: postingAuth,
      memo_key: memoKey,
      json_metadata: '',
      extensions: [],
    },
  ];
  console.log(create_op);
  // push the creation operation
  operations.push(create_op);
  try {
    const result = await client.broadcast.sendOperations(
      operations,
      creatorKey,
    );
    console.log('create account, result', result);

    //// if successful, transfer 0.01 steem to the account
    if (result) {
      // get privake key from creator active wif
      const privateKey = dsteem.PrivateKey.from(creatorWif);
      // transfer
      if (privateKey) {
        const args = {
          from: creator,
          to: username,
          amount: welcomeBlurt,
          memo: 'Welcome Gift. Enjoy Blurt',
        };
        const resultTransfer = await client.broadcast.transfer(
          args,
          privateKey,
        );
        console.log('transfer result', resultTransfer);
        return resultTransfer;
      }
      return null;
    }
    return null;
  } catch (error) {
    console.log('failed to create account', error);
    return null;
  }
});
