import { PostRef } from './postTypes';
import { BlockchainGlobalProps } from '~/providers/steem/dsteemApi';

//// action types
export enum UserActionTypes {
  FOLLOW,
  UNFOLLOW,
  ADD_BOOKMARK,
  REMOVE_BOOKMARK,
  ADD_FAVORITE,
  REMOVE_FAVORITE,
  SET_VOTE_AMOUNT,
  SET_GLOBAL_PROPS,
  SET_WALLET_DATA,
  SET_PROFILE_DATA,
  SET_PRICE,
  SET_FOLLOWINGS,
  SET_FOLLOWERS,
  SET_NOTIFICATIONS,
}

// profile data type
export interface ProfileData {
  profile: {
    // about, cover_image, locations, name(display_name), profile_image, website
    metadata: any;
    // account name
    name: string;
    // vote amount
    voteAmount: string;
    // vote power
    votePower: string;
    // liquid steem balance
    balance: string;
    // steem power
    power: string;
    // sbd balance
    sbd: string;
    // reputation
    reputation: number;
    // following, followers, rank, steem power
    stats: {
      post_count: number;
      following: number;
      followers: number;
      rank: number;
    };
  };
  blogRefs?: string[];
  blogs?: any;
  // bookmarks
  bookmarks?: any;
}

//// wallet data
export interface WalletData {
  // flag to initially check fetched
  fetched: boolean;
  // liquid steem
  balance: string;
  // sdb balance
  balanceSBD: string;
  // steem power
  power: string;
  // steem savings
  savingsSteem: string;
  // sbd savings
  savingsSBD: string;
  // steem reward
  rewardSteem: string;
  // sbd reward
  rewardSBD: string;
  // vesting reward
  rewardVesting: string;
  // vote amount
  voteAmount?: string;
  // voting weight
  votePower?: string;
  // transaction history
  transactions: any[];
  // received_vesting_shares
  receivedVestingShares: string;
  // delegated_vesting_shares
  delegatedVestingShares: string;
}

//// price data
export interface PriceData {
  steem: {
    usd: number;
    change24h: number;
  };
  sbd: {
    usd: number;
    change24h: number;
  };
}

//// notifications data
export interface NotificationData {
  fetched: boolean;
  notifications: any[];
}

//// user state
export interface UserState {
  profileData: ProfileData;
  globalProps: BlockchainGlobalProps;
  walletData: WalletData;
  notificationData: NotificationData;
  // price in usd
  price?: PriceData;
  followings: string[];
  followers: string[];
}

//// actions
// follow an author
interface FollowAction {
  type: UserActionTypes.FOLLOW;
  payload: string;
}
// unfollow an author
interface UnFollowAction {
  type: UserActionTypes.UNFOLLOW;
  payload: string;
}
// add a bookmark
interface AddBookmarkAction {
  type: UserActionTypes.ADD_BOOKMARK;
  payload: PostRef;
}
// remove a bookmark
interface RemoveBookmarkAction {
  type: UserActionTypes.REMOVE_BOOKMARK;
  payload: PostRef;
}
// add an author to fovorites
interface AddFavoriteAction {
  type: UserActionTypes.ADD_FAVORITE;
  payload: string;
}
// remove an author from favorite
interface RemoveFavoriteAction {
  type: UserActionTypes.REMOVE_FAVORITE;
  payload: string;
}
// set vote amount
interface SetVoteAmountAction {
  type: UserActionTypes.SET_VOTE_AMOUNT;
  payload: string;
}
// set steem global props
interface SetGlobalPropsAction {
  type: UserActionTypes.SET_GLOBAL_PROPS;
  payload: BlockchainGlobalProps;
}
// set wallet data
interface SetWalletDataAction {
  type: UserActionTypes.SET_WALLET_DATA;
  payload: WalletData;
}
// set profile data
interface SetProfileDataAction {
  type: UserActionTypes.SET_PROFILE_DATA;
  payload: ProfileData;
}
// set price
interface SetPriceAction {
  type: UserActionTypes.SET_PRICE;
  payload: PriceData;
}
// set following
interface SetFollowingsAction {
  type: UserActionTypes.SET_FOLLOWINGS;
  payload: string[];
}
// set followers
interface SetFollowersAction {
  type: UserActionTypes.SET_FOLLOWERS;
  payload: string[];
}
// set notifications
interface SetNotificationsAction {
  type: UserActionTypes.SET_NOTIFICATIONS;
  payload: NotificationData;
}
// user context type
export interface UserContextType {
  // ui state
  userState: UserState;
  //// action creators
  // fetch blockchain global props
  fetchBlockchainGlobalProps: (username?: string) => void;
  // update vote amount
  updateVoteAmount: (username: string) => void;
  // get wallet data
  getWalletData: (username: string) => Promise<WalletData>;
  // get user profile data
  getUserProfileData: (usernmae: string) => Promise<any>;
  // get user notifications
  getNotifications: (username: string) => Promise<any[]>;
  // get price
  getPrice: () => Promise<PriceData>;
  // update follow state
  updateFollowState: (
    follower: string,
    password: string,
    following: string,
    action: string,
  ) => Promise<any>;
  // get followings of the follower
  getFollowings: (follower: string) => Promise<string[]>;
  // get followers of the user
  getFollowers: (username: string) => Promise<string[]>;
}

export type UserAction =
  | SetVoteAmountAction
  | SetGlobalPropsAction
  | FollowAction
  | UnFollowAction
  | AddBookmarkAction
  | RemoveBookmarkAction
  | AddFavoriteAction
  | RemoveFavoriteAction
  | SetWalletDataAction
  | SetProfileDataAction
  | SetPriceAction
  | SetFollowingsAction
  | SetFollowersAction
  | SetNotificationsAction;
