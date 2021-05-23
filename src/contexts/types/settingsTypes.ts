import { RPC_SERVERS, IMAGE_SERVERS, BODY_FONT_SIZES } from '~/constants';

//// storage schema
export enum StorageSchema {
  PUSH_NOTIFICATIONS = 'pushNotifications', // push notifications
  DND_TIMES = 'dndTimes', // {start time, end time}
  BLOCKCHAINS = 'blockchains', // rpc server, image server,  blockchain prefix, blockchain id
  SECURITIES = 'securities', // otp, auto login,
  LANGUAGES = 'languages', // menu language (locale, e.g. en-US), translation language (e.g. EN)
  UI = 'ui', // dark theme, font size,
  DRAFT = 'draft', // title, body, tag, beneficiaries
  POSTING_TAGS = 'postingTags', // array of posting tags
  POSTING_TEMPLATE = 'postingTemplate', // posting template, beneficiaries, powerup, ...
  EASTER_EGGS = 'easterEggs', // eater eggs found (true or false)
  BG_PUSH_MESSAGE = 'bgPushMessage', // background push message
  LOGIN_TOKEN = 'loginToken',
}

//// blockchain types
export type BlockchainTypes = {
  rpc: string;
  image?: string;
};

//// securiteies types
export type SecurityTypes = {
  useOTP: boolean;
  useAutoLogin: boolean;
};

//// dnd times types
export type DNDTimeTypes = {
  startTime: number; // timestamp
  endTime: number; //timestamp
};

//// language types
export type LanguageTypes = {
  locale: string;
  translation: string;
};

//// ui types
export type UITypes = {
  nsfw: boolean;
  filterIndex: number;
  tagIndex: number;
  communityIndex: number;
  payoutIndex: number;
  fontIndex?: number;
  votingWeight: number;
};

//// ester eggs
export type EasterEggsTypes = {
  claimACT: boolean;
};

//// draft types
export type DraftTypes = {
  title: string;
  body: string;
  tags: string;
  beneficiaries?: string[];
};

//// posting tags
export type PostingTagsTypes = {
  history: string[];
};

//// posting template types
export type PostingTemplateTypes = {
  title: string;
  body: string;
  tags: string;
  beneficiaries?: string[];
};

// settings state
export interface SettingsState {
  [StorageSchema.PUSH_NOTIFICATIONS]: string[];
  [StorageSchema.BLOCKCHAINS]: BlockchainTypes;
  [StorageSchema.SECURITIES]: SecurityTypes;
  [StorageSchema.DND_TIMES]: DNDTimeTypes;
  [StorageSchema.LANGUAGES]: LanguageTypes;
  [StorageSchema.UI]: UITypes;
  [StorageSchema.EASTER_EGGS]: EasterEggsTypes;
}

// initial post data
export const INITIAL_SETTINGS: SettingsState = {
  [StorageSchema.PUSH_NOTIFICATIONS]: [
    'transfer',
    'beneficiary',
    'reply',
    'mention',
    'follow',
    'reblog',
  ],
  [StorageSchema.BLOCKCHAINS]: {
    rpc: RPC_SERVERS[0],
    image: IMAGE_SERVERS[0],
  },
  [StorageSchema.SECURITIES]: {
    useOTP: false,
    useAutoLogin: true,
  },
  [StorageSchema.LANGUAGES]: {
    locale: 'en-US',
    translation: 'EN',
  },
  [StorageSchema.DND_TIMES]: {
    startTime: new Date(2021, 12, 12, 1, 0, 0).getTime(),
    endTime: new Date(2021, 12, 12, 8, 0, 0).getTime(),
  },
  [StorageSchema.UI]: {
    nsfw: false,
    filterIndex: 0,
    tagIndex: 0,
    communityIndex: 0,
    payoutIndex: 0,
    fontIndex: 1,
    votingWeight: 100,
  },
  [StorageSchema.EASTER_EGGS]: {
    claimACT: false,
  },
};

//// settings action types
export enum SettingsActionTypes {
  SET_ALL_SETTINGS,
  SET_STORAGE_SETTINGS,
  FINALIZE_SETTINGS_TO_STORAGE,
  SET_SCHEMA,
  SET_BLOCKCHAINS,
  SET_SECURITIES,
  SET_LANGUAGES,
  SET_DND_TIMES,
  SET_UI,
  SET_STORAGE,
  //  SET_DRAFT,
}

//// actions
// set all settings
interface SetAllSettingsAction {
  type: SettingsActionTypes.SET_ALL_SETTINGS;
  payload: SettingsState;
}
// set all settings
interface SetStorageSettingsAction {
  type: SettingsActionTypes.SET_STORAGE_SETTINGS;
  payload: SettingsState;
}
// finalize settings to storage
interface FinalizeSettingsToStorageAction {
  type: SettingsActionTypes.FINALIZE_SETTINGS_TO_STORAGE;
}

// set schema
interface SetSchemaAction {
  type: SettingsActionTypes.SET_SCHEMA;
  payload: {
    schema: StorageSchema;
    data: any;
  };
}

// settings context type
export interface SettingsContextType {
  // settings state
  settingsState: SettingsState;
  //// action creators
  // get all settings from storage
  getAllSettingsFromStorage: (username?: string) => Promise<any>;
  //
  getItemFromStorage: (username: string, itemKey: string) => Promise<any>;
  // update a single item in schema
  updateSettingSchema: (
    username: string,
    schema: StorageSchema,
    data: any,
  ) => void;
}

export type SettingsAction =
  | SetAllSettingsAction
  | SetStorageSettingsAction
  | FinalizeSettingsToStorageAction
  | SetSchemaAction;
