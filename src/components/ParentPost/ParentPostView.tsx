//// react
import React, {useState, useEffect, useContext, useCallback} from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
//// react navigation
import {useFocusEffect} from '@react-navigation/native';
import {navigate} from '~/navigation/service';
//// language
import {useIntl} from 'react-intl';
import {getCharacterLength} from '~/utils/strings';
import {substr_utf8_bytes} from '~/utils/strings';
const runes = require('runes');

//// ui, styles
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import {argonTheme} from '~/constants/argonTheme';
const {width, height} = Dimensions.get('screen');
//// contexts
import {PostsContext, AuthContext, UIContext} from '~/contexts';
import {PostData, PostRef, PostsTypes} from '~/contexts/types';
//// etc

//// props
interface Props {
  post: PostData;
}
const ParentPostView = (props: Props): JSX.Element => {
  //// props
  const {post} = props;
  //  console.log('[ParentPostView] post', post);
  //// language
  const intl = useIntl();
  //// contexts
  const {setPostRef, setPostDetails} = useContext(PostsContext);
  //// states
  const [hideHeader, setHideHeader] = useState(false);

  const _handlePressButton = () => {
    // set post ref
    setPostRef(post.state.post_ref);
    // set post data to context
    setPostDetails(post);
    // navigate
    navigate({name: 'PostDetails'});
  };

  return hideHeader ? (
    <Block right>
      <Icon
        onPress={() => setHideHeader(!hideHeader)}
        size={20}
        name="caretdown"
        family="antdesign"
      />
    </Block>
  ) : (
    <Block row>
      <Block
        card
        center
        style={{
          shadowColor: argonTheme.COLORS.FACEBOOK,
          marginHorizontal: 5,
          marginVertical: 3,
          padding: 3,
        }}>
        {/* <Text>{intl.formatMessage({id: 'ParentPost.info'})}</Text> */}
        <Text size={14} color="blue" bold>
          {post.state.title}
        </Text>
        <Button
          onPress={_handlePressButton}
          color={argonTheme.COLORS.STEEM}
          size="small">
          {intl.formatMessage({id: 'ParentPost.parent_button'})}
        </Button>
      </Block>
      <Block center>
        <Icon
          onPress={() => setHideHeader(!hideHeader)}
          size={20}
          name="caretup"
          family="antdesign"
        />
      </Block>
    </Block>
  );
};

export {ParentPostView};
