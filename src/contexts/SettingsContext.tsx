//// react
import React, {useReducer, createContext, useContext} from 'react';
//// language
import {useIntl} from 'react-intl';
//// storage
import AsyncStorage from '@react-native-community/async-storage';
////
import {size} from 'lodash';

import {
  SettingsActionTypes,
  INITIAL_SETTINGS,
  SettingsState,
  SettingsContextType,
  SettingsAction,
  StorageSchema,
  DNDTimeTypes,
  BlockchainTypes,
  SecurityTypes,
  LanguageTypes,
  UITypes,
} from './types';
import {UIContext} from '~/contexts';

//// initial settings state
const initialState = INITIAL_SETTINGS;

// create settings context
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

// settings reducer
const settingsReducer = (state: SettingsState, action: SettingsAction) => {
  switch (action.type) {
    case SettingsActionTypes.SET_ALL_SETTINGS:
      return action.payload;
    case SettingsActionTypes.FINALIZE_SETTINGS_TO_STORAGE:
      return {...state, existInStorage: true};
    case SettingsActionTypes.SET_SCHEMA:
      return {...state, [action.payload.schema]: action.payload.data};
    default:
      return state;
  }
};

type Props = {
  children: React.ReactNode;
};
const SettingsProvider = ({children}: Props) => {
  // useReducer hook
  const [settingsState, dispatch] = useReducer(settingsReducer, initialState);
  console.log('[SettingsProvider] state', settingsState);
  //// language
  const intl = useIntl();
  //// contexts
  const {setToastMessage} = useContext(UIContext);

  //////// action creators

  //// get a single item from storage
  const getItemFromStorage = async (username: string, itemKey: string) => {
    const _settings = await _getUserSettingsFromStorage(username);
    if (_settings) {
      const data = JSON.parse(_settings);
      return data[itemKey];
    }
    setToastMessage(intl.formatMessage({id: 'storage_error'}));
    return null;
  };

  //// update setting schema, save the new state to storage
  const updateSettingSchema = async (
    username: string,
    schema: StorageSchema,
    data: any,
  ) => {
    if (data) {
      console.log(
        '[updateSettingSchema] username, schema, data',
        username,
        schema,
        data,
      );
      // build new settings
      const newSettings = {...settingsState, [schema]: data};

      // dispatch action: save the new settings state
      dispatch({
        type: SettingsActionTypes.SET_ALL_SETTINGS,
        payload: newSettings,
      });
      // save the state to storage
      try {
        await _setItemToStorage(username, newSettings);
        return true;
      } catch (error) {
        console.log('failed to set state to storage', error);
        return false;
      }
    }
    return false;
  };

  //// get all settings from storage
  const getAllSettingsFromStorage = async (username?: string) => {
    // get user's settings from storage
    let _settings = await _getUserSettingsFromStorage(username);
    console.log(
      '[getAllSettingsFromStorage] username, _settings',
      username,
      _settings,
      size(_settings),
    );

    console.log(
      '[getAllSettingsFromStorage] settingsState',
      settingsState,
      size(settingsState),
    );

    // check if this includes the recent setings
    if (size(_settings) !== size(settingsState)) {
      // initialize the storage with the default values
      _settings = settingsState;
      // set settings to storage
      if (username) await _setUserSettingsToStorage(username, _settings);
      return;
    }

    // use default settings if nothing in storage
    if (!_settings) {
      _settings = settingsState;

      // set settings to storage
      if (username) await _setUserSettingsToStorage(username, _settings);
    } else {
      // dispatch actions: set settings state using the storage values
      console.log('[getAllSettingsFromStorage] _settings', _settings);
      dispatch({
        type: SettingsActionTypes.SET_ALL_SETTINGS,
        payload: _settings as SettingsState,
      });
    }
    return _settings;
  };

  return (
    <SettingsContext.Provider
      value={{
        settingsState,
        getAllSettingsFromStorage,
        getItemFromStorage,
        updateSettingSchema,
      }}>
      {children}
    </SettingsContext.Provider>
  );
};

////// storage helper functions

//// get user's all settings from storage
const _getUserSettingsFromStorage = async (username: string) => {
  try {
    // @test
    // await AsyncStorage.removeItem(username);
    // return;

    const _settings = await AsyncStorage.getItem(username);
    // parse
    return JSON.parse(_settings);
  } catch (error) {
    console.log('failed to get settings from MMKV srorage', error);
    return null;
  }
};

//// set settings of a user to storage
const _setUserSettingsToStorage = async (username: string, _settings: any) => {
  try {
    await AsyncStorage.setItem(username, JSON.stringify(_settings));
    return true;
  } catch (error) {
    console.log('failed to set user settings to storage', error);
    return false;
  }
};

//// set a single item or schema to storage
const _setItemToStorage = async (key: string, data: any) => {
  if (data) {
    console.log('_setItemToStorage. key, data', key, data);
    // stringify the data
    const dataString = JSON.stringify(data);
    await AsyncStorage.setItem(key, dataString);
    return true;
  }
  return false;
};

export {SettingsContext, SettingsProvider};
