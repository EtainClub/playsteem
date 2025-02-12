//// react
import React, { useReducer, createContext, useContext } from 'react';
//// language
import { useIntl } from 'react-intl';
//// blockchain api
import {
  fetchPostsSummary,
  submitVote,
  broadcastPost,
  broadcastPostUpdate,
  fetchPostDetails,
  fetchPostWithComments,
  fetchAccountState,
  fetchCommunityList,
  fetchCommunity,
} from '~/providers/steem/dsteemApi';
import { renderPostBody } from '~/utils/render-helpers';
import firestore from '@react-native-firebase/firestore';
import {
  NUM_FETCH_POSTS,
  NUM_FETCH_BLOG_POSTS,
  TOP_TAGS,
} from '~/constants/blockchain';

//// types
import {
  PostRef,
  PostData,
  PostsTypes,
  PostsActionTypes,
  PostsAction,
  PostsContextType,
  PostsState,
  PostingContent,
  INIT_POST_DATA,
  INIT_POSTS_DATA,
  INIT_FRIENDS_TAG,
  INIT_FILTER_LIST,
  INIT_ALL_TAG,
  FilterTypes,
} from '~/contexts/types';
import { defaults, filter } from 'lodash';

import { UIContext } from '~/contexts';

const MAX_RETRY = 3;

//// initial state
const initialState: PostsState = {
  feed: INIT_POSTS_DATA,
  author: INIT_POSTS_DATA,
  hash: INIT_POSTS_DATA,
  //// current post
  postsType: PostsTypes.FEED,
  // post details ref
  postRef: {
    author: null,
    permlink: null,
  },
  // post details
  postDetails: INIT_POST_DATA,
  postWithComments: [],
  // fetched flag
  fetched: false,
  //
  needToFetch: false,
  // retry count
  retryCount: 0,
  //// tag, filter
  tagList: [],
  // tag index
  tagIndex: 0,
  // community list
  communityList: [],
  // community index for posting
  communityIndex: 0,
  // filter: trending, created
  filterList: INIT_FILTER_LIST,
  // filter index
  filterIndex: 0,
};

//// create posts context
const PostsContext = createContext<PostsContextType | undefined>(undefined);

//// posts reducer
const postsReducer = (state: PostsState, action: PostsAction) => {
  let posts = [];
  let metaposts = {};
  switch (action.type) {
    case PostsActionTypes.SET_TAG_LIST:
      return {
        ...state,
        tagList: action.payload,
      };
    case PostsActionTypes.SET_COMMUNITIES:
      return {
        ...state,
        communityList: action.payload,
      };
    case PostsActionTypes.SET_POSTS:
      // console.log('[postsReducer] set posts aciton. payload', action.payload);
      //// set posts to the posts type array
      return {
        // previous state
        ...state,
        // update the meta posts
        [action.payload.postsType]: action.payload.metaposts,
        // update the posts type
        postsType: action.payload.postsType,
        fetched: true,
        retryCount: 0,
      };
    case PostsActionTypes.SET_POSTS_TYPE:
      return {
        ...state,
        postsType: action.payload,
      };
    case PostsActionTypes.SET_POST_INDEX:
      return {
        ...state,
        [action.payload.postsType]: {
          ...state[action.payload.postsType],
          index: action.payload.postIndex,
        },
      };
    case PostsActionTypes.RETRY_FETCHING:
      return { ...state, retryCount: state.retryCount++ };

    case PostsActionTypes.SET_FETCHED:
      // console.log('[postsReducer] set fetched. payload', action.payload);
      return { ...state, fetched: action.payload };

    case PostsActionTypes.SET_NEED_FETCH:
      return { ...state, needToFetch: action.payload };

    case PostsActionTypes.SET_POST_REF:
      return { ...state, postRef: action.payload };

    case PostsActionTypes.CLEAR_POSTS:
      // console.log('[postsReducer] clearing posts. type', action.payload);
      return {
        ...state,
        // update the meta posts of the given posts type
        [action.payload]: INIT_POSTS_DATA,
        // keep the other state
        tagList: state.tagList,
        tagIndex: state.tagIndex,
        filterList: state.filterList,
        filterIndex: state.filterIndex,
        communityList: state.communityList,
        communityIndex: state.communityIndex,
      };

    case PostsActionTypes.SET_TAG_AND_FILTER:
      return {
        ...state,
        tagIndex: action.payload.tagIndex,
        filterIndex: action.payload.filterIndex,
        needToFetch: true,
      };
    case PostsActionTypes.SET_TAG_INDEX:
      return { ...state, tagIndex: action.payload, needToFetch: true };

    case PostsActionTypes.APPEND_TAG:
      return {
        ...state,
        postsType: PostsTypes.HASH_TAG,
        tagList: action.payload.tagList,
        tagIndex: action.payload.tagIndex,
        filterIndex: action.payload.filterIndex,
        needToFetch: true,
      };
    case PostsActionTypes.SET_FILTER_INDEX:
      return { ...state, filterIndex: action.payload, needToFetch: true };

    case PostsActionTypes.SET_COMMUNITY_INDEX:
      return { ...state, communityIndex: action.payload };

    case PostsActionTypes.SET_POST_DETAILS:
      return {
        ...state,
        postDetails: action.payload,
      };

    case PostsActionTypes.SET_POST_WITH_COMMENTS:
      return {
        ...state,
        postWithComments: action.payload.contents,
        postRef: action.payload.postRef,
        postDetails:
          action.payload.contents[`${action.payload.postRef.author}/${action.payload.postRef.permlink}`]
      };

    case PostsActionTypes.BOOKMARK_POST:
      // update post details's state
      const postsDetails = state.postDetails;
      postsDetails.state.bookmarked = action.payload;
      return {
        ...state,
        postDetails: {
          ...state.postDetails,
        },
      };

    case PostsActionTypes.UPVOTE:
      console.log('[postReducer] upvoting action payload', action.payload);
      // update the specific post state
      return {
        ...state,
        // feed or hash (MetaPosts)
        [action.payload.postsType]: {
          // set the previous values to the object
          ...state[action.payload.postsType],
          // update posts
          posts: state[action.payload.postsType].posts.map((post, index) =>
            // post: PostData
            index === action.payload.postIndex
              ? {
                // set the previous values to the object, PostData
                ...state[action.payload.postsType].posts[index],
                // update the state
                state: action.payload.postState,
              }
              : post,
          ),
        },
      };

    case PostsActionTypes.UPVOTE_COMMENT:
      console.log(
        '[postReducer] upvoting comment action payload',
        action.payload,
      );
      return state;

    case PostsActionTypes.COMMENT_POST:
      console.log('[postReducer] add comment', action.payload);
      return state;

    default:
      return state;
  }
};

type Props = {
  children: React.ReactNode;
};

const PostsProvider = ({ children }: Props) => {
  // userReducer hook
  // set auth reducer with initial state of auth state
  const [postsState, dispatch] = useReducer(postsReducer, initialState);
  // console.log('[posts provider] posts', postsState);
  //// language
  const intl = useIntl();
  //// contexts
  // toast message function from UI contexts
  const { setToastMessage } = useContext(UIContext);

  ////// action creators
  //// fetch tag list
  const getTagList = async (username?: string) => {
    // fetch communities
    let tagList = null;
    if (username) {
      const communities = await fetchCommunityList(username);
      const _communityList = [['blog', 'Blog', '', ''], ...communities];
      // dispatch community
      dispatch({
        type: PostsActionTypes.SET_COMMUNITIES,
        payload: _communityList,
      });
      // build tag list
      if (communities.length > 0) {
        tagList = [
          [username, ...INIT_FRIENDS_TAG],
          ['', ...INIT_ALL_TAG],
          ...communities,
        ];
      } else {
        tagList = [
          [username, ...INIT_FRIENDS_TAG],
          ['', ...INIT_ALL_TAG],
          ...TOP_TAGS,
        ];
      }
    } else {
      tagList = [['', ...INIT_ALL_TAG], ...TOP_TAGS];
    }
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_TAG_LIST,
      payload: tagList,
    });
    return tagList;
  };

  //// append a tag
  const appendTag = (tag: string) => {
    let tagList = postsState.tagList;
    let tagIndex = 0;
    // cannot fetch posts with 'trending' filter; sometimes 'hot' is not working, either
    let filterIndex = 2;
    // append a tag
    if (!tagList.includes(tag)) {
      const _tag = [tag, tag, '', ''];
      tagList.push(_tag);
      tagIndex = tagList.length - 1;
      filterIndex = 1;
    } else {
      tagIndex = tagList.indexOf(tag);
    }
    console.log('[appendTag] tagIndex', tagIndex);
    // dispatch action
    dispatch({
      type: PostsActionTypes.APPEND_TAG,
      payload: {
        tagList,
        tagIndex,
        filterIndex,
      },
    });
  };

  //// fetch posts action creator
  const fetchPosts = async (
    postsType: PostsTypes,
    tagIndex: number,
    filterIndex: number,
    username?: string,
    noFollowings?: boolean,
    appending?: boolean,
    author?: string,
  ) => {
    //// set start post ref
    let startPostRef = {
      author: null,
      permlink: null,
    };
    if (appending) {
      startPostRef = postsState[postsState.postsType].startPostRef;
    }

    //// setup tag and filter value based on the tagIndex and filterIndex
    let tag = '';
    let filter = '';
    let limit = NUM_FETCH_POSTS;
    switch (postsType) {
      case PostsTypes.HASH_TAG:
      case PostsTypes.FEED:
        if (tagIndex === 0) {
          // logged in
          if (username) {
            // but not followings
            if (noFollowings) {
              tag = '';
              filter = FilterTypes.TRENDING;
            } else {
              tag = username;
              filter = FilterTypes.FEED;
            }
          } // not logged in
          else {
            tag = '';
            filter = FilterTypes.TRENDING;
          }
        } else if (postsState.tagList[tagIndex][1] === 'All') {
          tag = '';
          filter = postsState.filterList[filterIndex];
        } else if (tagIndex > 0) {
          filter = postsState.filterList[filterIndex];
          tag = postsState.tagList[tagIndex][0];
        } else {
          console.error(
            '[PostsContext|fetchPosts] tagIndex is wrong',
            tagIndex,
          );
          return {
            fetchedPosts: [],
            fetchedAll: true,
          };
        }
        break;
      case PostsTypes.AUTHOR:
        filter = FilterTypes.BLOG;
        tag = author;
        limit = NUM_FETCH_BLOG_POSTS;
        break;
    }

    let _posts = null;
    const result = await _fetchPosts(
      filter,
      tag,
      startPostRef,
      username,
      limit,
    );
    // check fetching result
    if (result.length > 0) {
      _posts = result;
    } else {
      if (postsType === PostsTypes.FEED) {
        return {
          // return the current posts for the feed type
          fetchedPosts: postsState[postsType].posts,
          fetchedAll: true,
        };
      } else {
        // other than feed, return empty, which is temp workaround
        return {
          fetchedPosts: [],
          fetchedAll: true,
        };
      }
    }

    // TODO need to check if the fetched posts is fewer than limit + 1 -> nothing to fetch more
    const fetchedAll = _posts.length < limit + 1 ? true : false;

    let posts;
    // set start post ref
    const lastPost = _posts[_posts.length - 1];
    const lastPostRef = lastPost.state.post_ref;

    if (_posts.length < NUM_FETCH_POSTS) {
      console.log(
        '[fetchPosts] number of posts is fewer than NUM_FETCH_POSTS',
        _posts.length,
      );
      // keep all posts
      posts = _posts;
    } else {
      // keep n-1 posts
      posts = _posts.slice(0, _posts.length - 1);
    }
    if (appending) {
      // append only if it exists
      if (posts) posts = postsState[postsType].posts.concat(posts);
    }

    // handle in case of fetching only one.
    // the last post should be null ==> this causes fetching from the start..
    // then how? set fetching all state?
    // not to check of the single post but to check number of posts is less then NUM_FETCH_POSTS
    // if then, keep all the posts and set fetched all state.
    console.log('[fetchPosts] lastPostRef', lastPostRef);
    // dispatch set posts action
    dispatch({
      type: PostsActionTypes.SET_POSTS,
      payload: {
        postsType: postsType,
        metaposts: {
          posts: posts,
          startPostRef: lastPostRef,
          index: 0,
        },
      },
    });
    return {
      fetchedPosts: posts,
      fetchedAll,
    };
  };

  //// set post index
  const setPostIndex = (postsType: PostsTypes, postIndex: number) => {
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_POST_INDEX,
      payload: {
        postsType,
        postIndex,
      },
    });
  };
  //// clear posts
  const clearPosts = async (postsType: PostsTypes) => {
    dispatch({
      type: PostsActionTypes.CLEAR_POSTS,
      payload: postsType,
    });
  };

  //// get post details (previous version)
  const getPostDetails0 = async (postRef: PostRef, username: string) => {
    // fetch
    const post = await fetchPostDetails(
      postRef.author,
      postRef.permlink,
      username,
    );
    if (post) {
      // dispatch action
      dispatch({
        type: PostsActionTypes.SET_POST_DETAILS,
        payload: post,
      });
      return post;
    }
    setToastMessage(intl.formatMessage({ id: 'fetch_error' }));
    return null;
  };

  //// get post details
  const getPostDetails = async (postRef: PostRef, username: string) => {
    // fetch
    // const post = await fetchPostDetails(
    //   postRef.author,
    //   postRef.permlink,
    //   username,
    // );
    // fetch post detail and its comments (replies)
    const postWithComments = await fetchPostWithComments(
      postRef.author,
      postRef.permlink,
      username,
    );

    // console.log('[getPostDetails] post', postWithComments);
    if (postWithComments) {
      // dispatch action
      dispatch({
        type: PostsActionTypes.SET_POST_WITH_COMMENTS,
        payload: {
          contents: postWithComments,
          postRef: postRef,
        },
      });
      return postWithComments;
    }
    setToastMessage(intl.formatMessage({ id: 'fetch_error' }));
    return null;
  };

  ////
  const setPostDetails = (post: PostData) => {
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_POST_DETAILS,
      payload: post,
    });
  };

  //// set tag and filter index
  const setTagAndFilter = (
    tagIndex: number,
    filterIndex: number,
    postsType: PostsTypes,
    username?: string,
  ) => {
    // // @test
    // console.log('setTagAndFilter. tag, filter',
    //   postsState.tagList[tagIndex][1], postsState.filterList[filterIndex]);
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_TAG_AND_FILTER,
      payload: {
        tagIndex,
        filterIndex,
      },
    });
  };

  //// set tag index
  const setTagIndex = (
    tagIndex: number,
    postsType: PostsTypes,
    username?: string,
  ) => {
    console.log('[PostsContext|setTag] tag Index', tagIndex);
    // check sanity
    if (tagIndex < 0 || tagIndex >= postsState.tagList.length) {
      console.log('[setTag] tag is not defined', tagIndex);
      return;
    }
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_TAG_INDEX,
      payload: tagIndex,
    });
  };

  //// set filter index
  const setFilterIndex = (filterIndex: number, username?: string) => {
    console.log('[PostsContext|setfilter] filter Index', filterIndex);
    // check sanity
    if (filterIndex < 0 || filterIndex >= postsState.filterList.length) {
      console.log('[setfilter] filter is not defined', filterIndex);
      return;
    }
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_FILTER_INDEX,
      payload: filterIndex,
    });
  };

  //// set community index for posting
  const setCommunityIndex = (index: number, username?: string) => {
    console.log('[PostsContext|setCommunity] Community Index', index);
    // check sanity
    if (index < 0 || index >= postsState.communityList.length) {
      console.log('[setCommunity] community is not defined', index);
      return;
    }
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_COMMUNITY_INDEX,
      payload: index,
    });
  };

  //// voting action creator
  const upvote = async (
    postsType: PostsTypes,
    postIndex: number,
    isComment: boolean,
    postRef: PostRef,
    username: string,
    password: string,
    votingWeight: number,
    voteAmount: number,
  ) => {
    console.log(
      '[PostsContext|upvote] postsType, postIndex, voteAmount',
      postsType,
      postIndex,
      voteAmount,
    );

    // send transaction
    const results = await submitVote(
      username,
      password,
      postRef.author,
      postRef.permlink,
      votingWeight,
    );
    // check result
    console.log('[upvote] results', results);
    if (!results) {
      setToastMessage(intl.formatMessage({ id: 'transaction_error' }));
      return null;
    }

    //// update post states
    // new post state
    console.log('posts state, posttype', postsState[postsType]);
    //// dispatch action
    // handle voting on comment
    if (isComment) {
      //// calculation
      // TODO: find the comment
      // Update the comment's voters, payout, vote amount
      // const newComments = _updateComments(
      //   postsState[postsType].posts[postIndex].comments,
      //   {author: postRef.author, permlink: postRef.permlink},
      // );
      // dispatch({
      //   type: PostsActionTypes.UPVOTE_COMMENT,
      //   payload: {
      //     postIndex: postIndex,
      //     comments: newComments,
      //   },
      // });
    } else {
      const postState = postsState[postsType].posts[postIndex].state;

      // // update payout
      postState.payout = (
        parseFloat(postState.payout) +
        (voteAmount * votingWeight) / 100
      ).toFixed(2);
      // update vote count
      postState.vote_count += 1;
      // update voters
      postState.voters = [`${username} (${voteAmount})`, ...postState.voters];
      // update voted flag
      postState.voted = true;

      dispatch({
        type: PostsActionTypes.UPVOTE,
        payload: {
          postsType: postsType,
          postIndex: postIndex,
          postState: postState,
        },
      });
    }
    return results;
  };

  //// helper function to find the comment
  const _updateComments = (comments, postRef) => {
    const { author, permlink } = comments[0];
    if (author === postRef.author && permlink === postRef.permlink) {
      // found, update the comment
      // comment.payout = newPayout
      // comment.voters = newVoters
      //
      return comments;
    } else if (comments.children) {
      for (let i = 0; i < comments.children; i++) {
        const result = _updateComments(comments.children[i], postRef);
      }
    }
  };

  //// submit post/comment
  const submitPost = async (
    postingContent: PostingContent,
    password: string,
    isComment: boolean,
    options?: any[],
    postIndex?: number,
  ) => {
    // broadcast comment
    const result = await broadcastPost(postingContent, password, options);
    if (result) {
      // dispatch action
      // TODO; distinguish post and comment
      return result;
    }
    setToastMessage(intl.formatMessage({ id: 'transaction_error' }));
    return null;
  };

  // update post
  const updatePost = async (
    originalBody: string,
    originalPermlink: string,
    originalParentPermlink: string,
    postingContent: PostingContent,
    password: string,
    isComment: boolean,
    postIndex?: number,
  ) => {
    // submit comment
    const result = await broadcastPostUpdate(
      originalBody,
      originalPermlink,
      originalParentPermlink,
      postingContent,
      password,
    );
    console.log('[updatePost] result', result);
    if (!result) {
      setToastMessage(intl.formatMessage({ id: 'transaction_error' }));
      return null;
    }
    let action = PostsActionTypes.SET_POST_DETAILS;
    // TODO: handle comment. set the parent post detail??
    if (isComment) action = PostsActionTypes.SET_POST_DETAILS;
    // update post detail
    const post = postsState.postDetails;
    post.body = renderPostBody(postingContent.body, true, true);
    post.state.title = postingContent.title;
    post.metadata = JSON.parse(postingContent.json_metadata);
    dispatch({
      type: action,
      payload: post,
    });
    return result;
  };

  //// bookmark post in firebase
  const bookmarkPost = async (
    postRef: PostRef,
    username: string,
    title: string,
  ) => {
    //// get the firebase user doc ref
    // build doc id
    const docId = `${postRef.author}${postRef.permlink}`;
    // create a reference to the doc
    const docRef = firestore()
      .doc(`users/${username}`)
      .collection('bookmarks')
      .doc(docId);
    // check sanity if the user already bookmarked this
    let bookmark = null;
    try {
      bookmark = await docRef.get();
    } catch (error) {
      console.log('failed to get bookmarks', error);
      setToastMessage(intl.formatMessage({ id: 'fetch_error' }));
      return;
    }
    if (bookmark.exists) {
      console.log('[addBookmark] User bookmarked already');
      setToastMessage(intl.formatMessage({ id: 'Bookmark.already' }));
      return;
    }
    // add new doc
    docRef.set({
      author: postRef.author,
      title: title,
      postRef: postRef,
      createdAt: new Date(),
    });
    // dispatch action
    dispatch({
      type: PostsActionTypes.BOOKMARK_POST,
      payload: true,
    });
    //
    setToastMessage(intl.formatMessage({ id: 'Bookmark.added' }));
  };

  //// fetch database state
  const fetchDatabaseState = async (postRef: PostRef, username: string) => {
    //// get the firebase user doc ref
    // build doc id
    const docId = `${postRef.author}${postRef.permlink}`;
    // create a reference to the doc
    const docRef = firestore()
      .doc(`users/${username}`)
      .collection('bookmarks')
      .doc(docId);
    let bookmark = null;
    try {
      bookmark = await docRef.get();
    } catch (error) {
      console.log('failed to get bookmarks', error);
      return {
        bookmarked: false,
      };
    }
    if (bookmark.exists) {
      return {
        bookmarked: true,
      };
    } else {
      return {
        bookmarked: false,
      };
    }
  };

  //// fetch bookmarks
  const fetchBookmarks = async (username: string) => {
    // get user's bookmarks collection
    let bookmarks = [];
    // order by latest
    await firestore()
      .doc(`users/${username}`)
      .collection('bookmarks')
      .orderBy('createdAt', 'desc')
      .get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          bookmarks.push(doc.data());
        });
      })
      .catch((e) => {
        setToastMessage(intl.formatMessage({ id: 'fetch_error' }));
        console.log('failed to get bookmarks', e);
      });
    return bookmarks;
  };

  //// update favorite author
  const updateFavoriteAuthor = async (
    author: string,
    username: string,
    remove: boolean,
  ) => {
    console.log('[favoriteAuthor] author', author);
    // create a reference to the doc
    const docRef = firestore()
      .doc(`users/${username}`)
      .collection('favorites')
      .doc(author);

    //// get the firebase user doc ref
    // remove
    if (remove) {
      docRef
        .delete()
        .then(() => {
          setToastMessage(intl.formatMessage({ id: 'Profile.unfavorite_ok' }));

          //// update the favorites collection
          // remove
          firestore().doc(`favorites/${author}`).collection('followers').doc(`${username}`)
            .delete()
            .then(() => console.log('deleted the user in favorites collection'));
          return true;
        })
        .catch((error) => {
          setToastMessage(intl.formatMessage({ id: 'unfavorite_error' }));
          return false;
        });
    } else {
      // check saniy if the user already favorited the author
      try {
        const favorite = await docRef.get();
        if (favorite.exists) {
          console.log('[favoriteAuthor] User favorited the author already');
          setToastMessage(intl.formatMessage({ id: 'Favorite.already' }));
          return false;
        }
        // add new doc
        docRef.set({
          author: author,
          createdAt: new Date(),
        });
        //// update the favorites collection
        // get reference to the author of favorites collection
        firestore().doc(`favorites/${author}`).collection('followers').doc(`${username}`).set({});


        return true;
      } catch (error) {
        console.log('[favoriteAuthor] failed to set new favorite', error);
        setToastMessage(intl.formatMessage({ id: 'unfavorite_error' }));
        return false;
      }
    }
  };

  //// fetch favorites
  const fetchFavorites = async (username: string) => {
    // get user's favorite collection
    let favorites = [];
    await firestore()
      .doc(`users/${username}`)
      .collection('favorites')
      .get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          favorites.push(doc.data());
        });
      })
      .catch((e) => {
        setToastMessage(intl.formatMessage({ id: 'fetch_error' }));
        console.log('failed to get bookmarks', e);
      });
    return favorites;
  };

  //// flag a post or comment
  const flagPost = async (url: string, reporter: string) => {
    // get the firebase reports ref
    const reportsRef = firestore().collection('reports');
    // add a new doc
    reportsRef.add({
      url,
      reporter,
      createdAt: new Date(),
    });
    setToastMessage(intl.formatMessage({ id: 'PostDetails.flagged' }));
  };

  //// check if the author is in the favorite list
  const isFavoriteAuthor = async (username: string, author: string) => {
    console.log('[isFavorite] username, author', username, author);
    // get user's favorite collection
    const result = await firestore()
      .doc(`users/${username}`)
      .collection('favorites')
      .doc(`${author} `)
      .get();
    return result.exists;
  };

  //// set post ref
  const setPostRef = (postRef: PostRef) => {
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_POST_REF,
      payload: postRef,
    });
  };

  //// set need to fetch
  const setNeedToFetch = (needing: boolean) => {
    // dispatch action
    dispatch({
      type: PostsActionTypes.SET_NEED_FETCH,
      payload: needing,
    });
  };

  ////
  const setPostsType = (postsType: PostsTypes) => {
    dispatch({
      type: PostsActionTypes.SET_POSTS_TYPE,
      payload: postsType,
    });
  };
  return (
    <PostsContext.Provider
      value={{
        postsState,
        getTagList,
        fetchPosts,
        setPostsType,
        setPostRef,
        setPostIndex,
        clearPosts,
        getPostDetails0,
        getPostDetails,
        setPostDetails,
        setTagAndFilter,
        setTagIndex,
        appendTag,
        setFilterIndex,
        setCommunityIndex,
        upvote,
        submitPost,
        updatePost,
        bookmarkPost,
        fetchBookmarks,
        flagPost,
        fetchDatabaseState,
        updateFavoriteAuthor,
        fetchFavorites,
        isFavoriteAuthor,
        setNeedToFetch,
      }}>
      {children}
    </PostsContext.Provider>
  );
};

//// fetch posts using filter, tag, and start post reference
const _fetchPosts = async (
  filter: string,
  tag: string,
  startPostRef: PostRef,
  username?: string,
  limit?: number,
) => {
  console.log(
    '[fetchPosts] category, tag, startRef',
    filter,
    tag,
    startPostRef,
  );
  // fetch summary of posts
  const result = await fetchPostsSummary(
    filter,
    tag,
    startPostRef,
    username,
    limit + 1,
  );
  console.log('[_fetchPosts] fetched posts result', result);
  return result;
};

////
export { PostsContext, PostsProvider };
