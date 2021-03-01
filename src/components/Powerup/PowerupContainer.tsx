//// react
import React, {useState, useContext, useEffect} from 'react';
//// react native
import {View} from 'react-native';
//// language
import {useIntl} from 'react-intl';
//// blockchain
import {
  transferToVesting,
  TransactionReturnCodes,
} from '~/providers/steem/dsteemApi';
//// context
import {AuthContext, UIContext, SettingsContext} from '~/contexts';
import {AuthorList} from '~/components';

//// views
import {SecureKey} from '~/components';
import {PowerupView} from './PowerupView';
import {KeyTypes} from '~/contexts/types';

interface Props {
  title: string;
  balance: string;
  handleResult: (result: boolean) => void;
}
const PowerupContainer = (props: Props): JSX.Element => {
  //// props
  const {balance} = props;
  //// language
  const intl = useIntl();
  //// contexts
  const {authState} = useContext(AuthContext);
  const {settingsState} = useContext(SettingsContext);
  const {setToastMessage} = useContext(UIContext);
  //// states
  const [showSecureKey, setShowSecureKey] = useState(false);
  const [params, setParams] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [title, setTitle] = useState(props.title);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState(0);
  const [amountMessage, setAmountMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  //////// effects
  useEffect(() => {
    setShowModal(true);
  }, []);

  //// display token modal
  const _displayTokenModal = () => {
    // hide secure key modal
    setShowSecureKey(false);
    // show token modal after some time
    setTimeout(() => {
      // show token modal after some time
      setShowModal(true);
    }, 500);
  };

  //// display secure key modal
  const _displaySecureModal = () => {
    // close token modal
    setShowModal(false);
    // show secure key modal after some time
    setTimeout(() => {
      setShowSecureKey(true);
    }, 500);
  };

  //// handle amount change to transfer
  const _handleAmountChange = (_amount: string) => {
    ////
    if (!showConfirm) {
      if (_amount) setAmount(parseFloat(_amount));
    }
  };

  //// handle the amoutn field focused
  const _handleAmountFocus = () => {
    setAmountMessage('');
  };

  //// check amount
  const _checkAmountValid = () => {
    console.log('_checkSanity. balance, amount', parseFloat(balance), amount);
    // check amount
    if (
      parseFloat(balance) <= 0 ||
      amount <= 0 ||
      amount > parseFloat(balance)
    ) {
      setAmountMessage(
        intl.formatMessage({id: 'TokenTransfer.amount_message'}),
      );
      return false;
    }
    return true;
  };

  //// check sanity
  const _checkSanity = () => {
    // check validty of amount
    if (!_checkAmountValid()) return false;
    return true;
  };

  //// handle press next button, powerup button
  const _onPressProceedButton = () => {
    // in case of before confirming
    if (!showConfirm) {
      // check saity of recipient and amount
      const valid = _checkSanity();
      if (valid) {
        console.log('everything is valid. showConfirm', showConfirm);
        setTitle(intl.formatMessage({id: 'TokenTransfer.confirm_title'}));
        // move on to the confirm view
        setShowConfirm(true);
      } else {
        setErrorMessage(intl.formatMessage({id: 'TokenTransfer.error'}));
      }
    } else {
      // in case of confirming the powerup
      _hanldePowerup(amount);
    }
  };

  ////
  const _hanldePowerup = (amount: number) => {
    const {username, password, type} = authState.currentCredentials;
    // check sanity
    if (!authState.loggedIn || type < 0) return;
    // build transfer params
    const _amount = amount.toFixed(3);
    const _params = {
      amount: _amount + ' STEEM',
    };
    // update state
    setParams(_params);
    // check the key level
    if (type < KeyTypes.ACTIVE) {
      // display secure key modal
      _displaySecureModal();
      return;
    }
    //// good to go
    // transfer
    _transferToVesting(password, _params);
  };

  ////
  const _handleSecureKeyResult = (result: boolean, _password: string) => {
    console.log('_handleSecureKeyResult. result', result);
    if (result) {
      // display token modal
      _displayTokenModal();
      // execute the transfer
      _transferToVesting(_password, params);
      return;
    }
    // show message
    setToastMessage(intl.formatMessage({id: 'TokenTransfer.need_higher_key'}));
  };

  ////
  const _transferToVesting = async (_password: string, _params: any) => {
    console.log('_transferToVesting. param', _params);

    // set loading
    setTransferring(true);
    const {username} = authState.currentCredentials;
    // transfer
    const resultCode = await transferToVesting(username, _password, _params);
    //// show toast message
    // toast message
    let message = '';
    switch (resultCode) {
      case TransactionReturnCodes.INVALID_PASSWORD:
        message = intl.formatMessage({id: 'TokenTransfer.invalid_pass'});
        break;
      case TransactionReturnCodes.NEED_HIGHER_PASSWORD:
        message = intl.formatMessage({id: 'TokenTransfer.need_higher_key'});
        break;
      case TransactionReturnCodes.TRANSACTION_ERROR:
        message = intl.formatMessage({id: 'TokenTransfer.fail'});
        break;
      case TransactionReturnCodes.TRANSACTION_SUCCESS:
        message = intl.formatMessage({id: 'TokenTransfer.success'});
        break;
      default:
        message = intl.formatMessage({id: 'TokenTransfer.error'});
        break;
    }
    // show the message
    setToastMessage(message);

    // clear loading
    setTransferring(false);
    console.log('_hanldeTokenTransfer. resultCode', resultCode);

    // close the token modal
    props.handleResult(true);
  };

  const _handleCancelModal = () => {
    props.handleResult(false);
  };

  const _cancelSecureKey = () => {
    _displayTokenModal();
    // cancel transfer modal, too
    props.handleResult(false);
  };

  return (
    <View>
      <PowerupView
        showModal={showModal}
        username={authState.currentCredentials.username}
        title={props.title}
        balance={balance}
        loading={transferring}
        userAvatar={`${settingsState.blockchains.image}/u/${authState.currentCredentials.username}/avatar`}
        amount={amount}
        amountMessage={amountMessage}
        errorMessage={errorMessage}
        handleAmountChange={_handleAmountChange}
        handleAmountFocus={_handleAmountFocus}
        onPressProceedButton={_onPressProceedButton}
        hanldePowerup={_hanldePowerup}
        showConfirm={showConfirm}
        cancelModal={_handleCancelModal}
      />
      {showSecureKey && (
        <SecureKey
          showModal={showSecureKey}
          username={authState.currentCredentials.username}
          requiredKeyType={KeyTypes.ACTIVE}
          handleResult={_handleSecureKeyResult}
          cancelProcess={_cancelSecureKey}
        />
      )}
    </View>
  );
};

export {PowerupContainer};
