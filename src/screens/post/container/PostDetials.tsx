// post details container
//// react
import React, { useState, useEffect, useContext } from 'react';
//// react native
import { View, ActivityIndicator, Platform } from 'react-native';
//// language
import { useIntl } from 'react-intl';
//// config
import Config from 'react-native-config';
//// firebase
import { firebase } from '@react-native-firebase/functions';
//// axios
import axios from 'axios';
//// components
// screens
import { PostDetailsScreen } from '../screen/PostDetails';
// dsteem api
import { fetchComments, fetchRawPost } from '~/providers/steem/dsteemApi';
import { parsePost, parsePostWithComments } from '~/utils/postParser';
import { argonTheme } from '~/constants/argonTheme';
import { navigate } from '~/navigation/service';
import {
  PostRef,
  PostData,
  PostsTypes,
  PostingContent,
  CommentData,
} from '~/contexts/types';
import {
  PostsContext,
  AuthContext,
  UIContext,
  UserContext,
  SettingsContext,
} from '~/contexts';
import { generateCommentPermlink, makeJsonMetadataComment } from '~/utils/editor';
import { TARGET_BLOCKCHAIN, IMAGE_SERVERS } from '~/constants/blockchain';

interface Props {
  navigation: any;
}

const PostDetails = (props: Props): JSX.Element => {
  // props
  const { navigation } = props;
  //// language
  const intl = useIntl();
  // contexts
  const { authState } = useContext(AuthContext);
  const { userState, updateVoteAmount } = useContext(UserContext);
  const {
    postsState,
    submitPost,
    getPostDetails0,
    getPostDetails,
    fetchDatabaseState,
    appendTag,
    flagPost,
  } = useContext(PostsContext);
  const postIndex = postsState[postsState.postsType].index;
  const { setToastMessage, speakBody } = useContext(UIContext);
  const { settingsState } = useContext(SettingsContext);
  //// states
  const [loading, setLoading] = useState(true);
  const [postDetails, setPostDetails] = useState<PostData>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [originalPostDetails, setOriginalPostDetails] = useState<PostData>(
    null,
  );
  const [translatedPostDetails, setTranslatedPostDetails] = useState<PostData>(
    null,
  );
  const [comments, setComments] = useState(null);
  const [replies, setReplies] = useState<string[]>(null);
  const [contents, setContents] = useState<PostData[]>(null);
  const [submitted, setSubmitted] = useState(false);
  const [parentPost, setParentPost] = useState<PostData>(null);
  const [needFetching, setNeedFetching] = useState(false);
  const [commentY, setCommentY] = useState(0);
  const [hideHeader, setHideHeader] = useState(false);
  //////// events
  // event: account change
  useEffect(() => {
    //    console.log('[postDetails] event: account change');
    _fetchPostDetailsEntry();
    // update vote amount
    if (authState.loggedIn) {
      updateVoteAmount(authState.currentCredentials.username);
    }
  }, [authState.currentCredentials]);
  //// event: new post ref set
  useEffect(() => {
    if (postsState.postRef.author || postsState.postRef.permlink) {
      //     console.log('[postDetails] event: post ref');
      // fetch post
      _fetchPostDetailsEntry();
    }
    // update the vote amount
    if (authState.loggedIn) {
      updateVoteAmount(authState.currentCredentials.username);
    }
  }, [postsState.postRef.author, postsState.postRef.permlink]);

  //// event: parent post exists
  useEffect(() => {
    // parent post exist?
    if (postDetails && postDetails.depth > 0) {
      //    console.log('[postDetails] event: parent post');
      // fetch parent post
      _fetchParentPost(postDetails.state.parent_ref);
    }
  }, [postDetails]);
  //// event: need to fetch details
  useEffect(() => {
    if (needFetching) {
      // console.log('[postDetails] event: need to fetching');
      // get post details
      getPostDetails(
        postsState.postRef,
        authState.currentCredentials.username,
      ).then((contents) => {
        // console.log('need fetching details response');
        const details = contents[`${postsState.postRef.author}/${postsState.postRef.permlink}`];
        // set contents
        setContents(contents);
        // set details
        setPostDetails(details);
        // set replies (which are comments)
        setReplies(details.replies);
        // set original details
        setOriginalPostDetails(details);
        // clear flag
        setNeedFetching(false);
      });
    }
  }, [needFetching]);
  //// event: on blur
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      //    console.log('[PostDetails] event: blur');
      // stop tts before go back
      speakBody('', true);
      // reset comment height
      setCommentY(0);
    });
    return unsubscribe;
  }, [navigation]);

  const _fetchPostDetailsEntry = async (refresh?: boolean) => {
    console.log('_fetchPostDetailsEntry post state', postsState.postRef);
    // check sanity
    if (!postsState.postRef.author) return;
    // fetch comments only if they exist
    //    _fetchComments();
    // clear translation
    setTranslatedPostDetails(null);
    // clear comments
    //    setComments(null);
    // clear the previous post
    setPostDetails(null);
    // remove the parent post
    setParentPost(null);
    setLoading(true);

    let details = null;
    if (!refresh && postsState.postDetails && postsState.postDetails.body) {
      details = postsState.postDetails;
      console.log('[Post] post details exits', details);
      // fetch details
      setNeedFetching(true);
    } else {
      // get post details
      const contents = await getPostDetails(
        postsState.postRef,
        authState.currentCredentials.username,
      );

      // set contents
      setContents(contents);
      details = contents[`${postsState.postRef.author}/${postsState.postRef.permlink}`];
      setReplies(details.replies);
    }

    // set post details
    setPostDetails(details);
    // set original details
    setOriginalPostDetails(details);
    //
    setLoading(false);
    if (!details) return;
    // fetch database
    if (authState.loggedIn) {
      const { bookmarked } = await fetchDatabaseState(
        postsState.postRef,
        authState.currentCredentials.username,
      );
      if (bookmarked) details.state.bookmarked = bookmarked;
    }
  };

  const _fetchParentPost = async (postRef: PostRef) => {
    console.log('_fetchParentPost. postRef', postRef);
    // get post details
    const details = await getPostDetails0(
      postRef,
      authState.currentCredentials.username,
    );
    // go up the tree to the root
    if (details.depth > 0) {
      await _fetchParentPost(details.state.parent_ref);
      console.log('_fetchParentPost. details', details);
      return;
    }
    console.log('_fetchParentPost. parent details', details);
    // set parent post
    setParentPost(details);
  };

  // const _fetchComments = async () => {
  //   // fetch comments on this post
  //   const _comments = await fetchComments(
  //     postsState.postRef.author,
  //     postsState.postRef.permlink,
  //     authState.currentCredentials.username,
  //   );
  //   console.log('_fetchComments', _comments);

  //   setComments(_comments);
  // };

  const _onRefresh = async () => {
    // get fresh post details
    await _fetchPostDetailsEntry(true);
    // console.log('[PostDetails] refreshed, contents', contents);
  };

  const _onSubmitComment = async (comment: string): Promise<boolean> => {
    // check sanity
    if (comment === '') return false;

    const { username, password } = authState.currentCredentials;
    const permlink = generateCommentPermlink(username);
    const jsonMeta = makeJsonMetadataComment(
      postsState.postDetails.metadata.tags || [TARGET_BLOCKCHAIN],
    );
    // build posting content
    const postingContent: PostingContent = {
      author: username,
      title: '',
      body: comment,
      parent_author: postsState.postRef.author,
      parent_permlink: postsState.postRef.permlink,
      json_metadata: JSON.stringify(jsonMeta) || '',
      permlink: permlink,
    };
    const result = await submitPost(postingContent, password, true);
    // set submitted flag
    setSubmitted(true);
    if (result) {
      //// update comments
      // add to replies
      let _replies = replies;
      _replies.push(`${username}/${permlink}`);
      setReplies(_replies);
      // fetch the comment? or build?
      const _rawComment = await fetchRawPost(username, permlink);
      const _post = await parsePost(_rawComment, username, IMAGE_SERVERS[0]);
      // add the post to contents
      let _contents = contents;
      _contents[`${username}/${permlink}`] = _post;
      // // update the parent's replies
      // _contents[`${postsState.postRef.author}/${postsState.postRef.permlink}`].replies.push(`${username}/${permlink}`);
      setContents(_contents);
      // This is required to re-render the comment component, why???
      setComments(_contents);
      return true;
    }
    return false;
  };

  //// handle press hash tag
  const _handlePressTag = (tag: string) => {
    console.log('[PostDetailsContainer] handlePressTag, tag', tag);
    // append a new tag to tag list
    appendTag(tag);
    // navigate to feed by specifying the feed screen
    props.navigation.navigate('Feed', { screen: 'Feed' });
  };

  const _translateLanguage = async () => {
    if (!authState.loggedIn) {
      console.log('you need to log in to translate a post');
      setToastMessage(intl.formatMessage({ id: 'PostDetails.need_login' }));
      return;
    }
    const _showOriginal = !showOriginal;
    setShowOriginal(_showOriginal);
    if (_showOriginal) {
      // set original post
      setPostDetails(originalPostDetails);
      return;
    }
    // if translation exists, use it
    if (translatedPostDetails) {
      console.log('translation exists');
      setPostDetails(translatedPostDetails);
      return;
    }
    const title = postDetails.state.title;
    const body = postDetails.body;
    const targetLang = settingsState.languages.translation;
    const titleOptions = {
      targetLang: targetLang,
      text: title,
      format: 'text',
    };
    const bodyOptions = {
      targetLang: targetLang,
      text: body,
      format: 'html',
    };

    try {
      const titleTranslation = await firebase
        .functions()
        .httpsCallable('translationRequest')(titleOptions);

      let translatedTitle = title;
      if (titleTranslation.data) {
        translatedTitle =
          titleTranslation.data.data.translations[0].translatedText;
        console.log('_translateLanguage. translatedTitle', translatedTitle);
      }

      const bodyTranslation = await firebase
        .functions()
        .httpsCallable('translationRequest')(bodyOptions);

      let translatedBody = body;
      if (bodyTranslation.data) {
        translatedBody =
          bodyTranslation.data.data.translations[0].translatedText;
      }

      const newPostDetails = {
        ...postDetails,
        state: { ...postDetails.state, title: translatedTitle },
        body: translatedBody,
      };
      // TODO: save the translation for re-translate

      // set translation
      setPostDetails(newPostDetails);
      // store the translation
      setTranslatedPostDetails(newPostDetails);
      //return translation.data.translations[0].translatedText;
    } catch (error) {
      console.log('failed to translate', error);
      setToastMessage(
        intl.formatMessage({ id: 'PostDetails.translation_error' }),
      );
    }
  };

  //// flag a post
  const _flagPost = () => {
    if (authState.loggedIn)
      flagPost(postDetails.url, authState.currentCredentials.username);
  };

  return postDetails ? (
    <PostDetailsScreen
      post={postDetails}
      loading={loading}
      parentPost={parentPost}
      postsType={postsState.postsType}
      index={postIndex}
      comments={comments}
      replies={replies}
      contents={contents}
      commentY={commentY}
      hideHeader={hideHeader}
      toggleHideHeader={(value) => setHideHeader(value)}
      updateCommentY={(height) => setCommentY(height)}
      handleRefresh={_onRefresh}
      handleSubmitComment={_onSubmitComment}
      handlePressTag={_handlePressTag}
      handlePressTranslation={_translateLanguage}
      flagPost={_flagPost}
    />
  ) : (
    <View style={{ top: 20 }}>
      <ActivityIndicator color={argonTheme.COLORS.ERROR} size="large" />
    </View>
  );
};

export { PostDetails };
