//// react
import React, {useState, useEffect, useContext} from 'react';
//// react native
import {FlatList, Animated, StyleSheet, ScrollView, View} from 'react-native';
//// language
import {useIntl} from 'react-intl';
//// ui
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import {TabView, SceneMap} from 'react-native-tab-view';
import {argonTheme} from '~/constants';
import {
  WalletStatsView,
  WalletKeyView,
  TokenTransfer,
  Powerup,
} from '~/components';
import {KeyTypes, PriceData} from '~/contexts/types';
import {WalletData} from '~/contexts/types';

interface Props {
  walletData: WalletData;
  price: PriceData;
  handlePressClaim: () => void;
  claiming: boolean;
  followingList: string[];
  showTransfer: boolean;
  isSBD: boolean;
  showPowerup?: boolean;
  balance: string;
  handleTransferPress: (isSBD: boolean, index: number) => void;
  handleTransferResult: (result: boolean) => void;
  handlePowerupPress: () => void;
  handlePowerupResult: (result: boolean) => void;
  onRefresh: () => void;
}
const WalletScreen = (props: Props): JSX.Element => {
  //// language
  const intl = useIntl();
  //// contexts
  //// states
  const [index, setIndex] = React.useState(0);
  // TODO: use intl
  const [routes] = React.useState([
    {key: 'stats', title: intl.formatMessage({id: 'Wallet.balances'})},
    {key: 'keys', title: intl.formatMessage({id: 'Wallet.keys'})},
  ]);

  const WalletStats = () => {
    //// props
    const {
      claiming,
      price,
      isSBD,
      showTransfer,
      showPowerup,
      followingList,
      balance,
    } = props;
    return (
      <Block>
        <WalletStatsView
          walletData={props.walletData}
          isUser
          handlePressClaim={props.handlePressClaim}
          claiming={claiming}
          price={price}
          onRefresh={props.onRefresh}
          handleTransferPress={props.handleTransferPress}
          handlePowerupPress={props.handlePowerupPress}
        />
        {showTransfer && (
          <TokenTransfer
            isSBD={isSBD}
            title={
              props.isSBD
                ? intl.formatMessage({id: 'Wallet.sbd_transfer_title'})
                : intl.formatMessage({id: 'Wallet.steem_transfer_title'})
            }
            followings={followingList}
            balance={balance}
            handleResult={props.handleTransferResult}
          />
        )}
        {props.showPowerup && (
          <Powerup
            title={intl.formatMessage({id: 'Powerup.title'})}
            balance={balance}
            handleResult={props.handlePowerupResult}
          />
        )}
      </Block>
    );
  };

  const WalletKeys = () => {
    return (
      <ScrollView>
        <Block style={{margin: 5}}>
          <Text h6>{intl.formatMessage({id: 'Wallet.keys_header'})}</Text>
          <Text>{intl.formatMessage({id: 'Wallet.keys_guide'})}</Text>

          <WalletKeyView type="posting" />
          <WalletKeyView type="active" />
          <WalletKeyView type="owner" />
          <WalletKeyView type="memo" />
          <Block
            card
            middle
            style={{
              shadowColor: argonTheme.COLORS.FACEBOOK,
              marginHorizontal: 5,
              marginVertical: 10,
              padding: 20,
            }}>
            <Text h6 color="red">
              {intl.formatMessage({id: 'Wallet.danger_zone'})}
            </Text>
            <Text> {intl.formatMessage({id: 'Wallet.danger_msg'})}</Text>
            <Button disabled size="large" color={argonTheme.COLORS.MUTED}>
              {intl.formatMessage({id: 'Wallet.change_master'})}
            </Button>
          </Block>
        </Block>
      </ScrollView>
    );
  };

  const renderScene = SceneMap({
    stats: WalletStats,
    keys: WalletKeys,
  });

  return (
    <TabView
      navigationState={{index, routes}}
      renderScene={renderScene}
      onIndexChange={setIndex}
      tabBarPosition="top"
    />
  );
};

export {WalletScreen};

const styles = StyleSheet.create({
  header: {
    backgroundColor: 'green',
  },
  notification: {
    paddingVertical: theme.SIZES.BASE / 3,
  },
  title: {
    paddingTop: theme.SIZES.BASE / 2,
    paddingBottom: theme.SIZES.BASE * 1.5,
  },
  rows: {
    paddingHorizontal: theme.SIZES.BASE,
    marginBottom: theme.SIZES.BASE * 1.25,
  },
  wrapper: {},
  slide1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
  },
  slide2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#97CAE5',
  },
  slide3: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#92BBD9',
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
});
