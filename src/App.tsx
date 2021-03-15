/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */
import React, {useEffect, useState, useContext} from 'react';
import {LogBox} from 'react-native';
import {IntlProvider} from 'react-intl';
// code push
import codePush from 'react-native-code-push';
// app screen
import {AppContainer} from './screens/application';
// locales
import {flattenMessages} from './utils/flattenMessages';
import messages from './locales';
//
import AsyncStorage from '@react-native-community/async-storage';
import * as RNLocalize from 'react-native-localize';
// contants
import {SUPPORTED_LOCALES} from '~/locales';
import {StorageSchema} from '~/contexts/types';

// contexts
import {
  AuthProvider,
  PostsProvider,
  UIProvider,
  UserProvider,
  SettingsProvider,
} from './contexts';

LogBox.ignoreLogs(['Require cycles:', 'Require cycle:', 'VirtualizedLists']);

//export default () => {
const App = () => {
  const [locale, setLocale] = useState('en-US');
  //
  useEffect(() => {
    // check update
    _codePushSync();
    // get locale
    _getLocale();
  }, []);

  //// code push
  const _codePushSync = () => {
    codePush.sync({
      installMode: codePush.InstallMode.ON_NEXT_RESTART,
    });
  };

  //// get locale
  const _getLocale = async () => {
    // detect default locale. it can be en-KR or en-JP which does not belong to en-US nor ko-KR.
    let _locale = RNLocalize.getLocales()[0].languageTag;
    // check if there is a preferred language stored in the storage
    let supported = false;
    try {
      // get username first
      let username = await AsyncStorage.getItem(StorageSchema.LOGIN_TOKEN);
      // username exists then get settings from storage
      if (username) {
        // get user settings from storage and parse it
        const _settings = await AsyncStorage.getItem(username);
        // settings exist
        if (_settings) {
          const settings = JSON.parse(_settings);
          console.log('[App] _getLocale. _languages', settings.languages);
          // get the saved locale
          _locale = settings.languages.locale;
          // check if the preferred language is supported by the app
          if (SUPPORTED_LOCALES.find((locale) => locale.locale === _locale)) {
            console.log(
              'the preferred language is supported. preferred langage',
              _locale,
            );
            supported = true;
            // set locale
          }
        }
      }
    } catch (error) {
      console.log('failed to get languages from storage', error);
    }
    // set default locale if not supported
    if (!supported) {
      // set default locale
      _locale = 'en-US';
    }
    console.log('[App] locale', _locale);
    setLocale(_locale);
  };

  return (
    <IntlProvider locale={locale} messages={flattenMessages(messages[locale])}>
      <UIProvider>
        <SettingsProvider>
          <UserProvider>
            <PostsProvider>
              <AuthProvider>
                <AppContainer />
              </AuthProvider>
            </PostsProvider>
          </UserProvider>
        </SettingsProvider>
      </UIProvider>
    </IntlProvider>
  );
};

const codePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_START,
};

export default codePush(codePushOptions)(App);
