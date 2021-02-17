import React, {useState, useEffect} from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
  Alert,
  Image,
} from 'react-native';
//// react navigation
import {useFocusEffect} from '@react-navigation/native';
import {navigate} from '~/navigation/service';
//// language
import {useIntl} from 'react-intl';
//// ui, styles
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import moment from 'moment';
import {argonTheme} from '~/constants';
//// utils
import {get} from 'lodash';
import {getTimeFromNow} from '~/utils/time';

const BACKGROUND_COLORS = [
  argonTheme.COLORS.BORDER,
  argonTheme.COLORS.SECONDARY,
];

interface Props {
  notifications: any[];
  fetching: boolean;
  username: string;
  imageServer: string;
  handlePressItem: (
    author: string,
    parent_permlink?: string,
    root?: boolean,
  ) => void;
  handleRefresh: () => void;
}
const NotificationScreen = (props: Props): JSX.Element => {
  console.log('[NotificationScreen] props', props);
  const {imageServer, username} = props;
  //// lanugage
  const intl = useIntl();

  //// render item
  const _renderItem = ({item, index}) => {
    const notiType = item.type;
    //// parse message
    const {msg} = item;
    //
    let iconName = '';
    let iconFamily = '';
    let text = '';
    let amount_regex = /\$\d+.\d+/;
    const _match = msg.match(amount_regex);
    let amount = null;
    if (_match) {
      amount = _match[0];
    }
    let actor = msg.split(' ')[0].split('@')[1];
    const avatar = `${imageServer}/u/${actor}/avatar`;
    const parsedUrl = item.url.split('/');
    const author = parsedUrl[0].split('@')[1];
    const permlink = parsedUrl[1];
    switch (notiType) {
      case 'vote':
        iconName = 'chevron-up';
        iconFamily = 'font-awesome';
        text = intl.formatMessage({id: 'Notifications.vote'}, {what: amount});
        break;
      case 'reblog':
        iconName = 'repeat';
        iconFamily = 'material-community';
        text = intl.formatMessage({id: 'Notifications.reblog'});
        break;
      case 'follow':
        iconName = 'adduser';
        iconFamily = 'antdesign';
        text = intl.formatMessage({id: 'Notifications.follow'});
        break;
      case 'reply':
        iconName = 'message-reply-text';
        iconFamily = 'material-community';
        text = intl.formatMessage({id: 'Notifications.reply'});
        break;
      case 'reply_comment':
        iconName = 'message-reply-text';
        iconFamily = 'material-community';
        text = intl.formatMessage({id: 'Notifications.reply_comment'});
        break;
      case 'mention':
        iconName = 'at';
        iconFamily = 'font-awesome';
        text = intl.formatMessage({id: 'Notifications.mention'});
        break;
      case 'transfer':
        iconName = 'exchange';
        iconFamily = 'font-awesome';
        text = intl.formatMessage(
          {id: 'Notifications.transfer'},
          {what: amount},
        );
        break;
      default:
        break;
    }

    return (
      <Block
        flex
        row
        space="between"
        style={{
          marginBottom: 5,
          padding: 5,
          backgroundColor: BACKGROUND_COLORS[index % BACKGROUND_COLORS.length],
        }}>
        <Block row middle>
          <Block left middle with={20}>
            <Icon size={20} name={iconName} family={iconFamily} />
          </Block>
          <Block row middle>
            <TouchableWithoutFeedback
              onPress={() => props.handlePressItem(actor)}>
              <Block center width={100}>
                <Image
                  source={{
                    uri: avatar || null,
                  }}
                  style={styles.avatar}
                />
                {<Text size={10}>{actor}</Text>}
              </Block>
            </TouchableWithoutFeedback>
          </Block>
          <TouchableWithoutFeedback
            onPress={() => props.handlePressItem(author, permlink)}>
            <Block middle>
              <Text>{text}</Text>
            </Block>
          </TouchableWithoutFeedback>
        </Block>
        <Block middle>{<Text>{getTimeFromNow(item.date)}</Text>}</Block>
      </Block>
    );
  };

  return !props.fetching ? (
    <FlatList
      contentContainerStyle={styles.posts}
      data={props.notifications}
      renderItem={_renderItem}
      keyExtractor={(item, index) => String(index)}
      initialNumToRender={20}
      refreshing={false}
      onRefresh={props.handleRefresh}
      showsVerticalScrollIndicator={false}
    />
  ) : (
    <View
      style={{
        position: 'relative',
        paddingVertical: 20,
        marginTop: 10,
        marginBottom: 10,
        borderColor: theme.COLORS.PINK,
      }}>
      <ActivityIndicator color={argonTheme.COLORS.ERROR} size="large" />
    </View>
  );
};

export {NotificationScreen};

const styles = StyleSheet.create({
  posts: {
    width: '100%',
    paddingHorizontal: theme.SIZES.BASE,
    paddingVertical: theme.SIZES.BASE * 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 24 / 2,
  },
  header: {
    backgroundColor: 'green',
  },
  notification: {
    paddingVertical: theme.SIZES.BASE / 3,
  },
  title: {
    paddingTop: theme.SIZES.BASE / 2,
    paddingBottom: theme.SIZES.BASE * 1.5,
  },
  rows: {
    paddingHorizontal: theme.SIZES.BASE,
    marginBottom: theme.SIZES.BASE * 1.25,
  },
  wrapper: {},
  slide1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#9DD6EB',
  },
  slide2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#97CAE5',
  },
  slide3: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#92BBD9',
  },
  text: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
});
