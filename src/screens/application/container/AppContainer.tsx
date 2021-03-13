//// react
import React, {useContext, useEffect} from 'react';
//// react native
import {Platform, BackHandler, Alert, Linking, AppState} from 'react-native';
//// language
import {useIntl} from 'react-intl';
//// notification
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import {navigate} from '~/navigation/service';

//// contexts
import {PostsContext, UIContext} from '~/contexts';
import {ApplicationScreen} from '../screen/Application';

// firebase messaging types
type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

// push operation types
import {SettingUITypes} from '~/screens/settings';
import AsyncStorage from '@react-native-community/async-storage';

import {StorageSchema} from '~/contexts/types';

// set background notification listener
messaging().setBackgroundMessageHandler(async (message: RemoteMessage) => {
  console.log('[PlaySteem] bgMsgListener, message', message);
  // save the message in storage
  const bgPushMessage = JSON.stringify(message);
  await AsyncStorage.setItem(StorageSchema.BG_PUSH_MESSAGE, bgPushMessage);
});

let firebaseOnNotificationOpenedAppListener = null;

interface Props {}

export const AppContainer = (props: Props): JSX.Element => {
  //// language
  const intl = useIntl();
  //// contexts
  const {setPostRef} = useContext(PostsContext);
  const {uiState, setToastMessage, setAuthorParam} = useContext(UIContext);

  useEffect(() => {
    //// setup push notification listener
    // request permission
    (async () => await messaging().requestPermission())();
    console.log('_setupNotificationListeners, got permission');
    // clear app badge number
    PushNotification.setApplicationIconBadgeNumber(0);
    // cancel all local notifications
    PushNotification.cancelAllLocalNotifications();
    // set foreground notification listener
    const fgMsgListener = messaging().onMessage((message: RemoteMessage) => {
      console.log('[Foreground] Notification Listener', message);
      console.log('[App Closed] Notification Listener');
      handleRemoteMessages(message, false);
    });

    // background notifications open handler
    firebaseOnNotificationOpenedAppListener = messaging().onNotificationOpenedApp(
      (message) => {
        console.log('[Background] Notification Listener', message);
        if (message) handleRemoteMessages(message, true);
      },
    );

    // app closed notification listener
    // (async () =>
    //   await messaging()
    //     .getInitialNotification()
    //     .then((message) => {
    //       console.log('[App Closed] Notification Listener', message);
    //       if (message) _handleRemoteMessages(message, true);
    //     }))();

    return () => {
      if (__DEV__) console.log('unsubscribe notification listener');
      // unsubscribe foreground listener
      fgMsgListener();
      // unsubscribe background listener
      if (firebaseOnNotificationOpenedAppListener) {
        firebaseOnNotificationOpenedAppListener();
      }
    };
  }, []);

  //// event: navigation is ready
  useEffect(() => {
    if (navigate) {
      console.log('');
    }
  }, [navigate]);

  ////
  const _handleBgPushMessage = async () => {
    // // check if background push message exists
    const _message = await AsyncStorage.getItem(StorageSchema.BG_PUSH_MESSAGE);
    if (_message) {
      // handle
      const bgPushMessage = JSON.parse(_message);
      console.log('_handleBgPushMessage', bgPushMessage);
      // remove the bg message
      await AsyncStorage.removeItem(StorageSchema.BG_PUSH_MESSAGE);
      // navigate
      // TODO: how much time is required??? move this to the resolve auth?
      setTimeout(() => {
        console.log('timeout. now navigate');
        handleRemoteMessages(bgPushMessage, true);
      }, 1500);
    }
  };

  // handle push notification messages
  const handleRemoteMessages = (
    message: RemoteMessage,
    background: boolean,
  ): void => {
    console.log('handleRemoteMessages. message', message);

    // get notification data
    const msgData = message.data;
    // sanity check
    if (!msgData) {
      console.log('remote messgage data is undefined');
      return;
    }
    // get message tyep
    //    const msgType = msgData.type;
    // @test
    // TODO: handle the foreground message. show modal
    console.log('remote message data', msgData);
    const {operation, author, permlink, body} = msgData;
    let route = null;
    switch (operation) {
      // navigate to the post details
      case SettingUITypes.BENEFICIARY:
      case SettingUITypes.MENTION:
      case SettingUITypes.REBLOG:
      case SettingUITypes.REPLY:
      case SettingUITypes.VOTE:
        //// navigate
        // set route name
        route = 'PostDetails';
        // set post ref to the context
        setPostRef({author, permlink});
        break;
      case SettingUITypes.FOLLOW:
        //// navigate to the author profile
        // set route name
        route = 'AuthorProfile';
        // set author to the context
        setAuthorParam(author);
        // navigate
        break;
      case SettingUITypes.TRANSFER:
        //// navigate to the wallet
        // set route name
        route = 'Wallet';
        break;
      default:
        break;
    }
    // no navigation if route is null
    if (!route) return;
    // navigate if the app is in background
    if (background) {
      navigate({name: route});
    } else {
      // handle foreground message
      Alert.alert(
        intl.formatMessage({id: 'App.push_title'}),
        intl.formatMessage({id: 'App.push_body'}, {what: body}),
        [
          {text: intl.formatMessage({id: 'no'}), style: 'cancel'},
          {
            text: intl.formatMessage({id: 'yes'}),
            onPress: () => navigate({name: route}),
          },
        ],
        {cancelable: true},
      );
    }
  };

  // clear toast message
  const _clearMessage = () => {
    setToastMessage('');
  };

  return (
    <ApplicationScreen
      toastMessage={uiState.toastMessage}
      clearMessage={_clearMessage}
      handleBgPushMessage={_handleBgPushMessage}
    />
  );
};
