import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
//// react navigation
import { useFocusEffect } from '@react-navigation/native';
import { firebase } from '@react-native-firebase/functions';
//// storage
import AsyncStorage from '@react-native-community/async-storage';
import { useIntl } from 'react-intl';
import {
  AuthContext,
  PostsContext,
  SettingsContext,
  UIContext,
  UserContext,
} from '~/contexts';
import { PostingScreen } from '../screen/Posting';
import { fetchRawPost } from '~/providers/steem/dsteemApi';
import { Discussion } from '@hiveio/dhive';
import { PostingContent, StorageSchema } from '~/contexts/types';
//// navigation
import { navigate } from '~/navigation/service';
//// UIs
import { Block } from 'galio-framework';
//// components
import { Beneficiary } from '~/components';
import { BeneficiaryItem } from '~/components/Beneficiary/BeneficiaryContainer';
//// constants
import { BENEFICIARY_WEIGHT, MAX_NUM_TAGS, MAX_TAGS_HISTORY, POSTING_POSTFIX, VOTING_DELAY_MILLS } from '~/constants';
// types
import { PostRef, PostsState, PostsTypes } from '~/contexts/types';
//// utils
import renderPostBody from '~/utils/render-helpers/markdown-2-html';
import {
  addPostingOptions,
  extractMetadata,
  generatePermlink,
  makeJsonMetadata,
} from '~/utils/editor';

// 5%
const DEFAULT_BENEFICIARY: BeneficiaryItem = {
  account: 'playsteemit',
  weight: BENEFICIARY_WEIGHT,
};

const PAYOUT_OPTIONS = ['sp50sbd50', 'powerup', 'decline'];

interface Props {
  navigation: any;
  route: any;
}
const Posting = (props: Props): JSX.Element => {
  //// props
  const { navigation } = props;
  //// language
  const intl = useIntl();
  //// contexts
  const { authState } = useContext(AuthContext);
  const { uiState, setToastMessage, setEditMode } = useContext(UIContext);
  const {
    postsState,
    submitPost,
    setTagAndFilter,
    setCommunityIndex,
    setNeedToFetch,
  } = useContext(PostsContext);
  const { userState, getFollowings } = useContext(UserContext);
  const { settingsState, updateSettingSchema } = useContext(SettingsContext);
  // states
  //  const [editMode, setEditMode] = useState(route.params?.editMode);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [tags, setTags] = useState('');
  const [tagsHistory, setTagsHistory] = useState([]);
  const [hideTagsHistory, setHideTagsHistory] = useState(false);
  const [tagMessage, setTagMessage] = useState('');
  const [rewardIndex, setRewardIndex] = useState(0);

  const [originalPost, setOriginalPost] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [filteredFollowings, setFilteredFollowings] = useState([]);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showAuthorsModal, setShowAuthorsModal] = useState(false);
  const [clearBody, setClearBody] = useState(false);

  //// event: username change
  useEffect(() => {
    // get following
    if (authState.loggedIn) {
      const { username } = authState.currentCredentials;

      // get draft only if not edit mode
      if (!uiState.editMode) {
        console.log('effect. currentCredentials');
        _getDraftFromStorage();
      }
      // get following list
      _getFollowingList(username);
      // initialize beneficiaries
      _initBeneficiaries();
      // get community index
      _setCommunityIndex();
      // get tags history of the user
      _getPostingTagsHistory();
    }
  }, [authState.currentCredentials]);

  //// event: focus
  useFocusEffect(
    useCallback(() => {
      if (authState.loggedIn) {
        if (!uiState.editMode) {
          console.log('effect. focus callback');
          _getDraftFromStorage();
        }
        // get tags history of the user
        _getPostingTagsHistory();
      }
    }, []),
  );

  //// event: edit mode
  useEffect(() => {
    console.log('[Posting] edit event. uiState', uiState);
    const { username } = authState.currentCredentials;
    if (uiState.editMode) {
      const { postDetails } = postsState;
      // check if original post exists
      // get the post details
      setOriginalPost(postDetails);

      console.log('edit mode. postDetails', postDetails);
      // set title
      setTitle(postDetails.state.title);
      // set body
      setBody(postDetails.markdownBody);
      // tags
      try {
        const _tags = postDetails.metadata.tags.reduce(
          (tagString, tag) => tagString + tag + ' ',
          '',
        );
        setTags(_tags);
      } catch (error) {
        console.log('no tags in meta data');
        // TODO: need to change post fetching api and update the post data model
        // use category data
        //        setTags(postDetails.state)
      }

      // get html from markdown
      const _body = renderPostBody(postDetails.markdownBody, true);
      // set preview
      setPreviewBody(_body);
    } else {
      // no need to get draft in this event
      //      console.log('effect. editMode');
      //      _getDraftFromStorage();
    }
  }, [uiState.editMode]);

  //// on blur event
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('[Posting] blur event. uiState', uiState);
      // reset edit mode before go back
      setEditMode(false);
    });
    return unsubscribe;
  }, [navigation]);

  //// event: title, body, tags change
  useEffect(() => {
    if (title || body || tags) _saveDraft(title, body, tags);
  }, [title, body, tags]);
  //// event: clear body in editor
  useEffect(() => {
    // toggle the clear body state
    if (clearBody) setClearBody(false);
  }, [clearBody]);

  //// initialize beneficiary
  const _initBeneficiaries = () => {
    const { username } = authState.currentCredentials;

    // add default beneficairy
    if (username === 'playsteemit') {
      setBeneficiaries([
        { account: username, weight: 5000 },
        { account: 'etainclub', weight: 5000 },
      ]);
    } else {
      const userWeight = 10000 - DEFAULT_BENEFICIARY.weight;
      setBeneficiaries([
        DEFAULT_BENEFICIARY,
        { account: username, weight: userWeight },
      ]);
    }
  };

  //// get followings
  const _getFollowingList = async (username: string) => {
    const _followings = await getFollowings(username);
    setFollowingList(_followings);
    setFilteredFollowings(_followings);
  };

  //// set community index to posts state
  const _setCommunityIndex = () => {
    // get community index from settings
    const { communityIndex } = settingsState.ui;
    // set it to the posts state community
    setCommunityIndex(communityIndex);
  };

  //// handle press post
  const _handlePressPostSubmit = async () => {
    // check logged in
    if (!authState.loggedIn) return;

    // get community index from postsState
    const { communityIndex } = postsState;

    // check sanity: title, body
    if (!body || !title) {
      setToastMessage(intl.formatMessage({ id: 'Posting.missing' }));
      return;
    }
    let _tagString = tags;
    // get community tag. check if it is a blog
    if (communityIndex !== 0) {
      // put the community tag at first for the new post
      if (!originalPost) {
        _tagString = `${postsState.communityList[communityIndex][0]} ${tags}`;
      }
    } else {
      // check sanity: tags
      if (!_tagString) {
        setToastMessage(intl.formatMessage({ id: 'Posting.missing' }));
        return;
      }
    }

    // check validity of tags
    if (tagMessage !== '') {
      setToastMessage(intl.formatMessage({ id: 'Posting.tag_error' }));
      return;
    }

    ////// build a post
    // author is the user
    const { username, password } = authState.currentCredentials;
    // extract meta
    const _meta = extractMetadata(body);
    // split tags by space
    let _tags = _tagString.split(' ');
    // filter out empty tags
    _tags = _tags.filter((tag) => tag && tag !== ' ');
    const jsonMeta = makeJsonMetadata(_meta, _tags);
    let permlink = '';
    let options = null;
    // generate permlink for a new post
    if (!originalPost) {
      permlink = generatePermlink(title);
      //// check duplicate permlink, if so generate a random
      let duplicate: Discussion = await fetchRawPost(username, permlink);
      if (duplicate && duplicate.id) {
        permlink = generatePermlink(title, true);
      }
      // add options such as beneficiaries
      options = addPostingOptions(
        username,
        permlink,
        PAYOUT_OPTIONS[rewardIndex],
        beneficiaries,
      );
      console.log('_handlePressPostSumbit. options', options);
    }
    // build posting content
    const postingContent: PostingContent = {
      author: username,
      title: title,
      body: body,
      parent_author: '',
      parent_permlink: _tags[0],
      json_metadata: JSON.stringify(jsonMeta) || '',
      permlink: permlink,
    };
    //// update post if original post exists
    if (originalPost) {
      console.log('[updatePost] originalPost', originalPost);
      // TODO: use submitPost after patching instead of updatePost
      // patch = utils editors createPatch
      postingContent.permlink = originalPost.state.post_ref.permlink;
      postingContent.parent_permlink = originalPost.state.parent_ref.permlink;
      console.log('[updatePost] postingContent', postingContent);
      // TODO: update the post
      _submitPost(postingContent, communityIndex, options, username, password);
    } else {
      //// show confirm modal
      Alert.alert(
        intl.formatMessage({ id: 'Posting.confirm_title' }),
        intl.formatMessage(
          { id: 'Posting.community' },
          { what: postsState.communityList[communityIndex][1] },
        ),
        [
          {
            text: intl.formatMessage({ id: 'no' }),
            onPress: () => { },
            style: 'cancel',
          },
          {
            text: intl.formatMessage({ id: 'yes' }),
            onPress: () => {
              // add postfix
              postingContent.body += POSTING_POSTFIX;
              _submitPost(
                postingContent,
                communityIndex,
                options,
                username,
                password,
              );
            }
          },
        ],
        { cancelable: true },
      );
    }
  };

  const _submitPost = async (
    postingContent: PostingContent,
    communityIndex: number,
    options: any[],
    username: string,
    password: string,
  ) => {
    // set loading for posting
    setPosting(true);

    //// submit the post
    const result = await submitPost(postingContent, password, false, options);
    if (result) {
      console.log('[posting] result', result);
      // save the posting tags to storage
      _savePostingTags(tags);
      // TODO: clear the title, body, and tags, beneficiary
      // initialie beneficiaries
      if (username === 'playsteemit') {
        setBeneficiaries([
          { account: username, weight: 5000 },
          { account: 'etainclub', weight: 5000 },
        ]);
      } else {
        setBeneficiaries([
          DEFAULT_BENEFICIARY,
          {
            account: username,
            weight: 10000 - DEFAULT_BENEFICIARY.weight,
          },
        ]);
      }

      ////// post process

      //// auto vote the post
      // get the last voting time from storage
      // if it is within 24h, then request auto voting right away
      // when the response of the request is received, then updat the last voting time from storage
      // what if a user has multiple accounts? store the voting time with the account

      // if it is not within 24h, request auto voting by setting timer
      // how to get response? and update the voting time??
      // store the voting time in firebase


      // store the community and posting indices in settings
      const postingSetting = {
        ...settingsState.ui,
        communityIndex,
        payoutIndex: rewardIndex,
      };
      // update the posting setting
      updateSettingSchema(username, StorageSchema.UI, postingSetting);

      // set tag to all
      setTagAndFilter(
        communityIndex !== 0 ? communityIndex + 1 : 1, // community : all
        0, // created
        PostsTypes.FEED,
        authState.currentCredentials.username,
      );
      // clear posting flag
      setPosting(false);
      // clear all
      _clearAll();

      //// request to send push and to vote
      // only for new post (not updating the post)
      if (!originalPost) {
        //// request push notification to followers
        // post author and permlink      
        // const pushOptions = {
        //   author: postingContent.author,
        //   permlink: postingContent.permlink,
        // };
        // // request to send push
        // try {
        //   firebase
        //     .functions()
        //     .httpsCallable('pushNewPostRequest')(pushOptions);
        //   console.log('requested push message');
        // } catch (error) {
        //   console.error('failed to request push for a new post.', error);
        // }
        //// request to vote
        const voteOptions = {
          author: postingContent.author,
          permlink: postingContent.permlink,
        };
        try {
          // request to vote with delaying time
          setTimeout(() => {
            firebase
              .functions()
              .httpsCallable('voteRequest')(voteOptions)
              .then((result) => {
                console.log('Posting. submitPost. vote Request result', result.data);
                if (result.data) {
                  console.log('Posting. submitPost. vote Request result', result.data);
                  setToastMessage(result.data);
                } else {
                  setToastMessage('Voting Requested!');
                }
              });
          }, VOTING_DELAY_MILLS);
        } catch (error) {
          console.error('failed to request vote', error);
        }
      }

      // navigate feed. need to refresh
      navigate({ name: 'Feed' });
      return;
    }
    // clear posting flag
    setPosting(false);
    // toast message: failed
    setToastMessage(intl.formatMessage({ id: 'failed' }));
  };

  const _handlePressBeneficiary = () => {
    console.log('_handlePressBeneficiary');
    setShowBeneficiaryModal(true);
  };

  const _getBeneficiaries = (_beneficiaries: any[]) => {
    console.log('[Posting] Beneficiaries', _beneficiaries);
    setBeneficiaries(_beneficiaries);
    // reset show beneficiary flag
    setShowBeneficiaryModal(false);
  };

  const _cancelBeneficiary = () => {
    setShowBeneficiaryModal(false);
  };

  const _handleTitleChange = (text: string) => {
    const _text = text.replace(/\r?\n|\r/, '');
    // check validity: max-length
    setTitle(_text);
  };

  const _handleBodyChange = (_body: string) => {
    // set body
    setBody(_body);
    // set preview
    const _preview = renderPostBody(_body, true);
    setPreviewBody(_preview);
  };

  const _handleTagsChange = (_tags: string, _hideList?: boolean) => {
    // TODO filter the result
    // check validity: maximum tags, wrong tag, max-length-per-tag
    setTags(_tags);
    const tagString = _tags.replace(/,/g, ' ').replace(/#/g, '');
    let cats = tagString.split(' ');
    // validate
    _validateTags(cats);

    // hide tags list
    if (_hideList) setHideTagsHistory(true);
    else setHideTagsHistory(false);
  };

  //// handle reward option chnage
  const _handleRewardChange = (index: number) => {
    console.log('_handleRewardChange index', index);
    setRewardIndex(index);
  };

  //// validate the tags
  const _validateTags = (tags: string[]) => {
    if (tags.length > 0) {
      tags.length > MAX_NUM_TAGS
        ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_tags' }))
        : tags.find((c) => c.length > 24)
          ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_length' }))
          : tags.find((c) => c.split('-').length > 2)
            ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_dash' }))
            : tags.find((c) => c.indexOf(',') >= 0)
              ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_space' }))
              : tags.find((c) => /[A-Z]/.test(c))
                ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_lowercase' }))
                : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
                  ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_characters' }))
                  : tags.find((c) => !/^[a-z-#]/.test(c))
                    ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_firstchar' }))
                    : tags.find((c) => !/[a-z0-9]$/.test(c))
                      ? setTagMessage(intl.formatMessage({ id: 'Posting.limited_lastchar' }))
                      : setTagMessage('');
    }
  };

  //// save draft
  const _saveDraft = (_title: string, _body: string, _tags: string) => {
    console.log('_saveDraft');
    const { username } = authState.currentCredentials;
    const data = {
      title: _title,
      body: _body,
      tags: _tags,
    };
    _setItemToStorage(`${username}_${StorageSchema.DRAFT}`, data);
  };

  //// save posting tags
  const _savePostingTags = async (newTags: string) => {
    console.log('_savePostingTags. newTags', newTags);

    const { username } = authState.currentCredentials;
    // get the current history
    const key = `${username}_${StorageSchema.POSTING_TAGS}`;

    const _history = await _getItemFromStorage(key);
    console.log('_savePostingTags. key, previous history', key, _history);

    // save the new tags if the history is empty
    if (!_history) {
      _setItemToStorage(key, [newTags]);
      return;
    }
    // check if the tags is unique
    if (_history && _history.includes(newTags)) return;
    // append the new tags and limit the number
    const history = [newTags, ..._history].slice(0, MAX_TAGS_HISTORY);
    console.log('_savePostingTags. new history', history);
    // set
    _setItemToStorage(key, history);
  };

  const _setItemToStorage = async (key: string, data: any) => {
    console.log('_setItemToStorage. key, data', key, data);
    // check sanity
    if (!data) return;
    // stringify the data
    const dataString = JSON.stringify(data);
    try {
      await AsyncStorage.setItem(key, dataString);
    } catch (error) {
      console.log('failed to save item in storage', key, error);
    }
  };

  const _getItemFromStorage = async (key: string) => {
    try {
      const _data = await AsyncStorage.getItem(key);
      const data = JSON.parse(_data);
      return data;
    } catch (error) {
      console.log('failed to get item from storage', error);
      return null;
    }
  };

  //// get posting tags history from storage
  const _getPostingTagsHistory = async () => {
    const { username } = authState.currentCredentials;
    // get the current history
    const key = `${username}_${StorageSchema.POSTING_TAGS}`;

    // @test
    //    await AsyncStorage.removeItem(key);

    const history = await _getItemFromStorage(key);
    if (history) setTagsHistory(history);
    else setTagsHistory([]);
    console.log('_getPostingTagsHistory', history);
  };

  //// get a single item from storage
  const _getDraftFromStorage = async () => {
    // check sanity
    if (uiState.editMode) {
      return;
    }

    const { username } = authState.currentCredentials;
    const key = `${username}_${StorageSchema.DRAFT}`;
    const data = await _getItemFromStorage(key);
    console.log('_getDraftFromStorage. data', data);
    // update states
    if (data) {
      setTitle(data.title);
      setBody(data.body);
      setTags(data.tags);
    }
  };

  //// handle clear all
  const _handleClearAll = () => {
    // alert
    Alert.alert(
      'Clear All',
      'Are you sure?',
      [
        {
          text: 'No',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            // clear contents
            _clearAll();
          }
        },
      ],
      { cancelable: true },
    );
  }

  //// clear contents
  const _clearAll = () => {
    console.log('handleClearAll');
    // clear title
    setTitle('');
    // clear body
    setBody('');
    // clear tags
    setTags('');
    // clear preview
    setPreviewBody('');
    // clear beneficiary
    _initBeneficiaries();
    // clear tag message
    setTagMessage('');
    // clear body of editor
    setClearBody(true);
    // clear original post
    setOriginalPost(null);
    // clear draft
    _saveDraft('', '', '');
  };

  const _handleCancelEditing = () => {
    // alert
    Alert.alert(
      'Cancel Editing',
      'Are you sure?',
      [
        {
          text: 'No',
          onPress: () => { },
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            // reset edit mode
            setEditMode(false);
            // clear contents
            _clearAll();
            // go back
            navigation.goBack();
          }
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Block>
      <PostingScreen
        loggedIn={authState.loggedIn}
        title={title}
        body={body}
        tags={tags}
        tagsHistory={tagsHistory || []}
        hideTagsHistory={hideTagsHistory}
        editMode={uiState.editMode}
        previewBody={previewBody}
        rewardIndex={rewardIndex}
        tagMessage={tagMessage}
        uploading={uploading}
        uploadedImage={uploadedImage}
        posting={posting}
        clearBody={clearBody}
        handleTitleChange={_handleTitleChange}
        handleBodyChange={_handleBodyChange}
        handleTagsChange={_handleTagsChange}
        handleRewardChange={_handleRewardChange}
        handlePressPostSubmit={_handlePressPostSubmit}
        followingList={filteredFollowings}
        handlePressBeneficiary={_handlePressBeneficiary}
        handleClearAll={_handleClearAll}
        handleCancelEditing={_handleCancelEditing}
      />
      {showBeneficiaryModal && (
        <Beneficiary
          showModal={showBeneficiaryModal}
          username={authState.currentCredentials.username}
          beneficiaries={beneficiaries}
          sourceList={followingList}
          getBeneficiaries={_getBeneficiaries}
          handleCancel={_cancelBeneficiary}
        />
      )}
    </Block>
  );
};

export { Posting };
