//// react
import React, { useState, useEffect, useContext, useCallback } from 'react';
//// react native
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SplashScreen from 'react-native-splash-screen';
import { PostRef, PostData, PostsTypes } from '~/contexts/types';
import { PostsContext, AuthContext, UIContext, UserContext } from '~/contexts';

import { PostsFeed } from '~/components';

interface Props { }

const Feed = (props: Props): JSX.Element => {
  //// contexts
  const {
    postsState,
    fetchPosts,
    setNeedToFetch,
    clearPosts,
    getTagList,
    setPostsType,
  } = useContext(PostsContext);
  const { authState } = useContext(AuthContext);
  const {
    userState,
    getUserProfileData,
    getWalletData,
    getNotifications,
  } = useContext(UserContext);
  //// states
  // const [username, setUsername] = useState(
  //   authState.currentCredentials.username,
  // );
  const [posts, setPosts] = useState<PostData[]>(null);
  //  const [postsType, setPostsType] = useState(PostsTypes.FEED);
  const [reloading, setReloading] = useState(true);
  // const [startPostRef, setStartPostRef] = useState<PostRef>({
  //   author: null,
  //   permlink: null,
  // });
  const [fetchedAll, setFetchedAll] = useState(false);
  const [initialFetched, setInitialFetched] = useState(false);

  //////// effects
  // event: account change
  useEffect(() => {
    //// hide splash screen
    SplashScreen.hide();
    // initial fetching
    _fetchPosts(false);
    // fetch user profile
    if (authState.loggedIn) {
      const { username } = authState.currentCredentials;
      // get profile data
      getUserProfileData(username);
      // get wallet data
      getWalletData(username);
      // get notifications
      getNotifications(username);
      // get tag list
      getTagList(authState.currentCredentials.username);
    }
  }, [authState.currentCredentials]);

  //// event: tag/fiter change
  useEffect(() => {
    if (postsState.needToFetch) {
      _fetchPosts(false);
      setNeedToFetch(false);
    }
  }, [postsState.needToFetch]);

  // account change event
  // useEffect(() => {
  //   console.log('Feed. effect: auth changed', authState);
  //   if (!reloading) {
  //     // // fetch only the user account has been changed
  //     // if (username != authState.currentCredentials.username) _fetchPosts(false);
  //     _fetchPosts(false);
  //     // get tag list
  //     getTagList(authState.currentCredentials.username);
  //   }
  // }, [authState.currentCredentials]);

  ////

  //// event: focus
  useFocusEffect(
    useCallback(() => {
      console.log('Feed. focus event. postsState', postsState);
      // update posts type only
      setPostsType(PostsTypes.FEED);
    }, []),
  );

  // //// set posts after fetching
  // useEffect(() => {
  //   if (postsState.fetched) {
  //     console.log('[Feed|useEffect] fetched event, postsState', postsState);
  //     console.log(
  //       '[Feed|useEffect] fetched event, postsState posts',
  //       postsState[postsState.postsType].posts,
  //     );
  //     // this will re-render screen
  //     setPosts(postsState[postsState.postsType].posts);
  //   }
  // }, [postsState.fetched]);

  const _fetchPosts = async (appending: boolean) => {
    console.log('Feed. _fetchPosts postsState', postsState);
    console.log('[Feed|fetchingPosts] appending', appending);
    let postsType = PostsTypes.FEED;
    console.log(
      'fetching posts, postsState, posts type',
      postsState,
      postsType,
    );
    // clear posts if not appending
    // loading for appening will be handled by load more
    if (!appending) {
      // clear posts state too
      setPosts(null);
      await clearPosts(postsType);
      setReloading(true);
    }

    // handle intially fetched case
    if (!initialFetched && !appending) {
      // set posts if exist
      if (postsState.feed.posts.length > 0) {
        setPosts(postsState.feed.posts);
        setInitialFetched(true);
        setReloading(false);
        return;
      }
    }


    //
    const { username } = authState.currentCredentials;
    let tagIndex = postsState.tagIndex;
    let filterIndex = postsState.filterIndex;
    let noFollowings = userState.followings.length === 0 ? true : false;
    console.log('[Feed] username, noFollowings ?', username, noFollowings);
    const { fetchedPosts, fetchedAll } = await fetchPosts(
      postsType,
      tagIndex,
      filterIndex,
      username,
      noFollowings,
      appending,
    );

    console.log('fetched all?', fetchedAll);

    if (!fetchedPosts || fetchedAll) {
      setFetchedAll(true);
    } else {
      setFetchedAll(false);
    }
    setPosts(fetchedPosts);
    if (!appending) {
      setReloading(false);
    }
  };

  return (
    <PostsFeed
      posts={posts}
      reloading={reloading}
      fetchPosts={_fetchPosts}
      noFetchMore={fetchedAll}
    />
  );
};

export { Feed };
