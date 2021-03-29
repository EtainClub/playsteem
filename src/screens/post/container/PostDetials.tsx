// post details container
//// react
import React, {useState, useEffect, useContext} from 'react';
//// react native
import {View, ActivityIndicator, Platform} from 'react-native';
//// language
import {useIntl} from 'react-intl';
//// config
import Config from 'react-native-config';
//// firebase
import {firebase} from '@react-native-firebase/functions';
//// axios
import axios from 'axios';
//// components
// screens
import {PostDetailsScreen} from '../screen/PostDetails';
// dsteem api
import {fetchComments, fetchRecentComments} from '~/providers/steem/dsteemApi';
import {argonTheme} from '~/constants/argonTheme';
import {navigate} from '~/navigation/service';
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
import {generateCommentPermlink, makeJsonMetadataComment} from '~/utils/editor';
import {TARGET_BLOCKCHAIN} from '~/constants/blockchain';

interface Props {
  navigation: any;
}

const PostDetails = (props: Props): JSX.Element => {
  // props
  const {navigation} = props;
  //// language
  const intl = useIntl();
  // contexts
  const {authState} = useContext(AuthContext);
  const {userState, updateVoteAmount} = useContext(UserContext);
  const {
    postsState,
    submitPost,
    getPostDetails,
    fetchDatabaseState,
    appendTag,
    flagPost,
  } = useContext(PostsContext);
  const postIndex = postsState[postsState.postsType].index;
  const {setToastMessage, speakBody} = useContext(UIContext);
  const {settingsState} = useContext(SettingsContext);
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
  const [comments, setComments] = useState<CommentData[]>(null);
  const [submitted, setSubmitted] = useState(false);
  const [parentPost, setParentPost] = useState<PostData>(null);
  const [needFetching, setNeedFetching] = useState(false);
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
      //    console.log('[postDetails] event: need to fetching');
      // get post details
      getPostDetails(
        postsState.postRef,
        authState.currentCredentials.username,
      ).then((details) => {
        console.log('need fetching details response');
        // set details
        setPostDetails(details);
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
    });
    return unsubscribe;
  }, [navigation]);

  const _fetchPostDetailsEntry = async (refresh?: boolean) => {
    console.log('_fetchPostDetailsEntry post state', postsState.postRef);
    // check sanity
    if (!postsState.postRef.author) return;
    // fetch comments only if they exist
    _fetchComments();
    // clear translation
    setTranslatedPostDetails(null);
    // clear comments
    setComments(null);
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
      details = await getPostDetails(
        postsState.postRef,
        authState.currentCredentials.username,
      );
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
      const {bookmarked} = await fetchDatabaseState(
        postsState.postRef,
        authState.currentCredentials.username,
      );
      if (bookmarked) details.state.bookmarked = bookmarked;
    }
  };

  const _fetchParentPost = async (postRef: PostRef) => {
    console.log('_fetchParentPost. postRef', postRef);
    // get post details
    const details = await getPostDetails(
      postRef,
      authState.currentCredentials.username,
    );
    // go up the tree to the root
    if (details.depth > 0) {
      await _fetchParentPost(details.state.parent_ref);
      console.log('_fetchParentPost. details', details);
      return details;
    }
    console.log('_fetchParentPost. parent details', details);
    // set parent post
    setParentPost(details);
  };

  const _fetchComments = async () => {
    // fetch comments on this post
    const _comments = await fetchComments(
      postsState.postRef.author,
      postsState.postRef.permlink,
      authState.currentCredentials.username,
    );
    console.log('_fetchComments', _comments);

    setComments(_comments);
  };

  // const _fetchRecentComments = async () => {
  //   // get the first comment of the post
  //   try {
  //     const _lastComments = await fetchRecentComments(
  //       postsState.postRef.author,
  //       postsState.postRef.permlink,
  //       50,
  //       authState.currentCredentials.username,
  //     );

  //     console.log('_fetchComments. last comments', _lastComments);
  //   } catch (error) {
  //     console.log('failed to fetch recent comments');
  //   }
  // };

  const _onRefresh = async () => {
    // get fresh post details
    await _fetchPostDetailsEntry(true);
    console.log('[PostDetails] refreshed, comments', comments);
  };

  const _onSubmitComment = async (comment: string): Promise<boolean> => {
    // check sanity
    if (comment === '') return false;

    const {username, password} = authState.currentCredentials;
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
      // fetch comments
      _fetchComments();
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
    props.navigation.navigate('Feed', {screen: 'Feed'});
  };

  const _translateLanguage = async () => {
    if (!authState.loggedIn) {
      console.log('you need to log in to translate a post');
      setToastMessage(intl.formatMessage({id: 'PostDetails.need_login'}));
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
        state: {...postDetails.state, title: translatedTitle},
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
        intl.formatMessage({id: 'PostDetails.translation_error'}),
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
      handleRefresh={_onRefresh}
      handleSubmitComment={_onSubmitComment}
      handlePressTag={_handlePressTag}
      handlePressTranslation={_translateLanguage}
      flagPost={_flagPost}
    />
  ) : (
    <View style={{top: 20}}>
      <ActivityIndicator color={argonTheme.COLORS.ERROR} size="large" />
    </View>
  );
};

export {PostDetails};
