const functions = require('firebase-functions');
const axios = require('axios');
const dsteem = require('@hiveio/dhive');
const admin = require('firebase-admin');

admin.initializeApp();

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
  const { query, startAt = 1, num = 10, sort = 'date' } = data;
  const encoding = 'utf8';
  const key = functions.config().search.key;
  const cx = functions.config().search.cx;
  const search = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${query}&ie=${encoding}&oe=${encoding}&num=${num}&start=${startAt}&sort=${sort}`;

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
  const { text, targetLang, format } = data;

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

//// only for operator
// proxy for claim account creation token
// claim account creation token to create a new account
// @return success of failure of the claim
exports.claimACTRequest = functions.https.onCall(async (context) => {
  // get creator account
  const creator = functions.config().creator.account;
  const creatorWif = functions.config().creator.wif;
  const result = await _claimAccountCreationToken(creator, creatorWif);
  console.log('claimACTRequest. result', result);

  // update db
  _updateACTs(creator);
  // if (result.id) {
  //   _updateACTs();
  // }
  return result;
});

// proxy for creating steem account
exports.createAccountByACTRequest = functions.https.onCall(
  async (data, context) => {
    // get creator account
    const creator = functions.config().creator.account;
    const creatorWif = functions.config().creator.wif;

    const numACTs = await _checkClaimedToken(creator);
    // in case no ACT, then request to create
    if (numACTs < 1) {
      // reqeust ACT
      const success = await _claimAccountCreationToken(creator, creatorWif);
      if (!success) {
        console.log('failed to claim ACT');
        return null;
      }
    }

    /////// now we have ACT to create an account
    // get account data to be created
    const { username, password } = data;
    // private active key of creator account
    const creatorKey = dsteem.PrivateKey.fromString(creatorWif);
    // create keys
    const ownerKey = dsteem.PrivateKey.fromLogin(username, password, 'owner');
    const activeKey = dsteem.PrivateKey.fromLogin(username, password, 'active');
    const postingKey = dsteem.PrivateKey.fromLogin(
      username,
      password,
      'posting',
    );
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
      'create_claimed_account',
      {
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
    // push the creation operation
    operations.push(create_op);
    try {
      const result = await client.broadcast.sendOperations(
        operations,
        creatorKey,
      );
      console.log('created account, result', result);
      if (result) {
        // update the db (decrease the number of ACTs)
        _updateACTs(creator);
        return result;
      }

      return null;
    } catch (error) {
      console.log('failed to create account by ACT', error);
      return null;
    }
  },
);

// proxy for creating steem account
exports.createAccountRequest = functions.https.onCall(async (data, context) => {
  // get creator account
  const creator = functions.config().creator.account;
  const creatorWif = functions.config().creator.wif;
  // get user data
  const { username, password, creationFee } = data;
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
    },
  ];
  // push the creation operation
  operations.push(create_op);
  try {
    const result = await client.broadcast.sendOperations(
      operations,
      creatorKey,
    );
    console.log('create account, result', result);
    ////
    if (result) {
      return result;
    }
    return null;
  } catch (error) {
    console.log('failed to create account', error);
    return null;
  }
});

//// request to vote
exports.voteRequest = functions.https.onCall(async (data, context) => {
  const VOTING_WEIGHT = 15;
  const TIME_24H_MILLS = 3600 * 1000;
  // get creator account
  const creator = functions.config().creator.account;
  // need to create new
  const postingWif = functions.config().creator.postingwif;

  //// get username requested the vote
  const { author, permlink } = data;

  //// check if the user is not in the manual voting list, which is stored in firestore?
  const votingRef = admin.firestore().collection('manual_voting').doc(`${author}`);
  votingRef.get().then((snapshot) => {
    if (snapshot.exists) {
      console.log('document exits. skip the process');
      return;
    }
    console.log('the author does not exist in manual voting list');
    // get user
    const userRef = admin.firestore().doc(`users/${author}`);
    userRef.get().then((doc) => {
      console.log('user doc data', doc.data());
      const lastVotingAt = doc.data().lastVotingAt;
      if (!lastVotingAt) {
        console.log('last voting does not exist');
        // vote
        _votePost({
          voter: creator,
          postingWif: postingWif,
          author: author,
          permlink: permlink,
          weight: VOTING_WEIGHT
        });
      } else {
        const currentTime = new Date().getTime();
        console.log('current time', currentTime);
        console.log('last voting time', lastVotingAt.toMillis());
        const timeDiff = currentTime - lastVotingAt.toMillis();
        console.log('time after the last voting in hours', timeDiff / (1000 * 3600));
        if (timeDiff < TIME_24H_MILLS) {
          // set timer to vote
          setTimeout(() => {
            console.log('vote by timeout in hours', (TIME_24H_MILLS - timeDiff) * 1000 * 3600);
            _votePost({
              voter: creator,
              postingWif: postingWif,
              author: author,
              permlink: permlink,
              weight: VOTING_WEIGHT
            });
          }, TIME_24H_MILLS - timeDiff);
        } else {
          // vote right away
          // voteRightAway() -> update the lastVotingAt (if not exist, create one)
          _votePost({
            voter: creator,
            postingWif: postingWif,
            author: author,
            permlink: permlink,
            weight: VOTING_WEIGHT
          });
        }
      }
    });
  });
});

/////// helper functions

// check availabled claimed token
// @return availabivity of the token
const _checkClaimedToken = async (creator) => {
  try {
    const accounts = await client.database.call('get_accounts', [[creator]]);
    const numTokens = accounts[0].pending_claimed_accounts;
    console.log('number of claimed tokens', numTokens);
    return numTokens;
  } catch (error) {
    console.log('claimed token error', error);
    return 0;
  }
};

const _claimAccountCreationToken = async (creator, activeKey) => {
  try {
    const creatorKey = dsteem.PrivateKey.fromString(activeKey);
    let ops = [];
    const claim_op = [
      'claim_account',
      {
        creator: creator,
        fee: '0.000 STEEM',
        extensions: [],
      },
    ];
    ops.push(claim_op);
    const result = await client.broadcast.sendOperations(ops, creatorKey);
    console.log('claim ACT result', result);
    if (result.block_num > 0) return true;
    else return false;
  } catch (error) {
    console.log('error. claim failed', error);
    return false;
  }
};

// update the number of ACTs on db
const _updateACTs = (creator) => {
  // get doc ref
  const statsDocRef = admin.firestore().collection('stats').doc('common');
  console.log('updateACTs. statsDocRef', statsDocRef);
  // update the number of ACTs
  statsDocRef
    .get()
    .then(async (doc) => {
      console.log('updateACTs. doc', doc);
      if (doc.exists) {
        console.log('updateACTs. doc', doc.data());
        const numACTs = await _checkClaimedToken(creator);
        console.log('_updateACTs. ACT_API', numACTs);
        statsDocRef.update({ act: numACTs });
      }
    })
    .catch((error) => console.log('failed to update the ACT', error));
};

// vote
const _votePost = async ({ voter, postingWif, author, permlink, weight }) => {
  //// vote
  const vote = {
    voter,
    author,
    permlink,
    weight: weight * 100,
  };

  const privateKey = dsteem.PrivateKey.from(postingWif);

  if (privateKey) {
    try {
      const result = await client.broadcast.vote(vote, privateKey);
      if (result) {
        console.log('voted');
        // update the lastVotingAt of the author
        // get user
        const userRef = admin.firestore().doc(`users/${author}`);
        await userRef.get().then((doc) => {
          userRef.update({ lastVotingAt: new Date() });
        });
        return result;
      }
    } catch (error) {
      console.log('failed to vote', error);
    }
    return null;
  }
  console.log('the private key is wrong');
}
