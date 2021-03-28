//// react
import React, {useEffect, useContext, useState} from 'react';
//// react native
import {Platform} from 'react-native';
// config
import Config from 'react-native-config';
//
import axios from 'axios';
//// firebase
import {firebase} from '@react-native-firebase/functions';
import AsyncStorage from '@react-native-community/async-storage';
import {
  AuthContext,
  UserContext,
  PostsContext,
  UIContext,
  SettingsContext,
} from '~/contexts';
//// constant
import {TRANSLATION_LANGUAGES} from '~/constants';
//// notification
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
// firebase messaging types
type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;
import {navigate} from '~/navigation/service';
import {PostsTypes, StorageSchema} from '~/contexts/types';
import {SettingUITypes} from '~/screens/settings';

export const ResolveAuth = (props) => {
  //// props
  console.log('ResolveAuth. props', props);
  //// contexts
  const {authState, setAuthResolved, getCredentials} = useContext(AuthContext)!;
  const {
    fetchBlockchainGlobalProps,
    getFollowings,
    getUserProfileData,
  } = useContext(UserContext);
  const {getTagList, fetchPosts, setPostRef} = useContext(PostsContext);
  const {
    setToastMessage,
    setTranslateLanguages,
    initTTS,
    setAuthorParam,
  } = useContext(UIContext);
  const {settingsState, getAllSettingsFromStorage} = useContext(
    SettingsContext,
  );
  // state
  const [fetched, setFetched] = useState(false);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    _resolveEntry();
  }, []);

  useEffect(() => {
    if (fetched) {
      //
      //      fetchBlockchainGlobalProps(username);
      setAuthResolved(true);
      // TODO is this not necessary, why?
      navigate({name: 'Drawer'});
    }
  }, [fetched]);

  //// resolve auth
  const _resolveEntry = async () => {
    // get user login token from storage
    let username = await AsyncStorage.getItem(StorageSchema.LOGIN_TOKEN);
    // fetch global props
    fetchBlockchainGlobalProps();
    // get supported translation languages
    const languages = TRANSLATION_LANGUAGES;
    // const languages = await _getSupportedLanguages();
    // set languages
    setTranslateLanguages(languages);
    // initialize tts
    initTTS(settingsState.languages.locale);
    // set category to feed if username exists
    if (username) {
      // get settings from storage
      await getAllSettingsFromStorage(username);
      console.log('[resolveAuth] username', username);
      try {
        // // get user profile
        // const profileData = await getUserProfileData(username);
        // console.log('[resolveAuth] profile data', profileData);
        // get followings
        const followings = await getFollowings(username);
        // fetch initial posts
        // TODO: check if it is ok to remove await here
        fetchPosts(
          PostsTypes.FEED,
          0,
          0,
          username,
          followings.length === 0 ? true : false,
          false,
        );

        // TODO: cannot navigate to the postdetails.. because it is not mounted at this time.
        // handle background message
        // await _handleBGPushMessage();

        // why this???
        if (!followings) navigate({name: 'Drawer'});
        // fetch tags
        getTagList(username);
      } catch (error) {
        console.log('failed to fetch initial info (followings, tags)', error);
        setToastMessage('The server is down, Choose another in the settings');
        navigate({name: 'Drawer'});
      }
      console.log('[resolveAuth] after get tag list');
      // set username
      setUsername(username);
      // retrieve all credentials
      await getCredentials(username);
      // set fetched flag
      setFetched(true);
    } else {
      // fetch tags
      await getTagList(username);
      // @test
      //navigate({name: 'Drawer'});
      navigate({name: 'Welcome'});
    }
  };

  //// handle background push message
  const _handleBGPushMessage = async () => {
    // check if background push message exists
    const _message = await AsyncStorage.getItem(
      StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage',
    );
    if (_message) {
      // parse the message
      const bgPushMessage = JSON.parse(_message);
      console.log('_handleBgPushMessage', bgPushMessage);
      // remove the bg message
      await AsyncStorage.removeItem(
        StorageSchema.BG_PUSH_MESSAGE || 'bgPushMessage',
      );

      //// handle push notification messages
      // get notification data
      const msgData = bgPushMessage.data;
      // sanity check
      if (!msgData) {
        console.log('remote messgage data is undefined');
        return;
      }
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
      // navigate
      //      navigate({name: route});
      props.navigation.navigate('Drawer', {screen: 'PostDetails'});
    }
  };

  //// use proxy function to get supported translation languages
  const _getSupportedLanguages = async () => {
    try {
      const result = await firebase
        .functions()
        .httpsCallable('getTranslationLanguagesRequest')();

      console.log('resolveAuth supported language. result', result);
      return result.data.map((language) => language.language.toUpperCase());
    } catch (error) {
      console.log('failed to get translate languages', error);
      return null;
    }
  };

  return null;
};
