//// react
import React, {useState, useEffect, useContext} from 'react';
//// react native
import {StyleSheet, Dimensions, Image, TouchableOpacity} from 'react-native';
//// config
//// language
import {useIntl} from 'react-intl';
//// ui
import {Block, Button, Input, Text, theme, Icon} from 'galio-framework';
import Modal from 'react-native-modal';
import {argonTheme} from '~/constants';
const {width, height} = Dimensions.get('window');
//// coponents

interface Props {
  title: string;
  showModal: boolean;
  username: string;
  balance: string;
  loading: boolean;
  userAvatar: string;
  amount: number;
  amountMessage: string;
  errorMessage: string;
  showConfirm: boolean;
  handleAmountChange: (amount: string) => void;
  handleAmountFocus: () => void;
  onPressProceedButton: () => void;
  hanldePowerup: (amount: number) => void;
  cancelModal: () => void;
}
const PowerupView = (props: Props): JSX.Element => {
  //// props
  const {
    showModal,
    title,
    username,
    balance,
    loading,
    userAvatar,
    amount,
    amountMessage,
    showConfirm,
    errorMessage,
  } = props;
  //// language
  const intl = useIntl();

  const _renderForms = () => {
    return (
      <Block center card>
        <Block center style={{margin: 10}}>
          <Block row center space="between">
            <Text style={styles.text}>
              {intl.formatMessage({id: 'Wallet.from'})}
            </Text>
            <Input
              style={styles.input}
              bgColor="lightgray"
              editable={false}
              defaultValue={username}
              autoCapitalize="none"
              left
              icon="at"
              family="font-awesome"
            />
            <Image
              source={{
                uri: userAvatar || null,
              }}
              style={styles.avatar}
            />
          </Block>
          <Block>
            <Block row center space="between">
              <Text style={styles.text}>
                {intl.formatMessage({id: 'TokenTransfer.amount'})}
              </Text>
              <Block>
                <Input
                  editable={!showConfirm}
                  bgColor={showConfirm ? 'lightgray' : null}
                  right
                  type="number-pad"
                  style={[styles.input, {marginRight: 30}]}
                  defaultValue={amount.toString()}
                  placeholder={intl.formatMessage({
                    id: 'TokenTransfer.amount_placeholder',
                  })}
                  onFocus={props.handleAmountFocus}
                  onChangeText={props.handleAmountChange}
                />
              </Block>
            </Block>
            <TouchableOpacity onPress={() => props.handleAmountChange(balance)}>
              <Text color={argonTheme.COLORS.FACEBOOK} style={{left: 80}}>
                {intl.formatMessage(
                  {id: 'TokenTransfer.steem_balance'},
                  {what: balance},
                )}
              </Text>
            </TouchableOpacity>
            <Text color="red">{amountMessage}</Text>
          </Block>
        </Block>
      </Block>
    );
  };

  const _renderFooter = () => (
    <Block>
      <Block row center>
        <Button
          size="small"
          shadowless
          color={argonTheme.COLORS.ERROR}
          onPress={props.onPressProceedButton}
          loading={loading}>
          {showConfirm || loading
            ? intl.formatMessage({id: 'Powerup.button'})
            : intl.formatMessage({id: 'TokenTransfer.next_button'})}
        </Button>
      </Block>
      <Block center>
        <Text size={16} color="red">
          {errorMessage}
        </Text>
      </Block>
    </Block>
  );

  return (
    <Modal
      isVisible={showModal}
      animationIn="zoomIn"
      animationOut="zoomOut"
      onBackdropPress={props.cancelModal}>
      <Block style={styles.listContainer}>
        <Block center>
          <Text
            h5
            style={{
              borderBottomColor: 'red',
              borderBottomWidth: 5,
              marginBottom: 10,
            }}>
            {title}
          </Text>
        </Block>
        <Text
          style={{
            margin: 3,
          }}>
          {intl.formatMessage({id: 'Powerup.description'})}
        </Text>
        {_renderForms()}
        {_renderFooter()}
      </Block>
    </Modal>
  );
};

export {PowerupView};

const styles = StyleSheet.create({
  modalContainer: {
    width: '100%',
    height: 'auto',
    backgroundColor: theme.COLORS.WHITE,
    paddingVertical: 10,
  },
  listContainer: {
    marginHorizontal: 10,
    backgroundColor: theme.COLORS.WHITE,
    paddingVertical: 10,
  },
  text: {
    width: 70,
    textAlign: 'left',
    marginRight: 10,
  },
  input: {
    width: width * 0.5,
    marginRight: 10,
  },
  autocompleteContainer: {
    flex: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  list: {
    width: '100%',
    paddingHorizontal: theme.SIZES.BASE,
    paddingVertical: theme.SIZES.BASE * 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 24 / 2,
  },
});
