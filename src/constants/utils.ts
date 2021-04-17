import {Platform, StatusBar, Dimensions} from 'react-native';
import {theme} from 'galio-framework';

const width = Dimensions.get('screen').width;
const height = Dimensions.get('screen').height;

const StatusHeight = StatusBar.currentHeight;
//export const HeaderHeight = (theme.SIZES.BASE * 4 + StatusHeight);
const HeaderHeight = theme.SIZES.BASE * 3.5 + (StatusHeight || 0);
const iPhoneX = () =>
  Platform.OS === 'ios' && (height === 812 || width === 812);

export {StatusHeight, HeaderHeight, iPhoneX};

export const POST_TITLE_LENGTH = 45;
export const LIST_TITLE_LENGTH = 30;
export const MIN_EDITOR_HEIGHT = 50;
export const MAX_ACTIVE_VOTERS = 20;
export const MAX_TAGS_HISTORY = 10;
export const THRESHOLD_EASTER_CLICKS = 8;

export const BODY_FONT_SIZES = [
  {size: '12', name: 'S'},
  {size: '16', name: 'M'},
  {size: '20', name: 'L'},
  {size: '24', name: 'XL'},
];
