//// react
import React, { useContext, useEffect } from 'react';
//// react native
import { Platform, BackHandler, Alert, Linking, AppState } from 'react-native';
//// language
import { useIntl } from 'react-intl';
//// notification
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import { navigate } from '~/navigation/service';

//// contexts
import { PostsContext, UIContext } from '~/contexts';
import { ApplicationScreen } from '../screen/Application';

// firebase messaging types
type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

// push operation types
import { SettingUITypes } from '~/screens/settings';
import AsyncStorage from '@react-native-community/async-storage';

import { StorageSchema } from '~/contexts/types';

// set background notification listener
messaging().setBackgroundMessageHandler(async (message: RemoteMessage) => {
  console.log('[PlaySteem] bgMsgListener, message', message);
  // // save the message in storage
  // const bgPushMessage = JSON.stringify(message);
  // if (bgPushMessage)
  //   await AsyncStorage.setItem(
  //     StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage',
  //     bgPushMessage,
  //   );
});

let firebaseOnNotificationOpenedAppListener = null;

interface Props { }

export const AppContainer = (props: Props): JSX.Element => {
  //// language
  const intl = useIntl();
  //// contexts
  const { setPostRef, setPostDetails } = useContext(PostsContext);
  const { uiState, setToastMessage, setAuthorParam } = useContext(UIContext);

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
      handleRemoteMessages(message, false);
    });

    // background notifications open handler
    firebaseOnNotificationOpenedAppListener = messaging().onNotificationOpenedApp(
      (message) => {
        console.log('[Background] Notification Open Listener', message);
        if (message) handleRemoteMessages(message, true);
      },
    );

    // app closed notification open listener
    (async () =>
      await messaging()
        .getInitialNotification()
        .then(async (message) => {
          console.log('[App Closed] Notification Open Listener', message);

          //// handle duplicated message
          // get message id from storage
          const prevMmessageId = await AsyncStorage.getItem('messageId');
          if (prevMmessageId) {
            // set message id to storage
            await AsyncStorage.setItem('messageId', message.messageId);
            // check duplication
            if (message.messageId === prevMmessageId) {
              console.log('the message is duplicated');
              return;
            }
          }

          // handle the message
          if (message) handleRemoteMessages(message, false);
        }))();

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

  //// not used
  const _handleBgPushMessage = async () => {
    // // check if background push message exists
    const _message = await AsyncStorage.getItem(
      StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage',
    );
    if (_message) {
      // handle
      const bgPushMessage = JSON.parse(_message);
      console.log('_handleBgPushMessage', bgPushMessage);
      // remove the bg message
      await AsyncStorage.removeItem(
        StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage',
      );
      // navigate
      // TODO: how much time is required??? move this to the resolve auth?
      setTimeout(() => {
        console.log('timeout. now navigate');
        // show alert dialog
        handleRemoteMessages(bgPushMessage, false);
      }, 3000);
    }
  };

  // handle push notification messages
  const handleRemoteMessages = async (
    message: RemoteMessage,
    background: boolean,
  ) => {
    console.log('handleRemoteMessages. message', message);

    // remove app-closed message in storage
    //    AsyncStorage.removeItem(StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage');

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
    const { operation, author, permlink, body } = msgData;
    let route = null;
    switch (operation) {
      // navigate to the post details
      case SettingUITypes.BENEFICIARY:
      case SettingUITypes.MENTION:
      case SettingUITypes.REBLOG:
      case SettingUITypes.REPLY:
      case SettingUITypes.VOTE:
        //// navigate
        // clear post details
        setPostDetails(null);
        // set route name
        route = 'PostDetails';
        // set post ref to the context only for background message
        // when the app is in post details, this caused fetching post in postDetails
        if (background)
          setPostRef({ author, permlink });
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
      console.log('bg push');
      navigate({ name: route });
    } else {
      console.log('fg push');
      // handle foreground message
      Alert.alert(
        intl.formatMessage({ id: 'App.push_title' }),
        intl.formatMessage({ id: 'App.push_body' }, { what: body }),
        [
          { text: intl.formatMessage({ id: 'no' }), style: 'cancel' },
          {
            text: intl.formatMessage({ id: 'yes' }),
            onPress: () => {
              setPostRef({ author, permlink });
              console.log('yes. pressed');
              navigate({ name: route });
            },
          },
        ],
        { cancelable: true },
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
