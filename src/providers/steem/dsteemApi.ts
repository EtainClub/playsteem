import Config from 'react-native-config';

//
import axios from 'axios';
//
import { Client as NotiClient } from '@busyorg/busyjs';

// crypto-js
import CryptoJS from 'crypto-js';
import { get, has, cloneDeep } from 'lodash';
// dsteem api
import {
  Client,
  cryptoUtils,
  PrivateKey,
  ExtendedAccount,
  DisqussionQuery,
  DiscussionQueryCategory,
  Discussion,
  Operation,
  SignedTransaction,
  Transaction,
  Signature,
} from '@hiveio/dhive';

import { PrivateKey as PrivateKey2 } from '@esteemapp/dhive';

import { PostsActionTypes, ProfileData, KeyTypes } from '~/contexts/types';

import {
  PostingContent,
  PostRef,
  PostData,
  PostState,
  WalletData,
} from '~/contexts/types';

import {
  NUM_FETCH_POSTS,
  TRUNCATE_BODY_LENGTH,
  PRICE_ENDPOINT,
  RPC_SERVERS,
  IMAGE_SERVERS,
  CHAIN_ID,
  CHAIN_PREFIX,
  CHAIN_TIMEOUT,
  NUM_FETCH_COMMENTS,
} from '~/constants/blockchain';

import { jsonStringify } from '~/utils/jsonUtils';

// get current server from storage
// put the server first in the list
// setup client

// dsteem handles the server fail situation and choose the next server!
let client = new Client(RPC_SERVERS, {
  timeout: CHAIN_TIMEOUT,
  addressPrefix: CHAIN_PREFIX,
  chainId: CHAIN_ID,
  failoverThreshold: 10,
  consoleOnFailover: true,
});
console.log('Client', client);

// app settings of blockchain
let blockchainSettings = null;
//// change server orders and setup the client again
export const setBlockchainClient = async (server?: string) => {
  // get blockchain servers from storage
  const _blockchains = await AsyncStorage.getItem('blockchains');
  console.log('setBlockchainClient. blockchain from storage', _blockchains);
  const blockchains = JSON.parse(_blockchains);
  blockchainSettings = blockchains;
  console.log(
    '[changeServerOrder] blockchains',
    blockchains,
    blockchainSettings,
  );
  let rpc = null;
  if (!server) {
    // check if the first server is the same as the default list
    if (blockchains.rpc === RPC_SERVERS[0]) {
      console.log('no need to do re-ordering the server list');
      return true;
    }

    if (!blockchains) return null;
    rpc = blockchains.rpc;
  } else {
    // use the argument
    rpc = server;
  }
  // deep copy necessary,
  // otherwise the constant variable RPC_SERVERS changes!!! in other code
  // (SettingsScreen blockchainItems)!!!
  let serverList = cloneDeep(RPC_SERVERS);
  // remove the server to add in the list
  const index = serverList.indexOf(rpc);
  if (index > -1) {
    serverList.splice(index, 1);
  } else {
    return null;
  }
  // put the server first in the list
  serverList = [rpc, ...serverList];

  console.log('[setupBlockchainClient] serverList', serverList);

  // setup the client again
  client = new Client(serverList, {
    timeout: CHAIN_TIMEOUT,
    addressPrefix: CHAIN_PREFIX,
    chainId: CHAIN_ID,
    failoverThreshold: 10,
    consoleOnFailover: true,
  });
  console.log('Client reordered', client);
  return true;
};

//setBlockchainClient();

// patch
const diff_match_patch = require('diff-match-patch');
const dmp = new diff_match_patch();

import {
  parsePosts,
  parsePost,
  filterNSFWPosts,
  parseComment,
} from '~/utils/postParser';
import { estimateVoteAmount } from '~/utils/estimateVoteAmount';
import AsyncStorage from '@react-native-community/async-storage';

global.Buffer = global.Buffer || require('buffer').Buffer;

/////
// get public wif from private wif
const wifToPublic = (privWif: string) => {
  // get private key from wif format
  const privateKey = PrivateKey.fromString(privWif);
  // get public key of the private key and then convert it into wif format
  const pubWif = privateKey.createPublic(client.addressPrefix).toString();
  // return the public wif
  return pubWif;
};

const wifIsValid = (privWif: string, pubWif: string) => {
  return wifToPublic(privWif) == pubWif;
};

////// user signup/signin
//// signup
// check availabled claimed token
// @return availabivity of the token

//// generate master passwords
export const generateMasterPassword = () => {
  // generate random master password wif
  const array = CryptoJS.lib.WordArray.random(10);
  return 'P' + PrivateKey.fromSeed(array.toString()).toString();
};

//// create an account
export const createAccount = async (
  username: string,
  password: string,
  creator: string,
  creatorActiveKey: string,
  creationFee: string,
) => {
  // private active key of creator account
  const creatorKey = PrivateKey.fromString(creatorActiveKey);
  // create keys
  const ownerKey = PrivateKey.fromLogin(username, password, 'owner');
  const activeKey = PrivateKey.fromLogin(username, password, 'active');
  const postingKey = PrivateKey.fromLogin(username, password, 'posting');
  const memoKey = PrivateKey.fromLogin(username, password, 'memo').createPublic(
    client.addressPrefix,
  );

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
  let operations: Operation[] = [];
  //create operation to transmit
  const create_op: Operation = [
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
  // broadcast operation to blockchain
  try {
    const result = await client.broadcast.sendOperations(
      operations,
      creatorKey,
    );
    if (result) {
      console.log('creation result', result);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log('account creation failed', error);
    return false;
  }
};

// verify the password (master password, private keys in wif format)
// return account and password key type
export const verifyPassword = async (username: string, password: string) => {
  // get accounts by username
  let account = null;
  try {
    account = await getAccount(username);
  } catch (error) {
    console.log('failed to get account', error);
  }
  if (!account) {
    return { account: null, keyType: null };
  }
  console.log('account', account);
  // get public posting key
  const postingPublicKey = account.posting.key_auths[0][0];

  try {
    //// handle master password
    // TODO: the master password might not start with 'P', then how??
    if (password[0] != '5') {
      // if the password is the master key, then it can deduce the public posting key
      // compute private posting key using username and password, and then get wif
      const postingPrivateKey = PrivateKey.fromLogin(
        username,
        password,
        'posting',
      ).toString();
      // check validity
      const valid = wifIsValid(postingPrivateKey, postingPublicKey);
      if (valid) {
        console.log('master password is valid');
        return { account, keyType: KeyTypes.MASTER };
      } else {
        console.log('master password is not valid');
        return { account: null, keyType: null };
      }
    } else {
      ////// handle posting/active/owner private key
      //// check posting key
      // check validity if the input password is the private posting key
      let valid = wifIsValid(password, postingPublicKey);
      if (valid) {
        console.log('input is the posting private key, which is valid');
        return { account, keyType: KeyTypes.POSTING };
      }
      //// check active key
      // get public active key
      const activePublicKey = account.active.key_auths[0][0];
      // check validity if the input password is the private active key
      valid = wifIsValid(password, activePublicKey);
      if (valid) {
        console.log('input is the active private key, which is valid');
        return { account, keyType: KeyTypes.ACTIVE };
      }
      //// check memo key
      // get public memo key
      const memoPublicKey = account.memo_key;
      // check validity if the input password is the private memo key
      valid = wifIsValid(password, memoPublicKey);
      if (valid) {
        console.log('input is the memo private key, which is valid');
        return { account, keyType: KeyTypes.MEMO };
      }

      //// check owner key
      // get public owner key
      const ownerPublicKey = account.owner.key_auths[0][0];
      // check validity
      valid = wifIsValid(password, ownerPublicKey);
      if (valid) {
        console.log('input is the owner private key, which is valid');
        return { account, keyType: KeyTypes.OWNER };
      }
      // input password is not valid
      console.log('input password is not valid');
      return { account: null, keyType: null };
    }
  } catch (error) {
    // input password is not valid
    console.log('[verifyPassword] something is wrong.', error);
    return { account: null, keyType: null };
  }
};

// get requested password in Wif
export const getRequestedPassword = (
  username: string,
  password: string,
  type: string,
) => {
  return PrivateKey.fromLogin(username, password, type).toString();
};

// check sanity of a username to be created
// @return availability of the username
export const checkUsernameAvailable = async (username: string) => {
  try {
    const accounts = await getAccount(username);
    console.log('account:', accounts);
    if (!accounts) {
      // the username is available
      console.log('username is avaliable', username);
      return true;
    } else {
      // the username exists
      return false;
    }
  } catch (error) {
    console.log('error on check username', error);
    return false;
  }
};

//////// global properties
export const getDynamicGlobalProperties = async () => {
  try {
    const result = await client.database.getDynamicGlobalProperties();
    return result;
  } catch (error) {
    console.log('failed to get getDynamicGlobalProperties', error);
    return null;
  }
};

export const getRewardFund = async () => {
  try {
    const result = await client.call('condenser_api', 'get_reward_fund', [
      'post',
    ]);
    return result;
  } catch (error) {
    console.log('failed to get reward fund', error);
    return null;
  }
};

export const getFeedHistory = async (): Promise<any> => {
  try {
    const feedHistory = await client.call(
      'condenser_api',
      'get_feed_history',
      [],
    );
    return feedHistory;
  } catch (error) {
    console.log('failed to get feed history', error);
    return null;
  }
};

////
export const getChainProperties = async () => {
  try {
    const chainProperties = await client.call(
      'condenser_api',
      `get_chain_properties`,
      [],
    );
    return chainProperties;
  } catch (error) {
    console.log('Failed to get chain properties', error);
    return null;
  }
};

// helper function
export const parseToken = (strVal: string): number => {
  if (!strVal) {
    return 0;
  }
  return Number(parseFloat(strVal.split(' ')[0]));
};
export const vestToSteem = (vestingShares: number) => {
  const {
    total_vesting_shares,
    total_vesting_fund_steem,
  } = globalProps.dynamicProps;
  return (
    parseFloat(total_vesting_fund_steem) *
    (vestingShares / parseFloat(total_vesting_shares))
  ).toFixed(3);
};

export const vestsToRshares = (
  vests: number,
  votingPower: number,
  votePerc: number,
) => {
  if (!vests || !votingPower || !votePerc) {
    return 0;
  }
  const vestStr = (vests * 1e6).toString();
  const vestingShares = parseInt(vestStr, 10);
  const power = (votingPower * votePerc) / 1e4 / 50 + 1;

  return (power * vestingShares) / 1e4;
};

export interface BlockchainGlobalProps {
  steemPerMVests: number;
  base: number;
  quote: number;
  fundRecentClaims: number;
  fundRewardBalance: number;
  sbdPrintRate: number;
  dynamicProps: {};
  chainProps: {};
}

//// global props
let globalProps: BlockchainGlobalProps = null;

// fetch global propperties
export const fetchGlobalProps = async (): Promise<BlockchainGlobalProps> => {
  let globalDynamic;
  let feedHistory;
  let rewardFund;

  try {
    globalDynamic = await getDynamicGlobalProperties();
    feedHistory = await getFeedHistory();
    rewardFund = await getRewardFund();
  } catch (error) {
    console.log('failed to fetch steem global properties', error);
    return null;
  }

  const steemPerMVests =
    (parseToken(globalDynamic.total_vesting_fund_steem as string) /
      parseToken(globalDynamic.total_vesting_shares as string)) *
    1e6;
  const sbdPrintRate = globalDynamic.sbd_print_rate;
  const base = parseToken(feedHistory.current_median_history.base);
  const quote = parseToken(feedHistory.current_median_history.quote);
  const fundRecentClaims = rewardFund.recent_claims;
  const fundRewardBalance = parseToken(rewardFund.reward_balance);

  // update the globalProps
  globalProps = {
    steemPerMVests,
    base,
    quote,
    fundRecentClaims,
    fundRewardBalance,
    sbdPrintRate,
    dynamicProps: globalDynamic,
    chainProps: {},
  };

  console.log('[fetchGlobalProps] globalProps', globalProps);
  return globalProps;
};

//// get latest block
export const fetchLatestBlock = async () => {
  try {
    const block = await client.blockchain.getCurrentBlock();
    console.log('[fetchLatestBlock] block', block);
    return block;
  } catch (error) {
    console.log('failed to fetch latest block', error);
    return null;
  }
};

////// user related
//// account
// get account
export const getAccount = async (
  username: string,
): Promise<ExtendedAccount | null> => {
  try {
    const accounts = await client.database.getAccounts([username]);
    console.log('[getAccount] username, account', username, accounts);
    // check exists
    if (accounts.length == 0) {
      return null;
    }
    return accounts[0];
  } catch (error) {
    console.log('failed to get account', error);
    return null;
  }
};

export const getVoteAmount = async (
  username: string,
  globalProps: BlockchainGlobalProps,
): Promise<string> => {
  try {
    console.log('[fetchUserData] fetching...');
    // fetch account
    //   const account = await client.database.getAccounts([username]);
    const account = await client.database.call('get_accounts', [[username]]);

    console.log('[getVoteAmount] account', account[0]);
    if (!account[0]) return;

    // get global properties
    if (!globalProps) globalProps = await fetchGlobalProps();

    // estimate vote amount
    const voteAmount = estimateVoteAmount(account[0], globalProps);
    return voteAmount;
  } catch (error) {
    console.log('failed to get vote amount', error);
    return null;
  }
};

//// fetch account state with extra data
export const fetchAccountState = async (username: string) => {
  try {
    // get state
    const params = `@${username}`;
    const accountState = await client.call('condenser_api', `get_state`, [
      params,
    ]);
    console.log('[fetchUserProfile] accountState', accountState);
    if (!accountState) {
      console.log('[fetchUserProfile] accountState is null', accountState);
      return null;
    }
    return accountState;
  } catch (error) {
    console.log('failed to fetch state', error);
    return null;
  }
};

// fetch user profile
export const fetchProfile = async (author: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const profile = await client.call('bridge', 'get_profile', {
        account: author,
      });
      if (profile) {
        resolve(profile);
      } else {
        // TODO: handle null when fetching get_profile
        //        const _profile = await fetchUserProfile(author);
        //        console.log('[dSteem|fetchProfile] using standard. profile', _profile);
        resolve(null);
      }
    } catch (error) {
      console.log('failed to fetch profile', error);
      reject(error);
    }
  });

//// fetch user state
export const fetchUserProfile = async (username: string) => {
  try {
    // get profile
    const fetchedProfile = await fetchProfile(username);
    console.log('[fetchUserProfile] fetched profile', fetchedProfile);

    // get account
    const account = await getAccount(username);
    console.log('get account. account', account);

    const profileData: ProfileData = {
      profile: {
        metadata: fetchedProfile.metadata.profile,
        name: username,
        voteAmount: estimateVoteAmount(account, globalProps),
        votePower: '0',
        balance: account.balance,
        power: fetchedProfile.stats.sp,
        sbd: account.sbd_balance,
        reputation: fetchedProfile.reputation,
        stats: {
          post_count: fetchedProfile.post_count,
          following: fetchedProfile.stats.following,
          followers: fetchedProfile.stats.followers,
          rank: fetchedProfile.stats.rank,
        },
      },
    };

    //    console.log('fetchUserProfile. profileData', profileData);
    return profileData;
  } catch (error) {
    console.log('Failed to fetch user profile data', error);
    return null;
  }
};

// get state using url
export const getState = async (url: string): Promise<any> => {
  try {
    const state = await client.database.getState(url);
    return state;
  } catch (error) {
    return error;
  }
};

//////// following
//// update follow
export const updateFollow = async (
  follower: string,
  password: string,
  following: string,
  action: string,
) => {
  // // verify the key
  // const { account } = await verifyPassword(follower, password);
  // if (!account) {
  //   return null;
  // }
  // get privake key from password
  const privateKey = PrivateKey.from(password);

  if (privateKey) {
    const what = action ? [action] : [];
    const json = ['follow', { follower, following, what }];
    let operation = {
      required_auths: [],
      required_posting_auths: [follower],
      id: 'follow',
      json: JSON.stringify(json),
    };
    try {
      const result = await client.broadcast.json(operation, privateKey);
      if (result) return result;
      return null;
    } catch (error) {
      console.log('Failed to broadcast update follow state', error);
      return null;
    }
  }
};

// get followers/following counts
export const fetchFollows = (username: string) =>
  client.call('condenser_api', 'get_follow_count', [username]);

export const fetchFollowings = async (
  follower: string,
  startFollowing: string,
  followType = 'blog',
  limit = 1000,
) => {
  try {
    const result = await client.call('condenser_api', 'get_following', [
      follower,
      startFollowing,
      followType,
      limit,
    ]);
    if (result) return result;
    return null;
  } catch (error) {
    console.log('failed to fetch following', error);
    return null;
  }
};

export const fetchFollowers = async (
  username: string,
  startFollowing: string,
  followType = 'blog',
  limit = 1000,
) => {
  try {
    const result = await client.call('condenser_api', 'get_followers', [
      username,
      startFollowing,
      followType,
      limit,
    ]);
    console.log('[fetchFollowers], followers', result);
    if (result) {
      return result;
    }
    return null;
  } catch (error) {
    console.log('failed to fetch followers', error);
    return null;
  }
};

export const isFollowing = async (username: string, author: string) => {
  try {
    const result = await client.call('condenser_api', 'get_following', [
      username,
      author,
      'blog',
      1,
    ]);
    if (
      result[0] &&
      result[0].follower === username &&
      result[0].following === author
    ) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log('failed to check isFollowing', error);
    return null;
  }
};

//// steem price
export const fetchPrice = async () => {
  try {
    const { data } = await axios.get(PRICE_ENDPOINT, {
      timeout: 5000,
    });
    if (data) return data;
    return null;
  } catch (error) {
    console.log('failed to fetch price', error);
    return null;
  }
};

// fetch community list of a user
export const fetchCommunityList = async (username: string): Promise<any[]> => {
  try {
    const communities = await client.call('bridge', 'list_all_subscriptions', {
      account: username,
    });
    console.log('[fetchCommunityList] community list', communities);
    if (communities) {
      return communities;
    } else {
      return [];
    }
  } catch (error) {
    console.log('failed to fetch community list', error);
    return [];
  }
};

// fetch a community
export const fetchCommunity = async (tag: string, observer: string = '') =>
  new Promise(async (resolve, reject) => {
    try {
      const community = await client.call('bridge', 'get_community', {
        name: tag,
        observer: observer,
      });
      if (community) {
        resolve(community);
      } else {
        resolve({});
      }
    } catch (error) {
      reject(error);
    }
  });

///// posts
////
// fetch post summary
export const fetchPostsSummary = async (
  category: string,
  tag: string,
  startPostRef: PostRef,
  username: string = '',
  limit: number = NUM_FETCH_POSTS + 1,
  filterNsfw: boolean = true,
): Promise<PostData[]> => {
  // build query
  const query: DisqussionQuery = {
    tag: tag,
    limit: limit,
    start_permlink: startPostRef.permlink || undefined,
    start_author: startPostRef.author || undefined,
    truncate_body: TRUNCATE_BODY_LENGTH, // @todo what if no trucate?
  };

  try {
    console.log('[fetchPostsSummary] category, query', category, query);
    const posts = await client.call(
      'condenser_api',
      `get_discussions_by_${category}`,
      [query],
    );

    let postDataList: PostData[];
    //    postDataList = await parsePosts(posts, username, blockchainSettings.image);
    postDataList = await parsePosts(posts, username, IMAGE_SERVERS[0]);

    // TODO: implement later
    // if (filterNsfw) {
    //   const updatedPosts = filterNSFWPosts(extPosts);
    //   return updatedPosts;
    // }
    return postDataList;
  } catch (error) {
    console.log('failed to get posts summaries', error.message);
    return [];
  }
};

//// fetch post details
export const fetchPostDetails = async (
  author: string,
  permlink: string,
  username: string = null,
  isPromoted = false,
): Promise<PostData> => {
  try {
    const post = await client.database.call('get_content', [author, permlink]);
    console.log('fetchPostDetails. post', post);

    const postData = await parsePost(
      post,
      username,
      IMAGE_SERVERS[0],
      //      blockchainSettings.image,
      isPromoted,
    );
    if (postData) return postData;
    return null;
  } catch (error) {
    console.log('failed to fetch post details', error);
    return null;
  }
};

//// fetch post details
export const fetchPostDetails2 = async (
  tag: string,
  author: string,
  permlink: string,
  username: string = null,
  isPromoted = false,
): Promise<PostData> => {
  try {
    const post = await client.database.call('get_content', [author, permlink]);
    console.log('fetchPostDetails. post', post);

    const postState = await client.call('condenser_api', 'get_state', [
      post.url,
    ]);
    console.log('fetchPostDetails. post state', postState);

    const postData = await parsePost(
      post,
      username,
      IMAGE_SERVERS[0],
      //      blockchainSettings.image,
      isPromoted,
    );

    // build array
    let _comments = [];
    Object.keys(postState.content).forEach((key) => {
      _comments.push(postState.content[key]);
    });
    console.log('raw comments', _comments);

    const comments = await parsePosts(_comments, username, IMAGE_SERVERS[0]);

    console.log('comment parsed', comments);

    if (postData) return postData;
    return null;
  } catch (error) {
    console.log('failed to fetch post details', error);
    return null;
  }
};

/// fetch a post
export const fetchPost = async (
  author: string,
  permlink: string,
  currentUserName?: string,
  isPromoted?: boolean,
) => {
  try {
    const post = await client.database.call('get_content', [author, permlink]);
    console.log('[fetchPost] post', post);

    return post
      ? await parsePost(
        post,
        currentUserName,
        IMAGE_SERVERS[0],
        //          blockchainSettings.image,
        isPromoted,
      )
      : null;
  } catch (error) {
    return error;
  }
};

// fetch raw post
export const fetchRawPost = async (
  author: string,
  permlink: string,
): Promise<Discussion> => {
  try {
    return await client.database.call('get_content', [author, permlink]);
  } catch (error) {
    console.log('failed to get raw post');
    return error;
  }
};

// fetch last comments
// get_replies_by_last_update
export const fetchRecentComments = async (
  startAuthor: string,
  startPermlink: string,
  limit: number = NUM_FETCH_COMMENTS + 1,
  username: string = null,
) => {
  let results;
  //const query = [startAuthor, startPermlink, limit];
  //blurtcurator/re-ya-soy-un-delfin-i-am-already-a-dolphin-20210131t000152z
  const query = [
    'blurtcurator',
    're-ya-soy-un-delfin-i-am-already-a-dolphin-20210131t000152z',
    50,
  ];
  try {
    // get all comments of depth 1
    results = await client.database.call('get_replies_by_last_update', query);
  } catch (error) {
    console.log('failed to fetch comments', error);
  }

  console.log('[fetchRecentComments] results', results);
  // return if no comments
  if (!results) return null;

  // setup comments of parent
  const comments = [];
  // loop over children
  for (let i = 0; i < results.length; i++) {
    // parse comment
    const extComment = await parseComment(results[i], username);
    comments.push(extComment);
  }

  return comments;
};

// fetch comments
export const fetchComments = async (
  author: string,
  permlink: string,
  username: string = null,
) => {
  let results;
  try {
    // get all comments of depth 1
    results = await client.database.call('get_content_replies', [
      author,
      permlink,
    ]);
  } catch (error) {
    console.log('failed to fetch comments', error);
  }

  // return if no comments
  if (!results) return null;

  // setup comments of parent
  const comments = [];
  // loop over children
  for (let i = 0; i < results.length; i++) {
    // parse comment
    const extComment = await parseComment(results[i], username);
    comments.push(extComment);
  }

  return comments;
};

// fetch comments recursively
export const fetchRecursiveComments = async (
  author: string,
  permlink: string,
  username: string = null,
) => {
  let results;
  try {
    // get all comments of depth 1
    results = await client.database.call('get_content_replies', [
      author,
      permlink,
    ]);
  } catch (error) {
    console.log('failed to fetch comments', error);
  }

  // return if no comments
  if (!results) return null;

  // setup comments of parent
  const comments = [];
  // loop over children
  for (let i = 0; i < results.length; i++) {
    // parse comment
    const extComment = await parseComment(results[i], username);
    comments.push(extComment);

    // recursive call if a child exists
    if (results[i].children > 0) {
      const children = await fetchComments(
        results[i].author,
        results[i].permlink,
      );
      comments[i] = { ...comments[i], comments: children };
    }
  }
  return comments;
};

//

//// broadcast post
export const broadcastPost = async (
  postingData: PostingContent,
  password: string,
  options?: any[],
) => {
  // // verify the key
  // const { account } = await verifyPassword(postingData.author, password);
  // if (!account) {
  //   return null;
  // }
  // build comment
  const opArray = [['comment', postingData]];
  // add options if exists
  if (options) {
    opArray.push(['comment_options', options]);
  }
  console.log('[broadcastPost] opArray', opArray);

  const privateKey = PrivateKey.from(password);

  if (privateKey) {
    try {
      const result = await client.broadcast.sendOperations(opArray, privateKey);
      if (result) return result;
      return null;
    } catch (error) {
      console.log('failed to broadcast a post', error);
      return null;
    }
  }
  // wrong private key
  console.log(
    '[broadcastPost] Check private key. Required private posting key or above',
  );
  return null;
};

export const broadcastPostUpdate = async (
  originalBody: string,
  originalPermlink: string,
  originalParentPermlink: string,
  postingContent: PostingContent,
  password: string,
) => {
  // @todo sometime no post exists why?
  console.log('[broadcastPostUpdate] org post', originalBody);
  console.log('[broadcastPostUpdate] new post', postingContent.body);

  // check validity of the password
  // verify the key
  // @todo check sanity of argument: exits? (it happend the empty post)
  // const { account } = await verifyPassword(postingContent.author, password);
  // if (!account) {
  //   return { success: false, message: 'the password is invalid' };
  // }

  //// create a patch
  const text = originalBody;
  // handle no text or null
  if (!text && text === '') {
    return { success: false, message: 'Nothing in the body' };
  }
  // get list of patches to turn text to newPost
  const patch_make = dmp.patch_make(text, postingContent.body);
  console.log('[broadcastPostUpdate] patch_make', patch_make);
  // turns the patch to text
  const patch = dmp.patch_toText(patch_make);

  console.log('[broadcastPostUpdate] patch', patch);

  // check if patch size is smaller than original post
  let body = patch;

  // set patch if exists
  if (patch) {
    body = patch;
  } else {
    console.log('no patch exists. keep the original body.');
    body = text;
  }

  console.log('org body length, patch body length', text.length, patch.length);
  console.log('[broadcastPostUpdate] patched body', body);

  //// build patched post
  // const patchPost: PostingContent = {
  //   parent_author: postingContent.parent_author,
  //   parent_permlink: originalParentPermlink,
  //   author: postingContent.author,
  //   permlink: originalPermlink,
  //   body: body,
  //   json_metadata: postingContent.json_metadata,
  //   title: postingContent.title,
  // };

  const patchPost: PostingContent = {
    parent_author: postingContent.parent_author,
    parent_permlink: originalParentPermlink,
    author: postingContent.author,
    permlink: originalPermlink,
    body: postingContent.body,
    json_metadata: postingContent.json_metadata,
    title: postingContent.title,
  };

  console.log('[broadcastPostUpdate] patchPost', patchPost);
  // submit
  const result = await broadcastPost(patchPost, password);
  return result;
};

//// sign image to upload
export const signImage = async (photo, username, password) => {
  // verify the user and password
  // @test
  // const { account } = await verifyPassword(username, password);
  // if (!account) {
  //   console.log('[signImage] failed to verify password');
  //   return null;
  // }


  try {
    // create a buffer of image data
    const photoBuf = Buffer.from(photo.data, 'base64');
    // prefix buffer to upload an image to steemitimages.com
    const prefix = Buffer.from('ImageSigningChallenge');
    // build data to be signed
    const data = Buffer.concat([prefix, photoBuf]);

    //  console.log('[signImage] buf', buf);
    // get ec private key from wif pasword
    const privateKey = PrivateKey.fromString(password);
    // compute hash of the data
    const hash = cryptoUtils.sha256(data);
    //  console.log('[signImage] hash, type', hash, typeof hash);
    // sign the hash
    const signature = privateKey.sign(hash);

    console.log('[signImage] signature', signature, typeof signature);

    // verify the signature
    if (!privateKey.createPublic().verify(hash, signature)) {
      console.error('signaure is invalid');
    }
    //    console.log('sig is valid, sig', signature);

    return signature;
  } catch (error) {
    console.log('failed to sign images', error);
    return null;
  }
};

//// votes
// get active votes of the post
export const getActiveVotes = (
  author: string,
  permlink: string,
): Promise<any> =>
  new Promise((resolve, reject) => {
    client.database
      .call('get_active_votes', [author, permlink])
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
  });

//// reblog a post
export const reblog = async (
  username: string,
  password: string,
  author: string,
  permlink: string,
) => {
  // // verify the key
  // const { account } = await verifyPassword(username, password);
  // if (!account) {
  //   return { success: false, message: 'the password is invalid' };
  // }
  // get privake key from password
  const privateKey = PrivateKey.from(password);

  if (privateKey) {
    const json = ['reblog', { account: username, author, permlink }];
    let operation = {
      required_auths: [],
      required_posting_auths: [username],
      id: 'follow',
      json: JSON.stringify(json),
    };
    try {
      const result = await client.broadcast.json(operation, privateKey);
      return result;
    } catch (error) {
      console.log('Failed to broadcast reblog', error);
    }
  }
};

// submit a vote
export const submitVote = async (
  voter: string,
  password: string,
  author: string,
  permlink: string,
  votingWeight: number,
) => {
  // build vote object
  const vote = {
    voter,
    author,
    permlink,
    weight: votingWeight * 100,
  };
  // // verify the key
  // const { account } = await verifyPassword(voter, password);
  // if (!account) {
  //   return null;
  // }

  // get privake key from password
  const privateKey = PrivateKey.from(password);

  if (privateKey) {
    // use dblurt library --> has signing problem in release mode
    try {
      const result = await client.broadcast.vote(vote, privateKey);
      if (result) return result;
      return null;
    } catch (error) {
      console.log('failed to submit a vote', error);
      return null;
    }
  }
  console.log(
    '[submitVote] Check private key. Required private posting key or above',
  );
  return null;
};

//////// profile
//// update profile
export const broadcastProfileUpdate = async (
  username: string,
  password: string,
  params: {},
) => {
  // verify the key, require active or above
  // const { account } = await verifyPassword(username, password);
  // if (!account) {
  //   return { success: false, message: 'the password is invalid' };
  // }

  // get privake key from password wif
  const privateKey = PrivateKey.from(password);

  //// broadcast update
  if (privateKey) {
    const opArray = [
      [
        'account_update2',
        {
          account: username,
          json_metadata: jsonStringify({ profile: params }),
          posting_json_metadata: jsonStringify({ profile: params }),
          extensions: [],
        },
      ],
    ];
    try {
      const result = await client.broadcast.sendOperations(opArray, privateKey);
      console.log('broadcastProfileUpdate. result', result);
      return result;
    } catch (error) {
      console.log('failed to broadcast profile update', error);
      return null;
    }
  }
  // wrong private key
  return Promise.reject(
    new Error('Check private key. Required private active key or above'),
  );
};

/////////// notifications
//// fetch notifications
// export const fetchNotifications = async (username: string): Promise<any[]> => {
//   //  const notiClient = new NotiClient('wss://notifications.blurt.world');
//   //  const result = await notiClient.call('get_notifications', [username]);
//   const params = `@${username}/notifications`;
//   console.log('fetchNotifications. params', params);
//   try {
//     //    const result = await client.call('condenser_api', 'get_state', [params]);
//     const notiClient = new NotiClient(BLURT_NOTIFICATIONS_ENDPOINT);
//     const result = await notiClient.call('get_notifications', [username]);
//     console.log('fetchNotifications. client, result', notiClient, result);
//     if (result) return result;
//     return null;
//   } catch (error) {
//     console.log('failed to fetch notifications', error);
//     return null;
//   }
// };

export const fetchNotifications = async (username: string): Promise<any[]> => {
  try {
    const notifications = await client.call('bridge', 'account_notifications', {
      account: username,
      limit: 50,
    });
    return notifications;
  } catch (error) {
    console.log('faield to fetch notifications');
    return null;
  }
};

// export const fetchNotifications = async (username: string): Promise<any[]> => {
//   return new Promise((resolve, reject) => {
//     const notiClient = new NotiClient('wss://notifications.blurt.world');
//     notiClient.call('get_notifications', [username], (err, result) => {
//       if (err) reject(err);
//       resolve(result);
//     });
//   });
// };

//////////// wallet
//// fetch wallet data
export const fetchWalletData = async (username: string) => {
  try {
    const params = `@${username}/transfers`;
    const accountState = await client.call('condenser_api', `get_state`, [
      params,
    ]);
    console.log('[fetchWalletData] accountState', accountState);
    // build wallet data
    if (accountState) {
      const account = get(accountState.accounts, username, '');
      console.log('[fetchWalletData] account', account);
      // destructuring
      const {
        balance,
        savings_balance,
        sbd_balance,
        savings_sbd_balance,
        reward_steem_balance,
        reward_sbd_balance,
        reward_vesting_steem,
        voting_power,
        vesting_shares,
        received_vesting_shares,
        delegated_vesting_shares,
        transfer_history,
      } = account;
      // get sum of shares
      const sumShares =
        parseInt(vesting_shares.split(' ')[0]) +
        parseInt(received_vesting_shares.split(' ')[0]) -
        parseInt(delegated_vesting_shares.split(' ')[0]);
      // convert the shares to steem
      const power = vestToSteem(sumShares);
      // build wallet data
      const walletData: WalletData = {
        fetched: true,
        balance: balance.split(' ')[0],
        balanceSBD: sbd_balance.split(' ')[0],
        power: power,
        savingsSteem: savings_balance.split(' ')[0],
        savingsSBD: savings_sbd_balance.split(' ')[0],
        rewardSteem: reward_steem_balance.split(' ')[0],
        rewardSBD: reward_sbd_balance.split(' ')[0],
        rewardVesting: reward_vesting_steem.split(' ')[0],
        voteAmount: '0',
        votePower: String(voting_power),
        transactions: transfer_history
          ? transfer_history.slice(Math.max(transfer_history.length - 50, 0))
          : [],
      };
      return walletData;
    }
    return null;
  } catch (error) {
    console.log('failed to fetch wallet data', error);
    return null;
  }
};

//// claim reward balance
export const claimRewardBalance = async (
  username: string,
  password: string,
) => {
  const { account } = await verifyPassword(username, password);
  if (!account) {
    return { success: false, message: 'the password is invalid' };
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  if (privateKey) {
    const {
      reward_steem_balance: rewardSteem,
      reward_sbd_balance: rewardSBD,
      reward_vesting_balance: rewardVests,
    } = account;
    const opArray = [
      [
        'claim_reward_balance',
        {
          account: username,
          reward_steem: rewardSteem,
          reward_sbd: rewardSBD,
          reward_vests: rewardVests,
        },
      ],
    ];
    try {
      const result = await client.broadcast.sendOperations(opArray, privateKey);
      return result;
    } catch (error) {
      console.log('failed to claim reward', error);
      return null;
    }
  }

  // wrong private key
  return Promise.reject(
    new Error('Check private key. Required private posting key or above'),
  );
};

export enum TransactionReturnCodes {
  'NO_ACCOUNT',
  'INVALID_PASSWORD',
  'NEED_HIGHER_PASSWORD',
  'TRANSACTION_ERROR',
  'TRANSACTION_SUCCESS',
}

//// transfer token (sbd or steem)
export const transferToken = async (
  username: string,
  password: string,
  params: {
    to: string;
    amount: string;
    memo: string;
  },
): Promise<TransactionReturnCodes> => {
  // get key type
  const { account, keyType } = await verifyPassword(username, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  // transfer
  if (privateKey) {
    const args = {
      from: username,
      to: get(params, 'to'),
      amount: get(params, 'amount'),
      memo: get(params, 'memo'),
    };
    console.log('transferToken. username, args', username, args);
    try {
      const result = await client.broadcast.transfer(args, privateKey);
      console.log('[transferToken] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to send token', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

//// transfer steem to vesting
export const transferToVesting = async (
  username: string,
  password: string,
  params: {
    amount: string;
  },
): Promise<TransactionReturnCodes> => {
  // get key type
  const { account, keyType } = await verifyPassword(username, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  // transfer
  if (privateKey) {
    const args = [
      [
        'transfer_to_vesting',
        {
          from: username,
          to: username,
          amount: get(params, 'amount'),
        },
      ],
    ];
    console.log('transferToVesting. username, args', username, args);
    try {
      const result = await client.broadcast.sendOperations(args, privateKey);
      console.log('[transferToVesting] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to transfer to vesting', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

//// power down
export const withdrawVesting = async (
  username: string,
  password: string,
  params: {
    amount: string;
  },
): Promise<TransactionReturnCodes> => {
  // get key type
  const { account, keyType } = await verifyPassword(username, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  // transfer
  if (privateKey) {
    const args = [
      [
        'withdraw_vesting',
        {
          account: username,
          amount: get(params, 'amount'),
        },
      ],
    ];
    console.log('withdrawVesting. username, args', username, args);
    try {
      const result = await client.broadcast.sendOperations(args, privateKey);
      console.log('[withdrawVesting] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to power down', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

export const delegateVestingShares = async (
  from: string,
  to: string,
  amount: string,
  password: string,
) => {
  // get key type
  const { account, keyType } = await verifyPassword(from, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  if (privateKey) {
    const args = [
      [
        'delegate_vesting_shares',
        {
          delegator: from,
          delegatee: to,
          vesting_shares: amount,
        },
      ],
    ];

    try {
      const result = await client.broadcast.sendOperations(args, privateKey);
      console.log('[delegateVestingShares] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to power down', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

export const transferToSavings = async (
  from: string,
  to: string,
  amount: string,
  memo: string,
  password: string,
) => {
  // get key type
  const { account, keyType } = await verifyPassword(from, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  if (privateKey) {
    const args = [
      [
        'transfer_to_savings',
        {
          from: from,
          to: to,
          amount: amount,
          memo: memo,
        },
      ],
    ];

    try {
      const result = await client.broadcast.sendOperations(args, privateKey);
      console.log('[transferToSavings] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to transer to savings', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

export const transferFromSavings = async (
  from: string,
  to: string,
  amount: string,
  password: string,
  requestId: string,
  memo?: string,
) => {
  // get key type
  const { account, keyType } = await verifyPassword(from, password);
  // check sanity
  if (!account) {
    return TransactionReturnCodes.NO_ACCOUNT;
  }
  // check key level: active or higher
  if (keyType < KeyTypes.ACTIVE) {
    return TransactionReturnCodes.NEED_HIGHER_PASSWORD;
  }
  // get privake key from password wif
  const privateKey = PrivateKey.from(password);
  if (privateKey) {
    const args = [
      [
        'transfer_from_savings',
        {
          from: from,
          to: to,
          amount: amount,
          memo: memo,
          request_id: requestId,
        },
      ],
    ];

    try {
      const result = await client.broadcast.sendOperations(args, privateKey);
      console.log('[transferFromSavings] result', result);
      if (result) return TransactionReturnCodes.TRANSACTION_SUCCESS;
      else return TransactionReturnCodes.TRANSACTION_ERROR;
    } catch (error) {
      console.log('failed to transer to savings', error);
      return TransactionReturnCodes.TRANSACTION_ERROR;
    }
  }
  return TransactionReturnCodes.INVALID_PASSWORD;
};

//////////////// Utils /////////////////////////////////

export const calculateReputation = (reputation: number) => {
  const multi = reputation < 0 ? -9 : 9;
  let rep = Math.log10(Math.abs(reputation));
  rep = Math.max(rep - 9, 0);
  rep *= multi;
  rep += 25;
  return rep;
};

export const getName = (about) => {
  if (about.profile && about.profile.name) {
    return about.profile.name;
  }
  return null;
};

export const getAvatar = (about) => {
  if (about.profile && about.profile.profile_image) {
    return about.profile.profile_image;
  }
  return null;
};

/*

/////////////// Blockchain Operations Helpers ////////////////////////

// fetch user profile
export const fetchProfile = async (author: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const profile = await client.call('bridge', 'get_profile', {
        account: author,
      });
      console.log('[dSteem|fetchProfile] profile', profile);
      if (profile) {
        resolve(profile);
      } else {
        // TODO: handle null when fetching get_profile
        //        const _profile = await fetchUserProfile(author);
        //        console.log('[dSteem|fetchProfile] using standard. profile', _profile);
        resolve(null);
      }
    } catch (error) {
      console.log('failed to fetch profile', error);
      reject(error);
    }
  });


export const getAccount0 = async (username: string) => {
  try {
    const data = {
      id: 1,
      jsonrpc: '2.0',
      method: 'call',
      params: ['database_api', 'get_accounts', [[username]]],
    };
    let accounts = [];
    await fetch(MAINNET_OFFICIAL, {
      method: 'POST',
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((res) => {
        accounts = res.result;
        console.log('[getAccount] username, account', username, accounts);
      });
    // check exists
    if (accounts.length == 0) {
      return null;
    }
    return accounts;
  } catch (error) {
    console.log('failed to get account', error);
    return null;
  }
};

// fetch comments
export const fetchComments = async (author: string, permlink: string) => {
  let results;
  try {
    // get all comments of depth 1
    results = await client.database.call('get_content_replies', [
      author,
      permlink,
    ]);
  } catch (error) {
    console.log('failed to fetch comments', error);
  }

  // return if no comments
  if (!results) return null;

  console.log('[fetchComments] results', results);
  // map over children
  const pArray1 = results.map(async (comment: Discussion, id) => {
    //
    const comments = [];
    // push the first children
    const extComment = await parseComment(comment);
    comments.push(extComment);
    // recursive call if a child exists
    if (comment.children > 0) {
      const children = await fetchComments(comment.author, comment.permlink);
    }
    return comments;
  });
  const _comments = Promise.all(pArray1);

  return _comments;
};
*/

/*
   case PostsActionTypes.VOTING_COMMENT:
      console.log('[postReducer] upvoting action payload', action.payload);
      // @todo find the comments in the comment tree
      // bfs
      // push the child comments of the post to a queue
      const q = [];
      state[postIndex].comments.forEach(comment => {
        q.push(comment);
      });
      let found = false;
      return state;
      /*
            while(!found) {
        //   pop a comment
        const comment = q.shift();
        //   try matching,
        if (comment.author === postRef.author && comment.permlink === postRef.permlink) {
          // if success, update the payout, active_votes, votes_count
          payout = parseFloat(state[postIndex].postUserState.payout);
          newPayout = payout + voteAmount;
          newVotesCount = state[postIndex].postUserState.votes_count + 1;
          voters = state[postIndex].postUserState.active_votes;
          // @todo find the comment if the post is comment
          newVoters = [`${username} ($${voteAmount})`, ...voters];
          newPosts = [...state];
          newPosts[postIndex].postUserState.voted = true;
          newPosts[postIndex].postUserState.payout = newPayout.toFixed(2);
          newPosts[postIndex].postUserState.votes_count = newVotesCount;
          newPosts[postIndex].postUserState.active_votes = newVoters;
          return newPosts;
        } else {
          // if failed, push the child of the comment to the queue
        }
      }
*/

/*
// fetch post summary
export const fetchPostsSummary = async (
  query: PostsQuery,
): Promise<ExtendedPost[]> => {
  try {
    console.log('[fetchPostsSummary] query', query);
    const _qeury = {
      tag: query.tag,
      start_author: query.start_author,
      start_permlink: query.start_permlink,
      limit: query.limit,
    };
    //    const posts = await client.database.getDiscussions(query.sort, query);
    const posts = await client.call('bridge', 'get_ranked_posts', {
      sort: query.sort,
      tag: query.tag,
      observer: query.observer,
      start_author: query.start_author,
      start_permlink: query.start_permlink,
      limit: 1,
    });
    console.log('[fetchPostsSummary] posts', posts);
    let extPosts: ExtendedPost[];
    if (posts) {
      extPosts = await parsePosts(posts, query.observer);

      // @todo implement later
      // if (filterNsfw) {
      //   const updatedPosts = filterNSFWPosts(extPosts);
      //   return updatedPosts;
      // }
    }
    return extPosts;
  } catch (error) {
    console.log('failed to get posts summaries', error);
    return null;
  }
};
*/

/*
export const fetchUserProfile = async (username: string) => {
  try {
    console.log('[fetchUserData] fetching...');
    // fetch account
    const accounts = await client.database.getAccounts([username]);
    const account = accounts[0];
    console.log('[fetchUserData] fetched. account0', account);
    // check sanity
    if (!account[0]) {
      return null;
    }

    // compute reputation
    const reputation = calculateReputation(
      parseInt(account[0].reputation as string),
    );
    // get followers count
    const followCount = await getFollows(username);
    console.log('[fetchUserData] follow count', followCount);
    // get global properties
    const globalProps = await fetchGlobalProps();
    // estimate vote amount
    const voteAmount = estimateVoteAmount(account, globalProps);
    // steem power
    const steem_power = await vestToSteem(
      account.vesting_shares as string,
      globalProps.dynamicProps.total_vesting_shares,
      globalProps.dynamicProps.total_vesting_fund_steem,
    );
    // received steem power
    const received_steem_power = await vestToSteem(
      get(account, 'received_vesting_shares' as string),
      get(globalProps.dynamicProps, 'total_vesting_shares'),
      get(
        globalProps.dynamicProps,
        'total_vesting_fund_steem',
        globalProps.dynamicProps.total_vesting_fund_steem,
      ),
    );
    // delegated steem power
    const delegated_steem_power = await vestToSteem(
      get(account, 'delegated_vesting_shares' as string),
      get(globalProps.dynamicProps, 'total_vesting_shares'),
      get(
        globalProps.dynamicProps,
        'total_vesting_fund_steem',
        globalProps.dynamicProps.total_vesting_fund_steem,
      ),
    );

    // parse meta data
    if (
      has(account, 'posting_json_metadata') ||
      has(account, 'json_metadata')
    ) {
      try {
        account.about =
          JSON.parse(get(account, 'json_metadata')) ||
          JSON.parse(get(account, 'posting_json_metadata'));
        console.log('[dSteem|fetchUserData]', account.about);
      } catch (error) {
        console.log('failed to fetch profile', error);
        account.about = {};
      }
    }
    account.avatar = getAvatar(get(account, 'about'));
    account.nickname = getName(get(account, 'about'));

    // build user data
    const _account: ProfileData = {
      profile: {
        post_count: account[0].post_count,
        metadata: {
          profile: account.about,
        },
        name: username,
        reputation: reputation,
        stats: {
          sp: parseFloat(steem_power),
          following: followCount.following_count,
          followers: followCount.followers_count,
        },
      },
      voteAmount,
    };

    return _account;
  } catch (error) {
    console.log('failed to fetch user data');
    return Promise.reject(error);
  }
};
*/

/*
export const checkClaimedToken = async (creator: string) => {
  try {
    const accounts = await client.database.call('get_accounts', [[creator]]);
    const numTokens = accounts[0].pending_claimed_accounts;
    console.log('number of claimed tokens', numTokens);
    if (numTokens > 0) return true;
    else return false;
  } catch (error) {
    console.log('claimed token error', error);
    return false;
  }
};

// claim account creation token to create a new account
// @return success of failure of the claim
export const claimAccountCreationToken = async (
  creator: string,
  activeKey: string,
) => {
  try {
    const creatorKey = PrivateKey.fromString(activeKey);
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

// create an account
export const createAccount = async (
  username: string,
  creator: string,
  creatorActiveKey: string,
) => {
  //// check sanity: claimed account creation tokens
  if (!checkClaimedToken(creator)) {
    console.log('failed to create account due to no clamied token');
    return null;
  }
  // generate random master password
  const array = CryptoJS.lib.WordArray.random(10);
  const password = 'P' + PrivateKey.fromSeed(array.toString()).toString();
  console.log('master password', password.toString());

  // @test without actual account creation
  //return { result: "test", password: password };

  // private active key of creator account
  const creatorKey = PrivateKey.fromString(creatorActiveKey);
  // create keys
  const ownerKey = PrivateKey.fromLogin(username, password, 'owner');
  const activeKey = PrivateKey.fromLogin(username, password, 'active');
  const postingKey = PrivateKey.fromLogin(username, password, 'posting');
  const memoKey = PrivateKey.fromLogin(username, password, 'memo').createPublic(
    client.addressPrefix,
  );

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
  let operations: Operation[] = [];
  //create operation to transmit
  const create_op: Operation = [
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
  console.log(create_op);
  // push the creation operation
  operations.push(create_op);
  // broadcast operation to blockchain
  try {
    const result = await client.broadcast.sendOperations(
      operations,
      creatorKey,
    );
    if (result) {
      console.log('creation result', result);
      return password;
    } else {
      return null;
    }
  } catch (error) {
    console.log('account creation failed', error);
    return null;
  }
};
*/

/*
// fetch user data
export const fetchUserData = async (username: string) => {
  try {
    console.log('[fetchUserData] fetching...');
    // fetch account
    const account = await client.database.getAccounts([username]);
    console.log('[fetchUserData] fetched. account0', account);

    // compute reputation
    const reputation = calculateReputation(
      parseInt(account[0].reputation as string),
    );
    // get followers count
    const followCount = await getFollows(username);
    console.log('[fetchUserData] follow count', followCount);
    // get global properties
    const globalProps = await fetchGlobalProps();
    // estimate vote amount
    const voteAmount = estimateVoteAmount(account[0], globalProps);
    // steem power
    const steem_power = await vestToSteem(
      account[0].vesting_shares as string,
      globalProps.dynamicProps.total_vesting_shares,
      globalProps.dynamicProps.total_vesting_fund_steem,
    );
    // received steem power
    const received_steem_power = await vestToSteem(
      get(account[0], 'received_vesting_shares' as string),
      get(globalProps.dynamicProps, 'total_vesting_shares'),
      get(
        globalProps.dynamicProps,
        'total_vesting_fund_steem',
        globalProps.dynamicProps.total_vesting_fund_steem,
      ),
    );
    // delegated steem power
    const delegated_steem_power = await vestToSteem(
      get(account[0], 'delegated_vesting_shares' as string),
      get(globalProps.dynamicProps, 'total_vesting_shares'),
      get(
        globalProps.dynamicProps,
        'total_vesting_fund_steem',
        globalProps.dynamicProps.total_vesting_fund_steem,
      ),
    );

    // build user data
    const _account: ProfileData = {
      ...account[0],
      author: username,
      reputation,
      voteAmount,
      follow_count: {
        following: followCount.following_count,
        follower: followCount.follower_count,
      },
      steem_power: {
        sp: parseFloat(steem_power),
        received: parseFloat(received_steem_power),
        delegated: parseFloat(delegated_steem_power),
      },
    };
    // check sanity
    if (account && account.length < 1) {
      return null;
    }
    // parse meta data
    if (
      has(_account, 'posting_json_metadata') ||
      has(_account, 'json_metadata')
    ) {
      console.log('[dSteem|fetchUserData] _account', _account);
      try {
        _account.about =
          JSON.parse(get(_account, 'json_metadata')) ||
          JSON.parse(get(_account, 'posting_json_metadata'));
        console.log('[dSteem|fetchUserData]', _account.about);
      } catch (error) {
        console.log('failed to fetch profile', error);
        _account.about = {};
      }
    }
    _account.avatar = getAvatar(get(_account, 'about'));
    _account.nickname = getName(get(_account, 'about'));
    return _account;
  } catch (error) {
    console.log('failed to fetch user data');
    return Promise.reject(error);
  }
};
*/
