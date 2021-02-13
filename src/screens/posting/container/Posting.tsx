import React, {useState, useContext, useEffect} from 'react';
import {useIntl} from 'react-intl';
import ImagePicker, {ImageOrVideo} from 'react-native-image-crop-picker';
import {AuthContext, PostsContext, UIContext, UserContext} from '~/contexts';
import {PostingScreen} from '../screen/Posting';
import {fetchRawPost} from '~/providers/steem/dsteemApi';
import {Discussion} from '@hiveio/dhive';
import {PostingContent} from '~/contexts/types';
//// navigation
import {navigate} from '~/navigation/service';
//// UIs
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
//// components
import {Beneficiary, AuthorList} from '~/components';
import {BeneficiaryItem} from '~/components/Beneficiary/BeneficiaryContainer';
//// constants
import {BENEFICIARY_WEIGHT, MAX_NUM_TAGS} from '~/constants';
// types
import {PostRef, PostsState, PostsTypes} from '~/contexts/types';
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

interface Props {
  navigation: any;
  route: any;
}
const Posting = (props: Props): JSX.Element => {
  //// props
  const {navigation} = props;
  //// language
  const intl = useIntl();
  //// contexts
  const {authState} = useContext(AuthContext);
  const {uiState, setToastMessage, setEditMode} = useContext(UIContext);
  const {
    postsState,
    appendTag,
    submitPost,
    setTagIndex,
    setFilterIndex,
    setTagAndFilter,
    updatePost,
  } = useContext(PostsContext);
  const {userState, getFollowings} = useContext(UserContext);
  // states
  //  const [editMode, setEditMode] = useState(route.params?.editMode);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [tags, setTags] = useState('');
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

  //// event: mount
  useEffect(() => {
    // get following
    if (authState.loggedIn) {
      const {username} = authState.currentCredentials;
      // get following list
      _getFollowingList(username);
      // initialize beneficiaries
      _initBeneficiaries();
    }
  }, []);
  //// event: edit mode
  useEffect(() => {
    //
    if (uiState.editMode) {
      const {postDetails} = postsState;
      // check if original post exists
      // get the post details
      setOriginalPost(postDetails);
      // set title
      setTitle(postDetails.state.title);
      // set body
      setBody(postDetails.markdownBody);
      // tags
      const _tags = postDetails.metadata.tags.reduce(
        (tagString, tag) => tagString + tag + ' ',
        '',
      );
      setTags(_tags);
      // get html from markdown
      const _body = renderPostBody(postDetails.markdownBody, true);
      // set preview
      setPreviewBody(_body);
    }
  }, [uiState.editMode]);

  //// on blur event
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('[Posting] blur event. uiState', uiState);
      // reset edit mode before go back
      if (uiState.editMode) {
        setEditMode(false);
      }
    });
    return unsubscribe;
  }, [navigation]);

  //// event: clear body in editor
  useEffect(() => {
    // toggle the clear body state
    if (clearBody) setClearBody(false);
  }, [clearBody]);

  //// initialize beneficiary
  const _initBeneficiaries = () => {
    const {username} = authState.currentCredentials;

    // add default beneficairy
    if (username === 'playsteemit') {
      setBeneficiaries([
        {account: username, weight: 5000},
        {account: 'etainclub', weight: 5000},
      ]);
    } else {
      const userWeight = 10000 - DEFAULT_BENEFICIARY.weight;
      setBeneficiaries([
        DEFAULT_BENEFICIARY,
        {account: username, weight: userWeight},
      ]);
    }
  };

  //// get followings
  const _getFollowingList = async (username: string) => {
    const _followings = await getFollowings(username);
    setFollowingList(_followings);
    setFilteredFollowings(_followings);
  };

  //// handle press post
  const _handlePressPostSubmit = async () => {
    // check sanity: title, body, tags
    if (!tags || !body || !title) {
      setToastMessage(intl.formatMessage({id: 'Posting.missing'}));
      return;
    }

    // check validity of tags
    if (tagMessage !== '') {
      setToastMessage(intl.formatMessage({id: 'Posting.tag_error'}));
      return;
    }

    // set loading for posting
    setPosting(true);

    ////// build a post
    // author is the user
    const {username, password} = authState.currentCredentials;
    // extract meta
    const _meta = extractMetadata(body);
    // split tags by space
    let _tags = tags.split(' ');
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
      options = addPostingOptions(username, permlink, 'powerup', beneficiaries);
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
    let success = false;
    let message = '';
    if (originalPost) {
      console.log('[updatePost] originalPost', originalPost);
      // TODO: use submitPost after patching instead of updatePost
      // patch = utils editors createPatch
      postingContent.permlink = originalPost.state.post_ref.permlink;
      postingContent.parent_permlink = originalPost.state.parent_ref.permlink;
      console.log('[updatePost] postingContent', postingContent);
    }

    //// submit the post
    const result = await submitPost(postingContent, password, false, options);
    if (result) {
      console.log('[posting] result', result);
      // TODO: clear the title, body, and tags, beneficiary
      // initialie beneficiaries
      if (username === 'playsteemit') {
        setBeneficiaries([
          {account: username, weight: 5000},
          {account: 'etainclub', weight: 5000},
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

      ////
      // set tag to all
      setTagAndFilter(
        1,
        1,
        PostsTypes.FEED,
        authState.currentCredentials.username,
      );
      // setTagIndex(1, PostsTypes.FEED, authState.currentCredentials.username);
      // set filter to created
      // setFilterIndex(1, authState.currentCredentials.username);
      // navigate feed
      navigate({name: 'Feed'});
    }
    //// TODO: update post details.. here or in postsContext

    // toast message
    setToastMessage(message);
    // clear posting flag
    setPosting(false);

    //// navigate
    if (success) {
      // append tag
      appendTag(_tags[0]);
      // set tag param
      //      setTagParam(_tags[0]);
      // navigate to the feed with the first tag
      navigate({name: 'Feed'});
    }
  };

  const _handlePressBeneficiary = () => {
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
    // check validity: max-length
    setTitle(text);
  };

  const _handleBodyChange = (_body: string) => {
    // set body
    setBody(_body);
    // set preview
    const _preview = renderPostBody(_body, true);
    setPreviewBody(_preview);
  };

  const _handleTagsChange = (_tags: string) => {
    // check validity: maximum tags, wrong tag, max-length-per-tag
    setTags(_tags);
    const tagString = _tags.replace(/,/g, ' ').replace(/#/g, '');
    let cats = tagString.split(' ');
    // validate
    _validateTags(cats);
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
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_tags'}))
        : tags.find((c) => c.length > 24)
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_length'}))
        : tags.find((c) => c.split('-').length > 2)
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_dash'}))
        : tags.find((c) => c.indexOf(',') >= 0)
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_space'}))
        : tags.find((c) => /[A-Z]/.test(c))
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_lowercase'}))
        : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_characters'}))
        : tags.find((c) => !/^[a-z-#]/.test(c))
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_firstchar'}))
        : tags.find((c) => !/[a-z0-9]$/.test(c))
        ? setTagMessage(intl.formatMessage({id: 'Posting.limited_lastchar'}))
        : setTagMessage('');
    }
  };

  //// clear contents
  const _handleClearAll = () => {
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
    setOriginalPost('');
  };

  const _handleCancelEditing = () => {
    // reset edit mode
    setEditMode(false);
    // clear contents
    _handleClearAll();
    // go back
    navigation.goBack();
  };

  return (
    <Block>
      <PostingScreen
        title={title}
        body={body}
        tags={tags}
        previewBody={previewBody}
        rewardIndex={rewardIndex}
        tagMessage={tagMessage}
        originalPost={originalPost}
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

export {Posting};
