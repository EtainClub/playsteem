//// react
import React, { useState, useEffect, useContext } from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
//// language
import { useIntl } from 'react-intl';
//// UIs
import { Block, Icon, Button, Input, Text, theme } from 'galio-framework';
import { argonTheme } from '~/constants/argonTheme';
import { PostData, PostRef, PostsTypes } from '~/contexts/types';
import { Avatar, PostBody, ImageUpload, ActionBar } from '~/components';
import { ActionBarStyleComment } from '~/constants/actionBarTypes';
//// componetns
import { Comment, Editor } from '~/components';
//// utils
import { getTimeFromNow } from '~/utils/time';
const { height, width } = Dimensions.get('window');

// component
interface Props {
  contents: PostData[];
  postRef: string;
  body: string;
  showChildComments: boolean;
  reputation: string;
  handlePressReply: () => void;
  handlePressEditComment: () => void;
  handlePressTranslation: () => void;
  handlePressChildren: () => void;
  handleSubmitComment: (text: string) => Promise<boolean>;
  flagPost: () => void;
}
const CommentView = (props: Props): JSX.Element => {
  //// props
  const comment = props.contents[`${props.postRef}`];
  const { postRef, showChildComments, reputation, body } = props;
  //// language
  const intl = useIntl();

  const formatedTime = comment && getTimeFromNow(comment.state.createdAt);

  return (
    <View style={{ marginTop: 30, marginLeft: 10 }}>
      <Block
        style={{ padding: 5 }}
        card
        shadow
        shadowColor="black"
        key={comment.id}>
        <Block row space="between">
          <Avatar
            account={comment.state.post_ref.author}
            nickname={comment.state.post_ref.author}
            avatar={comment.state.avatar}
            avatarSize={30}
            reputation={reputation.toString().split('.')[0]}
            textSize={12}
            truncate={false}
          />
          <Block row>
            <Text style={{ top: 10, marginRight: 20 }}>{formatedTime}</Text>
            <Icon
              onPress={props.flagPost}
              style={{ margin: 5 }}
              size={16}
              color={argonTheme.COLORS.MUTED}
              name="flag-outline"
              family="ionicon"
            />
          </Block>
        </Block>
        <PostBody body={body} commentDepth={comment.depth} />
        <Block row>
          <ActionBar
            actionBarStyle={ActionBarStyleComment}
            postsType={PostsTypes.FEED}
            postIndex={-1}
            postState={comment.state}
            ttsText={comment.markdownBody}
            handlePressReply={props.handlePressReply}
            handlePressEditComment={props.handlePressEditComment}
            handlePressTranslation={props.handlePressTranslation}
          />
          {comment.children > 0 && (
            <TouchableOpacity onPress={props.handlePressChildren}>
              <Block row style={{ paddingLeft: 5 }}>
                <Icon
                  size={ActionBarStyleComment.iconSize + 5}
                  color={theme.COLORS.FACEBOOK}
                  name="commenting-o"
                  family="font-awesome"
                  style={{ paddingRight: 2 }}
                />
                <Text
                  size={ActionBarStyleComment.textSize + 3}
                  color={theme.COLORS.FACEBOOK}>
                  {comment.children}
                </Text>
              </Block>
            </TouchableOpacity>
          )}
        </Block>
        {showChildComments && comment.replies.map((postRef) => {
          return (
            <Comment
              key={postRef}
              postRef={postRef}
              contents={props.contents}
            />
          );
        })}
      </Block>
    </View>
  );
};

export { CommentView };

const styles = StyleSheet.create({
  commentInput: {
    width: width * 0.8,
    height: theme.SIZES.BASE * 3,
    backgroundColor: theme.COLORS.WHITE,
  },
});
