//// react
import React, {useState, useEffect, useContext} from 'react';
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
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
//// language
import {useIntl} from 'react-intl';
//// UIs
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import {argonTheme} from '~/constants/argonTheme';
import {CommentData, PostRef, PostsTypes} from '~/contexts/types';
import {Avatar, PostBody, ImageUpload, ActionBar} from '~/components';
import {ActionBarStyleComment} from '~/constants/actionBarTypes';
//// componetns
import {Comments} from '~/components/Comments';
import {Editor} from '~/components';
import {CommentContainer} from './CommentContainer';
//// utils
import {getTimeFromNow} from '~/utils/time';
const {height, width} = Dimensions.get('window');

// component
interface Props {
  comment: CommentData;
  showChildComments: boolean;
  handlePressReply: () => void;
  handlePressEditComment: () => void;
  handlePressTranslation: () => void;
  handlePressSpeak: () => void;
  handlePressChildren: () => void;
  handleSubmitComment: (text: string) => Promise<boolean>;
  //  handleSubmitComment: (message: string) => void;
  //  updateComment: () => void;
}
const CommentView = (props: Props): JSX.Element => {
  //// props
  const {comment, showChildComments} = props;
  //// language
  const intl = useIntl();
  //// state
  // const [showChildComments, setShowChildComments] = useState(
  //   props.showChildComments || false,
  // );

  const formatedTime = comment && getTimeFromNow(comment.state.createdAt);

  // const _handlePressChildren = () => {
  //   // toggle
  //   setShowChildComments(!showChildComments);
  // };

  return (
    <View style={{marginTop: 30, marginLeft: 10}}>
      <Block
        style={{padding: 5}}
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
            textSize={12}
            truncate={false}
          />
          <Text style={{top: 10, marginRight: 20}}>{formatedTime}</Text>
        </Block>
        <PostBody body={comment.body} commentDepth={comment.depth} />
        <Block row>
          <ActionBar
            actionBarStyle={ActionBarStyleComment}
            postsType={PostsTypes.FEED}
            postIndex={-1}
            postState={comment.state}
            handlePressReply={props.handlePressReply}
            handlePressEditComment={props.handlePressEditComment}
            handlePressTranslation={props.handlePressTranslation}
            handlePressSpeak={props.handlePressSpeak}
          />
          {comment.children > 0 && (
            <TouchableWithoutFeedback onPress={props.handlePressChildren}>
              <Block row style={{paddingRight: 10}}>
                <Icon
                  size={ActionBarStyleComment.iconSize}
                  color={theme.COLORS.MUTED}
                  name="commenting-o"
                  family="font-awesome"
                  style={{paddingRight: 2}}
                />
                <Text size={ActionBarStyleComment.textSize}>
                  {comment.children}
                </Text>
              </Block>
            </TouchableWithoutFeedback>
          )}
        </Block>
        {showChildComments && comment.children > 0 && (
          <Comments postRef={comment.state.post_ref} />
        )}
      </Block>
    </View>
  );
};

export {CommentView};

const styles = StyleSheet.create({
  commentInput: {
    width: width * 0.8,
    height: theme.SIZES.BASE * 3,
    backgroundColor: theme.COLORS.WHITE,
  },
});

// //// react
// import React, {useState, useEffect, useContext} from 'react';
// //// react native
// import {
//   View,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   ActivityIndicator,
//   Animated,
//   Alert,
//   Image,
//   TouchableWithoutFeedback,
//   ScrollView,
// } from 'react-native';
// //// language
// import {useIntl} from 'react-intl';
// //// UIs
// import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
// import {argonTheme} from '~/constants/argonTheme';
// import {
//   PostData,
//   CommentData,
//   PostingContent,
//   PostsTypes,
// } from '~/contexts/types';
// import {Avatar, PostBody, ImageUpload, ActionBar} from '~/components';
// import {ActionBarStyleComment} from '~/constants/actionBarTypes';
// //// componetns
// import {Editor} from '~/components';
// import {CommentContainer} from './CommentContainer';
// //// utils
// import {getTimeFromNow} from '~/utils/time';
// const {height, width} = Dimensions.get('window');

// // component
// interface Props {
//   comment: CommentData;
//   body: string;
//   username?: string;
//   index: number;
//   postIndex: number;
//   postsType: PostsTypes;
//   childComments?: any[];
//   handlePressReply: () => void;
//   handlePressEditComment: () => void;
//   handlePressTranslation: () => void;
//   handlePressSpeak: () => void;
//   handleSubmitComment: (text: string) => Promise<boolean>;
//   handlePressChildren: () => void;
//   fetchComments: () => void;
//   //  handleSubmitComment: (message: string) => void;
//   //  updateComment: () => void;
// }
// const CommentView = (props: Props): JSX.Element => {
//   //// props
//   const {comment, body, postsType, postIndex, childComments} = props;
//   console.log('child comments', childComments);
//   //// language
//   const intl = useIntl();

//   const formatedTime = comment && getTimeFromNow(comment.state.createdAt);

//   return (
//     <View
//       style={
//         props.index === 0
//           ? {marginTop: 30}
//           : {marginLeft: 25, marginTop: 30, marginRight: 5}
//       }>
//       <Block
//         style={{padding: 5}}
//         card
//         shadow
//         shadowColor="black"
//         key={comment.id}>
//         <Block row space="between">
//           <Avatar
//             account={comment.state.post_ref.author}
//             nickname={comment.state.post_ref.author}
//             avatar={comment.state.avatar}
//             avatarSize={30}
//             textSize={12}
//             truncate={false}
//           />
//           <Text style={{top: 10, marginRight: 20}}>{formatedTime}</Text>
//         </Block>
//         <PostBody body={body} commentDepth={comment.depth} />
//         <Block row>
//           <ActionBar
//             actionBarStyle={ActionBarStyleComment}
//             postsType={postsType}
//             postIndex={postIndex}
//             postState={comment.state}
//             handlePressReply={props.handlePressReply}
//             handlePressEditComment={props.handlePressEditComment}
//             handlePressTranslation={props.handlePressTranslation}
//             handlePressSpeak={props.handlePressSpeak}
//           />
//           {comment.children > 0 && (
//             <TouchableWithoutFeedback onPress={props.handlePressChildren}>
//               <Block row style={{paddingRight: 10}}>
//                 <Icon
//                   size={ActionBarStyleComment.iconSize}
//                   color={theme.COLORS.MUTED}
//                   name="commenting-o"
//                   family="font-awesome"
//                   style={{paddingRight: 2}}
//                 />
//                 <Text size={ActionBarStyleComment.textSize}>
//                   {comment.children}
//                 </Text>
//               </Block>
//             </TouchableWithoutFeedback>
//           )}
//         </Block>
//       </Block>

//       {childComments.map((comment, index) => {
//         return (
//           <CommentContainer
//             key={comment.id}
//             postIndex={props.index}
//             comment={comment}
//             index={0}
//             fetchComments={props.fetchComments}
//           />
//         );
//       })}
//     </View>
//   );
// };

// export {CommentView};

// const styles = StyleSheet.create({
//   commentInput: {
//     width: width * 0.8,
//     height: theme.SIZES.BASE * 3,
//     backgroundColor: theme.COLORS.WHITE,
//   },
// });
