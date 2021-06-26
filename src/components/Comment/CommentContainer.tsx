//// react
import React, { useState, useEffect, useContext } from 'react';
//// react native
import { View, Dimensions } from 'react-native';
//// language
import { useIntl } from 'react-intl';
//// firebase
import { firebase } from '@react-native-firebase/functions';
// steem api
import { fetchComments } from '~/providers/steem/dsteemApi';
//// UIs
//// contexts
import {
  AuthContext,
  UIContext,
  PostsContext,
  SettingsContext,
} from '~/contexts';
//// componetns
import { Editor } from '~/components';
import { PostData, PostingContent, PostsTypes } from '~/contexts/types';
//// utils
import { generateCommentPermlink, createPatch } from '~/utils/editor';
import { getTimeFromNow } from '~/utils/time';
import {
  extractMetadata,
  generatePermlink,
  makeJsonMetadata,
} from '~/utils/editor';
const { height, width } = Dimensions.get('window');
//// view
import { CommentView } from './CommentView';

// component
interface Props {
  postRef: string;
  contents: PostData[];
}

const CommentContainer = (props: Props): JSX.Element => {
  //// props
  const _comment = props.contents[`${props.postRef}`];
  //// language
  const intl = useIntl();
  //// contexts
  const { authState } = useContext(AuthContext);
  const { setToastMessage, speakBody } = useContext(UIContext);
  const { postsState, submitPost, flagPost, updatePost } = useContext(
    PostsContext,
  );
  const { settingsState } = useContext(SettingsContext);
  //// stats
  const [comment, setComment] = useState(_comment);
  const [submitting, setSubmitting] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // reply text
  const [replyText, setReplyText] = useState('');
  const [body, setBody] = useState(comment.body);
  const [showOriginal, setShowOriginal] = useState(true);
  const [originalBody, setOriginalBody] = useState(comment.body);
  const [translatedBody, setTranslatedBody] = useState(null);
  const [showChildComments, setShowChildComments] = useState(false);

  const formatedTime =
    comment && getTimeFromNow(comment.state.createdAt);

  const _handleSubmitComment = async (_text: string) => {
    // check sanity
    if (_text === '') return false;

    // set submitted flag
    setSubmitting(true);
    const { username } = authState.currentCredentials;
    // extract meta
    const _meta = extractMetadata(_text);
    // split tags by space
    const _tags = [];
    const jsonMeta = makeJsonMetadata(_meta, _tags);

    // build posting content for a new comment
    const postingContent: PostingContent = {
      author: username,
      title: '',
      body: _text,
      parent_author: comment.state.post_ref.author,
      parent_permlink: comment.state.post_ref.permlink,
      json_metadata: JSON.stringify(jsonMeta) || '',
      permlink: generateCommentPermlink(username),
    };

    // update the body with patch if it is edit mode
    if (editMode) {
      //      const patch = createPatch(comment.body, replyText);
      postingContent.parent_author = comment.state.parent_ref.author;
      postingContent.parent_permlink = comment.state.parent_ref.permlink;
      postingContent.permlink = comment.state.post_ref.permlink;
    }
    // submit the comment
    const result = await submitPost(
      postingContent,
      authState.currentCredentials.password,
      true,
    );

    // clear submitted flag
    setSubmitting(false);
    // close reply form
    setShowReply(false);
    setEditMode(false);
    if (result) return true;
    return false;
  };

  const _handlePressReply = () => {
    // clear reply form
    setShowReply(!showReply);
  };

  const _handlePressEditComment = () => {
    console.log('_handlePressEditComment. markdown body', comment.markdownBody);
    setEditMode(true);
    // set markdown format to body
    setBody(comment.markdownBody);
  };

  const _handlePressTranslation = async () => {
    console.log('[Comment|_handlePressTranslation]');

    if (!authState.loggedIn) {
      console.log('you need to log in to translate a post');
      setToastMessage(intl.formatMessage({ id: 'PostDetails.need_login' }));
      return;
    }
    const _showOriginal = !showOriginal;
    setShowOriginal(_showOriginal);
    if (_showOriginal) {
      console.log('show original. body', originalBody);
      // set original comment
      setBody(originalBody);
      return;
    }
    // if translation exists, use it
    if (translatedBody) {
      console.log('translation exists');
      setBody(translatedBody);
      return;
    }
    const targetLang = settingsState.languages.translation;
    const bodyOptions = {
      targetLang: targetLang,
      text: body,
      format: 'html',
    };

    try {
      const bodyTranslation = await firebase
        .functions()
        .httpsCallable('translationRequest')(bodyOptions);

      let translatedBody = body;
      if (bodyTranslation.data) {
        translatedBody =
          bodyTranslation.data.data.translations[0].translatedText;
      }

      // set translation
      setBody(translatedBody);
      // store the translation
      setTranslatedBody(translatedBody);

      // update comment state
      const newComment = {
        ...comment,
        body: translatedBody,
      };
      console.log('translated comment', newComment);
      setComment(newComment);
    } catch (error) {
      console.log('failed to translate', error);
      setToastMessage(
        intl.formatMessage({ id: 'PostDetails.translation_error' }),
      );
    }
  };

  //// fetch children comments
  const _handlePressChildren = async () => {
    // toggle
    setShowChildComments(!showChildComments);
  };

  ////
  const _closeEditor = () => {
    setShowReply(false);
    setEditMode(false);
  };

  //// flag a post
  const _flagPost = () => {
    if (authState.loggedIn)
      flagPost(comment.url, authState.currentCredentials.username);
  };

  return (
    <View>
      {!editMode ? (
        comment && (
          <CommentView
            key={comment.id}
            comment={_comment}
            body={body}
            showChildComments={showChildComments}
            reputation={_comment.state.reputation}
            handlePressReply={_handlePressReply}
            handlePressEditComment={_handlePressEditComment}
            handlePressTranslation={_handlePressTranslation}
            handleSubmitComment={_handleSubmitComment}
            handlePressChildren={_handlePressChildren}
            flagPost={_flagPost}
          />
        )
      ) : (
        <Editor
          isComment={true}
          originalBody={body}
          depth={comment.depth}
          showCloseButton={true}
          handleBodyChange={(text) => { }}
          handleCloseEditor={_closeEditor}
          handleSubmitComment={_handleSubmitComment}
        />
      )}
      {showReply && (
        <Editor
          isComment={true}
          depth={comment.depth}
          showCloseButton={true}
          handleCloseEditor={_closeEditor}
          handleBodyChange={(text) => { }}
          handleSubmitComment={_handleSubmitComment}
        />
      )}
    </View>
  );
};

export { CommentContainer };

// const CommentContainer = (props: Props): JSX.Element => {
//   //// props
//   //// language
//   const intl = useIntl();
//   //// contexts
//   const { authState } = useContext(AuthContext);
//   const { setToastMessage, speakBody } = useContext(UIContext);
//   const { postsState, submitPost, flagPost, updatePost } = useContext(
//     PostsContext,
//   );
//   const { settingsState } = useContext(SettingsContext);
//   //// stats
//   const [submitting, setSubmitting] = useState(false);
//   const [showReply, setShowReply] = useState(false);
//   const [editMode, setEditMode] = useState(false);
//   // reply text
//   const [replyText, setReplyText] = useState('');
//   // comment body
//   const [comment, setComment] = useState(null);
//   const [body, setBody] = useState(props.comment.body);
//   const [showOriginal, setShowOriginal] = useState(true);
//   const [originalBody, setOriginalBody] = useState(props.comment.body);
//   const [translatedBody, setTranslatedBody] = useState(null);
//   const [showChildComments, setShowChildComments] = useState(false);

//   //// reputation
//   const reputation = Math.floor(props.comment.state.reputation).toFixed(0);

//   //// event: mount
//   useEffect(() => {
//     setComment(props.comment);
//   }, []);

//   const formatedTime =
//     props.comment && getTimeFromNow(props.comment.state.createdAt);

//   const _handleSubmitComment = async (_text: string) => {
//     // check sanity
//     if (_text === '') return false;

//     // set submitted flag
//     setSubmitting(true);
//     const { username } = authState.currentCredentials;
//     // extract meta
//     const _meta = extractMetadata(_text);
//     // split tags by space
//     const _tags = [];
//     const jsonMeta = makeJsonMetadata(_meta, _tags);

//     // build posting content for a new comment
//     const postingContent: PostingContent = {
//       author: username,
//       title: '',
//       body: _text,
//       parent_author: comment.state.post_ref.author,
//       parent_permlink: comment.state.post_ref.permlink,
//       json_metadata: JSON.stringify(jsonMeta) || '',
//       permlink: generateCommentPermlink(username),
//     };

//     // update the body with patch if it is edit mode
//     if (editMode) {
//       //      const patch = createPatch(comment.body, replyText);
//       postingContent.parent_author = comment.state.parent_ref.author;
//       postingContent.parent_permlink = comment.state.parent_ref.permlink;
//       postingContent.permlink = comment.state.post_ref.permlink;
//     }
//     // submit the comment
//     const result = await submitPost(
//       postingContent,
//       authState.currentCredentials.password,
//       true,
//     );
//     // fetch comments
//     props.fetchComments();
//     // clear submitted flag
//     setSubmitting(false);
//     // close reply form
//     setShowReply(false);
//     setEditMode(false);
//     if (result) return true;
//     return false;
//   };

//   const _handlePressReply = () => {
//     // clear reply form
//     setShowReply(!showReply);
//   };

//   const _handlePressEditComment = () => {
//     console.log('_handlePressEditComment. markdown body', comment.markdownBody);
//     setEditMode(true);
//     // set markdown format to body
//     setBody(comment.markdownBody);
//   };

//   const _handlePressTranslation = async () => {
//     console.log('[Comment|_handlePressTranslation]');

//     if (!authState.loggedIn) {
//       console.log('you need to log in to translate a post');
//       setToastMessage(intl.formatMessage({ id: 'PostDetails.need_login' }));
//       return;
//     }
//     const _showOriginal = !showOriginal;
//     setShowOriginal(_showOriginal);
//     if (_showOriginal) {
//       console.log('show original. body', originalBody);
//       // set original comment
//       setBody(originalBody);
//       return;
//     }
//     // if translation exists, use it
//     if (translatedBody) {
//       console.log('translation exists');
//       setBody(translatedBody);
//       return;
//     }
//     const targetLang = settingsState.languages.translation;
//     const bodyOptions = {
//       targetLang: targetLang,
//       text: body,
//       format: 'html',
//     };

//     try {
//       const bodyTranslation = await firebase
//         .functions()
//         .httpsCallable('translationRequest')(bodyOptions);

//       let translatedBody = body;
//       if (bodyTranslation.data) {
//         translatedBody =
//           bodyTranslation.data.data.translations[0].translatedText;
//       }

//       // set translation
//       setBody(translatedBody);
//       // store the translation
//       setTranslatedBody(translatedBody);

//       // update comment state
//       const newComment = {
//         ...comment,
//         body: translatedBody,
//       };
//       console.log('translated comment', newComment);
//       setComment(newComment);
//     } catch (error) {
//       console.log('failed to translate', error);
//       setToastMessage(
//         intl.formatMessage({ id: 'PostDetails.translation_error' }),
//       );
//     }
//   };

//   //// fetch children comments
//   const _handlePressChildren = async () => {
//     // toggle
//     setShowChildComments(!showChildComments);
//   };

//   ////
//   const _closeEditor = () => {
//     setShowReply(false);
//     setEditMode(false);
//   };

//   //// flag a post
//   const _flagPost = () => {
//     if (authState.loggedIn)
//       flagPost(comment.url, authState.currentCredentials.username);
//   };

//   return (
//     <View>
//       {!editMode ? (
//         comment && (
//           <CommentView
//             key={comment.id}
//             comment={props.comment}
//             body={body}
//             showChildComments={showChildComments}
//             reputation={reputation}
//             handlePressReply={_handlePressReply}
//             handlePressEditComment={_handlePressEditComment}
//             handlePressTranslation={_handlePressTranslation}
//             handleSubmitComment={_handleSubmitComment}
//             handlePressChildren={_handlePressChildren}
//             flagPost={_flagPost}
//           />
//         )
//       ) : (
//         <Editor
//           isComment={true}
//           originalBody={body}
//           depth={comment.depth}
//           showCloseButton={true}
//           handleBodyChange={(text) => { }}
//           handleCloseEditor={_closeEditor}
//           handleSubmitComment={_handleSubmitComment}
//         />
//       )}
//       {showReply && (
//         <Editor
//           isComment={true}
//           depth={comment.depth}
//           showCloseButton={true}
//           handleCloseEditor={_closeEditor}
//           handleBodyChange={(text) => { }}
//           handleSubmitComment={_handleSubmitComment}
//         />
//       )}
//     </View>
//   );
// };

// export { CommentContainer };
