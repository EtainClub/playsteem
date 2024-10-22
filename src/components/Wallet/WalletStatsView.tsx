//// react
import React, { useState, useEffect, useContext } from 'react';
//// react native
import { FlatList, StyleSheet } from 'react-native';
//// language
import { useIntl } from 'react-intl';
//// ui
import { Block, Icon, Button, Input, Text, theme } from 'galio-framework';
import { argonTheme } from '~/constants';
import { DropdownModal } from '~/components/DropdownModal';
import { WalletData } from '~/contexts/types';

//// utils
import { get } from 'lodash';
import { putComma } from '~/utils/stats';
import { getTimeFromNow } from '~/utils/time';
import { UIContext } from '~/contexts';
import { PriceData } from '~/contexts/types';
import { vestToSteem } from '~/providers/steem';

const BACKGROUND_COLORS = [
  argonTheme.COLORS.BORDER,
  argonTheme.COLORS.SECONDARY,
];

interface Props {
  walletData: WalletData;
  isUser?: boolean;
  handlePressClaim?: () => void;
  claiming?: boolean;
  showTransactions?: boolean;
  price?: PriceData;
  handleTransferPress?: (isSBD: boolean, index: number) => void;
  handlePowerupPress?: () => void;
  onRefresh: () => void;
}
const WalletStatsView = (props: Props): JSX.Element => {
  //// props
  const { price } = props;
  let {
    balance,
    balanceSBD,
    power,
    savingsSteem,
    savingsSBD,
    rewardSteem,
    rewardSBD,
    rewardVesting,
    transactions,
    votePower,
    delegatedVestingShares,
    receivedVestingShares,
  } = props.walletData;
  //// language
  const intl = useIntl();
  const { setToastMessage } = useContext(UIContext);
  //// states
  const [powerIndex, setPowerIndex] = useState(0);
  const [steemIndex, setSteemIndex] = useState(0);
  const [sbdIndex, setSBDIndex] = useState(0);

  const [savingsIndex, setSavingsIndex] = useState(0);
  const [reloading, setReloading] = useState(false);
  //// constants
  const powerOptions = [
    intl.formatMessage({ id: 'Wallet.dropdown_powerdown' }),
    intl.formatMessage({ id: 'Wallet.dropdown_delegate' }),
  ];
  const steemOptions = [
    intl.formatMessage({ id: 'Wallet.dropdown_transfer' }),
    intl.formatMessage({ id: 'Wallet.dropdown_powerup' }),
    intl.formatMessage({ id: 'Wallet.dropdown_transfer2savings' }),
  ];
  const sbdOptions = [
    intl.formatMessage({ id: 'Wallet.dropdown_transfer' }),
    intl.formatMessage({ id: 'Wallet.dropdown_transfer2savings' }),
  ];

  const savingsOptions = [intl.formatMessage({ id: 'Wallet.dropdown_withdraw' })];

  // put commas in reward
  balance = putComma(parseFloat(balance).toFixed(3));
  balanceSBD = putComma(parseFloat(balanceSBD).toFixed(3));
  power = putComma(parseFloat(power).toFixed(3));
  // delegatedVestingShares = putComma(parseFloat(delegatedVestingShares).toFixed(3));
  // receivedVestingShares = putComma(parseFloat(receivedVestingShares).toFixed(3));
  const delegatedVesting = parseFloat(receivedVestingShares) - parseFloat(delegatedVestingShares);
  const delegatedVestingText = delegatedVesting > 0 ? '+' + putComma(vestToSteem(delegatedVesting)) : putComma(vestToSteem(delegatedVesting));
  savingsSteem = putComma(savingsSteem);
  savingsSBD = putComma(savingsSBD);
  let needToClaim = false;
  let rewardText = intl.formatMessage({ id: 'Wallet.claim_reward_prefix' });
  if (
    parseFloat(rewardSteem) > 0 ||
    parseFloat(rewardSBD) > 0 ||
    parseFloat(rewardVesting) > 0
  ) {
    needToClaim = true;
    // build text for rewards
    if (parseFloat(rewardSteem) >= 0.001)
      rewardText += `${putComma(rewardSteem)} STEEM, `;
    if (parseFloat(rewardSBD) >= 0.001)
      rewardText += `${putComma(rewardSBD)} SBD, `;
    if (parseFloat(rewardVesting) >= 0.001)
      rewardText += `${putComma(rewardVesting)} SP`;
  }

  const _onRefresh = async () => {
    setReloading(true);
    await props.onRefresh();
    setReloading(false);
  };

  const _renderItem = ({ item, index }) => {
    let value = get(item, 'value', '');
    //const value = parseFloat(get(item, 'value', '')).toFixed(2);
    const op = get(item, 'textKey', '');
    const hideOp = op === 'transfer' ? true : false;
    const description =
      op === 'transfer' ? ' from ' + get(item, 'details', '') : '';

    // handle small value
    if (parseFloat(value) < 0.01) return;

    return (
      <Block row middle space="between" style={[styles.rows]}>
        <Block row>
          <Icon
            size={20}
            style={{ width: 30 }}
            color={argonTheme.COLORS.ERROR}
            name={item.icon}
            family={item.iconType}
          />
          <Text
            style={{ marginHorizontal: 5, textAlign: 'left' }}
            color="#525F7F"
            size={12}>
            {!hideOp &&
              intl.formatMessage({ id: `Wallet.${get(item, 'textKey')}` })}{' '}
            {value}
            {description}
          </Text>
        </Block>
        <Text>{getTimeFromNow(get(item, 'created'))}</Text>
      </Block>
    );
  };

  const _renderDropdownRow = (option, index, isSelect) => (
    <Block style={{ backgroundColor: argonTheme.COLORS.DEFAULT }}>
      <Text color="white" style={{ margin: 5 }}>
        {option}
      </Text>
    </Block>
  );

  const _onSelectSteemOption = (index: number, value: string) => {
    console.log('[_onSelectSteemOption] index, value', index, value);
    switch (index) {
      case 0:
        props.handleTransferPress(false, index);
        break;
      case 1:
        props.handlePowerupPress();
        break;
      case 2:
        break;
      default:
        break;
    }
  };

  const _onSelectPowerOption = (index: number, value: string) => {
    console.log('[_onSelectPowerOption] index, value', index, value);
    switch (index) {
      case 0:
        break;
      case 1:
        break;
      case 2:
        break;
      default:
        break;
    }
  };

  const _onSelectSBDOption = (index: number, value: string) => {
    console.log('[_onSelectSBDOption] index, value', index, value);
    switch (index) {
      case 0:
        props.handleTransferPress(true, index);
        break;
      case 1:
        break;
      case 2:
        break;
      default:
        break;
    }
  };

  const _onSelectSavingsOption = (index: number, value: string) => {
    console.log('[_onSelectSavingOption] index, value', index, value);
    setToastMessage('Not supported yet');
  };

  return (
    props.walletData && (
      <Block>
        <Block
          card
          style={{
            shadowColor: argonTheme.COLORS.FACEBOOK,
            marginHorizontal: 20,
            marginVertical: 5,
            padding: 5,
          }}>
          {props.isUser ? (
            <Block row middle space="between">
              <Text>STEEM</Text>
              <Block row middle>
                <DropdownModal
                  key={steemIndex}
                  options={steemOptions}
                  defaultText={`${balance} STEEM`}
                  dropdownButtonStyle={styles.dropdownButtonStyle}
                  selectedOptionIndex={-1}
                  rowTextStyle={styles.rowTextStyle}
                  style={styles.dropdown}
                  dropdownStyle={styles.dropdownStyle}
                  textStyle={styles.dropdownText}
                  onSelect={_onSelectSteemOption}
                />
              </Block>
            </Block>
          ) : (
            <Block row space="between">
              <Text color={argonTheme.COLORS.FACEBOOK}>STEEM</Text>
              <Text color={argonTheme.COLORS.ERROR}>{`${balance} STEEM`}</Text>
            </Block>
          )}
          {props.isUser ? (
            <Block row middle space="between">
              <Text>STEEM POWER</Text>
              <Block>
                <Block row middle>
                  <DropdownModal
                    key={powerIndex}
                    defaultText={`${power} STEEM`}
                    dropdownButtonStyle={styles.dropdownButtonStyle}
                    selectedOptionIndex={-1}
                    rowTextStyle={styles.rowTextStyle}
                    style={styles.dropdown}
                    dropdownStyle={styles.dropdownStyle}
                    textStyle={styles.dropdownText}
                    options={powerOptions}
                    onSelect={_onSelectPowerOption}
                  />
                </Block>
                <Text>   ({delegatedVestingText} STEEM)</Text>
              </Block>
            </Block>
          ) : (
            <Block>
              <Block row space="between">
                <Text color={argonTheme.COLORS.FACEBOOK}>STEEM POWER</Text>
                <Text color={argonTheme.COLORS.ERROR}>{`${power} STEEM`}</Text>
              </Block>
              <Block right>
                <Text>({delegatedVestingText} STEEM)</Text>
              </Block>
            </Block>

          )}
          {props.isUser ? (
            <Block row middle space="between">
              <Text>STEEM DOLLARS</Text>
              <Block row middle>
                <DropdownModal
                  key={sbdIndex}
                  defaultText={`${balanceSBD}`}
                  dropdownButtonStyle={styles.dropdownButtonStyle}
                  selectedOptionIndex={-1}
                  rowTextStyle={styles.rowTextStyle}
                  style={styles.dropdown}
                  dropdownStyle={styles.dropdownStyle}
                  textStyle={styles.dropdownText}
                  options={sbdOptions}
                  onSelect={_onSelectSBDOption}
                />
              </Block>
            </Block>
          ) : (
            <Block row space="between">
              <Text color={argonTheme.COLORS.FACEBOOK}>STEEM DOLLARS</Text>
              <Text color={argonTheme.COLORS.ERROR}>{`${balanceSBD}`}</Text>
            </Block>
          )}

          <Block row space="between">
            <Text>{intl.formatMessage({ id: 'voting_power' })}</Text>
            <Text>{parseInt(votePower) / 100}%</Text>
          </Block>

          {props.isUser && (
            <Block row space="between">
              <Text>{intl.formatMessage({ id: 'steem_price' })}</Text>
              <Block middle row>
                {price ? <Text>{price.steem.usd.toFixed(3)}</Text> : null}
                {price ? (
                  <Block card style={styles.priceRate}>
                    <Text>{price.steem.change24h.toFixed(3)}%</Text>
                  </Block>
                ) : null}
              </Block>
            </Block>
          )}
          {props.isUser && (
            <Block row space="between">
              <Text>{intl.formatMessage({ id: 'sbd_price' })}</Text>
              <Block middle row>
                {price ? <Text>{price.sbd.usd.toFixed(3)}</Text> : null}
                {price ? (
                  <Block card style={styles.priceRate}>
                    <Text>{price.sbd.change24h.toFixed(3)}%</Text>
                  </Block>
                ) : null}
              </Block>
            </Block>
          )}
        </Block>
        {props.isUser && needToClaim ? (
          <Block center>
            <Text color={argonTheme.COLORS.ERROR}>{rewardText}</Text>
            <Button
              color={argonTheme.COLORS.ERROR}
              onPress={props.handlePressClaim}
              loading={props.claiming}>
              {intl.formatMessage({ id: 'Wallet.claim_reward' })}
            </Button>
          </Block>
        ) : null}
        <Block style={styles.transaction}>
          <FlatList
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            data={transactions}
            refreshing={reloading}
            onRefresh={_onRefresh}
            keyExtractor={(item, index) => index.toString()}
            renderItem={_renderItem}
          />
        </Block>
      </Block>
    )
  );
};

export { WalletStatsView };

const styles = StyleSheet.create({
  transaction: {
    paddingVertical: theme.SIZES.BASE / 3,
  },
  title: {
    paddingTop: theme.SIZES.BASE / 2,
    paddingBottom: theme.SIZES.BASE * 1.5,
  },
  rows: {
    paddingHorizontal: theme.SIZES.BASE,
    marginBottom: theme.SIZES.BASE * 0.3,
  },

  // dropdown
  dropdownText: {
    fontSize: 14,
    paddingLeft: 10,
    paddingHorizontal: 0,
    color: argonTheme.COLORS.ERROR,
  },
  rowTextStyle: {
    fontSize: 14,
    color: 'white',
  },
  dropdownStyle: {
    marginTop: 15,
    minWidth: 150,
    width: 200,
    backgroundColor: argonTheme.COLORS.DEFAULT,
  },
  dropdownButtonStyle: {
    color: argonTheme.COLORS.ERROR,
    width: 180,
    marginRight: 10,
  },
  dropdown: {
    width: 180,
    marginLeft: 10,
  },
  priceRate: {
    backgroundColor: argonTheme.COLORS.INPUT_SUCCESS,
    paddingHorizontal: 5,
    marginHorizontal: 2,
    marginVertical: 3,
  },
});
