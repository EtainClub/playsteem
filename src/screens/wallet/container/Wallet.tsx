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
//import {TokenTransfer} from '~/components';
//// vies
import {WalletScreen} from '../screen/Wallet';

//// props
interface Props {
  navigation: any;
  username: string;
}
const Wallet = (props: Props): JSX.Element => {
  //// props
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
  const [showPowerupModal, setShowPowerupModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [isSBD, setIsSBD] = useState(false);
  //////// events
  //// event: mount
  useEffect(() => {
    if (authState.loggedIn) {
      const {username} = authState.currentCredentials;
      // fetch user data if not fetched
      if (!userState.walletData.fetched) {
        getWalletData(username);
      }
      // fetch price
      getPrice();
      // get following list
      _getFollowingList(username);
    }
  }, [authState.currentCredentials]);
  //// on focus event:
  //// when the WalletStatView is used before, then author's wallet data show
  // TODO: this focus event fetches the data of the previous account, why???
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     if (authState.loggedIn) {
  //       console.log(
  //         '[Wallet] focus event. username',
  //         authState.currentCredentials.username,
  //       );
  //       console.log('auth state', authState);

  //       // fetch user's wallet data
  //       getWalletData(authState.currentCredentials.username);
  //     }
  //   });
  //   return unsubscribe;
  // }, [navigation]);

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

  //////// transfer
  ////
  const _handleTransferPress = (_isSBD: boolean, index: number) => {
    console.log('_handlePressTransfer. sdb?', _isSBD, index);
    setIsSBD(_isSBD);
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

  //////// powerup
  ////
  const _handlePowerupPress = () => {
    // clear sbd flag
    setIsSBD(false);
    setShowPowerupModal(true);
  };

  ////
  const _handlePowerupResult = (result: boolean) => {
    // hide powerup modal
    setShowPowerupModal(false);
    // refresh wallet if result is successulf
    if (result) {
      _getWalletData();
    }
  };

  return (
    <WalletScreen
      walletData={walletData}
      handlePressClaim={_handlePressClaim}
      claiming={claiming}
      price={price}
      onRefresh={_getWalletData}
      followingList={followingList}
      showTransfer={showTransferModal}
      isSBD={isSBD}
      showPowerup={showPowerupModal}
      balance={isSBD ? walletData.balanceSBD : walletData.balance}
      handleTransferPress={_handleTransferPress}
      handleTransferResult={_handleTransferResult}
      handlePowerupPress={_handlePowerupPress}
      handlePowerupResult={_handlePowerupResult}
    />
  );
};

export {Wallet};
