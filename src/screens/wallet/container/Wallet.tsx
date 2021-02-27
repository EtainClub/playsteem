//// react
import React, {useState, useEffect, useContext} from 'react';
//// react native
import {View} from 'react-native';
//// language
import {useIntl} from 'react-intl';
////
import {AuthContext, UIContext, UserContext} from '~/contexts';
import {WalletData, KeyTypes, PriceData} from '~/contexts/types';
//// blockchain
import {claimRewardBalance} from '~/providers/steem/dsteemApi';
//// components
import {TokenTransfer} from '~/components';
//// vies
import {WalletScreen} from '../screen/Wallet';

//// props
interface Props {
  navigation: any;
  username: string;
}
const Wallet = (props: Props): JSX.Element => {
  //// props
  console.log('[WalletContainer] props', props);
  const {navigation} = props;
  //// language
  const intl = useIntl();
  //// contexts
  const {authState} = useContext(AuthContext);
  const {userState, getWalletData, getPrice, getFollowings} = useContext(
    UserContext,
  );
  const {setToastMessage} = useContext(UIContext);
  //// states
  const [walletData, setWalletData] = useState<WalletData>(
    userState.walletData,
  );
  const [claiming, setClaiming] = useState(false);
  const [price, setPrice] = useState<PriceData>();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [isSBD, setIsSBD] = useState(false);
  //////// events
  //// event: mount
  useEffect(() => {
    if (authState.loggedIn) {
      const {username} = authState.currentCredentials;
      // fetch user data
      getWalletData(username);
      // fetch price
      getPrice();
      // get following list
      _getFollowingList(username);
    }
  }, []);
  //// on focus event:
  //// when the WalletStatView is used before, then author's wallet data show
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[Wallet] focus event');
      if (authState.loggedIn) {
        // fetch user's wallet data
        getWalletData(authState.currentCredentials.username);
      }
    });
    return unsubscribe;
  }, [navigation]);
  //// event: account switched
  useEffect(() => {
    if (authState.loggedIn) {
      const {username} = authState.currentCredentials;
      // fetch user data
      getWalletData(username);
      // fetch price
      getPrice();
      // get following list
      _getFollowingList(username);
    }
  }, [authState.currentCredentials]);

  //// event: wallet fetched
  useEffect(() => {
    if (userState.walletData) {
      setWalletData(userState.walletData);
    }
  }, [userState.walletData]);
  //// event: price fetched
  useEffect(() => {
    setPrice(userState.price);
  }, [userState.price]);

  //// get wallet data
  const _getWalletData = async () => {
    const {username} = authState.currentCredentials;
    // fetch user data
    getWalletData(username);
    // fetch price
    getPrice();
  };

  //// get followings
  const _getFollowingList = async (username: string) => {
    const _followings = await getFollowings(username);
    setFollowingList(_followings);
  };

  //// claim reward balance
  const _handlePressClaim = async () => {
    setClaiming(true);
    // claim balance reward
    const {username, password} = authState.currentCredentials;
    const result = await claimRewardBalance(username, password);
    if (result) {
      console.log('[_handlePressClaim] result', result);
      // update the wallet data
      getWalletData(username);
      // set toast message
      setToastMessage(intl.formatMessage({id: 'Wallet.claim_ok'}));
    } else {
      // set toast message
      setToastMessage(intl.formatMessage({id: 'Wallet.claim_error'}));
    }
    // stop loading
    setClaiming(false);
  };

  ////
  const _handlePressTransfer = (_isSBD: boolean, index: number) => {
    console.log('_handlePressTransfer. sdb?', _isSBD, index);
    setIsSBD(_isSBD);
    if (index > 0) {
      setToastMessage('Not supported yet');
      return;
    }
    setShowTransferModal(true);
  };

  ////
  const _handleTransferResult = (result: boolean) => {
    // hide transfer modal
    setShowTransferModal(false);
    // refresh wallet if result is successulf
    if (result) {
      _getWalletData();
    }
  };

  return showTransferModal ? (
    <TokenTransfer
      isSBD={isSBD}
      title={
        isSBD
          ? intl.formatMessage({id: 'Wallet.sbd_transfer_title'})
          : intl.formatMessage({id: 'Wallet.steem_transfer_title'})
      }
      followings={followingList}
      balance={isSBD ? walletData.balanceSBD : walletData.balance}
      handleResult={_handleTransferResult}
    />
  ) : (
    <WalletScreen
      walletData={walletData}
      handlePressClaim={_handlePressClaim}
      claiming={claiming}
      price={price}
      onRefresh={_getWalletData}
      handlePressTransfer={_handlePressTransfer}
    />
  );
};

export {Wallet};
