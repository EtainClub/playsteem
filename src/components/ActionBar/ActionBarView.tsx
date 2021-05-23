//// react
import React from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Block, Icon, Button, Text, theme } from 'galio-framework';
// html render
const { width } = Dimensions.get('screen');
import { useIntl } from 'react-intl';
import Modal from 'react-native-modal';
import Slider from '@react-native-community/slider';
import { argonTheme } from '~/constants/argonTheme';

import { ActionBarStyle } from '~/constants/actionBarTypes';
import { PostState } from '~/contexts/types';
import ModalDropdown from 'react-native-modal-dropdown';
import { MAX_ACTIVE_VOTERS } from '~/constants';
import { TTS } from '~/components';

//// props
interface Props {
  postState: PostState;
  postIndex?: number;
  actionBarStyle: ActionBarStyle;
  username: string;
  isUser: boolean;
  showVotingModal: boolean;
  showDownvoting: boolean;
  showTTSModal: boolean;
  ttsText?: string;
  voting: boolean;
  downvoting: boolean;
  voteAmount: number;
  votingDollar: string;
  votingWeight: number;
  showOriginal: boolean;
  handleCancelVotingModal: () => void;
  handlePressVoteIcon: () => void;
  handleVotingSlidingComplete: (weight: number) => void;
  handlePressVoting: () => void;
  handlePressDownvote: () => void;
  handlePressComments?: () => void;
  handlePressEditPost?: () => void;
  handlePressEditComment?: () => void;
  handlePressBookmark?: () => void;
  handlePressResteem?: () => void;
  handlePressShare?: () => void;
  handlePressReply?: () => void;
  handlePressVoter?: (voter: string) => void;
  handlePressReblog?: () => void;
  handlePressTranslation?: () => void;
  handlePressSpeakIcon?: () => void;
}

const ActionBarView = (props: Props): JSX.Element => {
  // props
  const {
    actionBarStyle,
    postState,
    showDownvoting,
    showVotingModal,
    showTTSModal,
    ttsText,
    voting,
    downvoting,
    votingWeight,
  } = props;
  // language
  const intl = useIntl();

  // show only limited number of voters
  const _limitVoters = () => {
    let voters = postState.voters;
    // // limit the number of items
    if (postState.voters.length > MAX_ACTIVE_VOTERS) {
      voters = postState.voters.slice(0, MAX_ACTIVE_VOTERS);
      voters[MAX_ACTIVE_VOTERS] = `and ${postState.voters.length - MAX_ACTIVE_VOTERS
        } more`;
    }
    return voters;
  };

  //// render voting modal
  const _renderVotingModal = () => {
    // return if voting finishes
    if (postState.voted) return null;

    return (
      <Modal
        isVisible={showVotingModal}
        animationIn="zoomIn"
        animationOut="zoomOut"
        onBackdropPress={props.handleCancelVotingModal}>
        <Block card center style={styles.votingContainer}>
          <Text color={argonTheme.COLORS.ERROR}>
            {props.votingWeight} % ({props.votingDollar})
          </Text>

          <Slider
            style={{ width: width * 0.5, height: 40 }}
            value={votingWeight}
            onValueChange={(weight) =>
              props.handleVotingSlidingComplete(weight)
            }
            minimumValue={0}
            maximumValue={100}
            step={1}
          />
          <Icon
            size={40}
            color={argonTheme.COLORS.ERROR}
            name="upcircleo"
            family="antdesign"
            onPress={props.handlePressVoting}
          />
        </Block>
      </Modal>
    );
  };

  const _renderVoterRow = (option, index, isSelect) => (
    <View style={{ backgroundColor: argonTheme.COLORS.DEFAULT }}>
      <Text color="white" style={{ margin: 5 }}>
        {option}
      </Text>
    </View>
  );

  //// render tts modal
  const _renderTTSModal = () => {
    return <TTS text={ttsText} />;
  };

  //// render voting modal
  const _renderDownvotingModal = () => {
    // return if voting finishes
    if (postState.downvoted) return null;
    console.log('downvote modal. props', props);

    return (
      <Modal
        isVisible={showDownvoting}
        animationIn="zoomIn"
        animationOut="zoomOut"
        onBackdropPress={props.handleCancelVotingModal}>
        <Block card center style={styles.votingContainer}>
          <Text
            style={{
              borderBottomColor: 'red',
              borderBottomWidth: 5,
              marginBottom: 10,
            }}
            color="red"
            size={30}>
            {intl.formatMessage({ id: 'Actionbar.warning' })}
          </Text>
          <Text color={argonTheme.COLORS.FACEBOOK}>
            -{props.votingWeight} % ({props.votingDollar})
          </Text>
          <Slider
            style={{ width: width * 0.5, height: 40 }}
            value={100}
            onValueChange={(weight) =>
              props.handleVotingSlidingComplete(weight)
            }
            minimumValue={0}
            maximumValue={100}
            step={1}
          />
          <Text style={{ padding: 5 }} color="black">
            {intl.formatMessage({ id: 'Actionbar.downvote_warning' })}
          </Text>
          <Icon
            size={40}
            color={argonTheme.COLORS.FACEBOOK}
            name="downcircleo"
            family="antdesign"
            onPress={props.handlePressVoting}
          />
        </Block>
      </Modal>
    );
  };

  return (
    <Block>
      <Block row style={actionBarStyle.styles}>
        <Block row style={{ paddingRight: 5 }}>
          <Text
            size={actionBarStyle.textSize}
            color={argonTheme.COLORS.ERROR}
            style={{ paddingRight: 5 }}>
            {postState.payout}
          </Text>
          <Button
            onPress={props.handlePressVoteIcon}
            loading={voting}
            onlyIcon
            icon={postState.voted ? 'upcircleo' : 'upcircle'}
            iconFamily="antdesign"
            iconSize={actionBarStyle.iconSize}
            color={argonTheme.COLORS.ERROR}
            style={{
              margin: 0,
              padding: 0,
              top: 0,
              width: actionBarStyle.iconSize + 3,
              height: actionBarStyle.iconSize + 3,
            }}
          />
        </Block>
        <ModalDropdown
          //          options={postState.voters}
          options={_limitVoters()}
          renderRow={_renderVoterRow}
          dropdownStyle={{
            backgroundColor: argonTheme.COLORS.DEFAULT,
          }}
          onSelect={(index, value) => {
            const voter = value.split(' ')[0];
            props.handlePressVoter(voter);
          }}>
          <Block row style={{ paddingRight: 10 }}>
            <Icon
              size={actionBarStyle.iconSize}
              color={theme.COLORS.MUTED}
              name="chevron-up"
              family="material-community"
            />
            <Text size={actionBarStyle.textSize}>
              {postState.voters.length}
            </Text>
          </Block>
        </ModalDropdown>

        {actionBarStyle.reply ? (
          <Block row>
            <TouchableWithoutFeedback onPress={props.handlePressReply}>
              <Block row style={{ paddingRight: 10 }}>
                <Text size={actionBarStyle.textSize}>
                  {intl.formatMessage({ id: 'reply' })}
                </Text>
              </Block>
            </TouchableWithoutFeedback>
            {props.isUser && (
              <TouchableWithoutFeedback onPress={props.handlePressEditComment}>
                <Block row style={{ paddingRight: 10 }}>
                  <Text size={actionBarStyle.textSize}>
                    {intl.formatMessage({ id: 'edit' })}
                  </Text>
                </Block>
              </TouchableWithoutFeedback>
            )}
          </Block>
        ) : (
          <TouchableWithoutFeedback onPress={props.handlePressComments}>
            <Block row style={{ paddingRight: 10 }}>
              <Icon
                size={actionBarStyle.iconSize}
                color={theme.COLORS.MUTED}
                name="commenting-o"
                family="font-awesome"
                style={{ paddingRight: 2 }}
              />
              <Text size={actionBarStyle.textSize}>
                {postState.comment_count}
              </Text>
            </Block>
          </TouchableWithoutFeedback>
        )}
        {actionBarStyle.bookmark && (
          <TouchableWithoutFeedback onPress={props.handlePressBookmark}>
            <Block row style={{ paddingRight: 5 }}>
              <Icon
                size={actionBarStyle.iconSize}
                color={argonTheme.COLORS.ERROR}
                name={postState.bookmarked ? 'heart' : 'hearto'}
                family="antdesign"
                style={{ paddingHorizontal: 10 }}
              />
            </Block>
          </TouchableWithoutFeedback>
        )}
        {actionBarStyle.resteem && (
          <TouchableOpacity onPress={props.handlePressReblog}>
            <Block row style={{ paddingRight: 5 }}>
              <Icon
                size={actionBarStyle.iconSize}
                color={argonTheme.COLORS.ERROR}
                name="repeat"
                family="material-community"
                style={{ paddingHorizontal: 5 }}
              />
            </Block>
          </TouchableOpacity>
        )}
        {actionBarStyle.share && (
          <TouchableWithoutFeedback onPress={props.handlePressShare}>
            <Block row style={{ paddingRight: 5 }}>
              <Icon
                size={actionBarStyle.iconSize}
                color={argonTheme.COLORS.ERROR}
                name="sharealt"
                family="antdesign"
                style={{ paddingHorizontal: 5 }}
              />
            </Block>
          </TouchableWithoutFeedback>
        )}
        {actionBarStyle.translation && (
          <TouchableWithoutFeedback onPress={props.handlePressTranslation}>
            <Block row style={{ top: 0 }}>
              <Icon
                size={18}
                color={
                  props.showOriginal
                    ? argonTheme.COLORS.ERROR
                    : argonTheme.COLORS.FACEBOOK
                }
                name="translate"
                family="material-community"
                style={{ paddingHorizontal: 5 }}
              />
            </Block>
          </TouchableWithoutFeedback>
        )}
        {actionBarStyle.read && (
          <Icon
            size={18}
            color={argonTheme.COLORS.ERROR}
            name="sound"
            family="antdesign"
            style={{ paddingHorizontal: 5 }}
            onPress={props.handlePressSpeakIcon}
          />
        )}
        {actionBarStyle.bookmark && props.isUser && (
          <Icon
            size={18}
            color={argonTheme.COLORS.ERROR}
            name="pencil"
            family="font-awesome"
            style={{ paddingHorizontal: 5 }}
            onPress={props.handlePressEditPost}
          />
        )}
        {actionBarStyle.downvote && (
          <Button
            onPress={props.handlePressDownvote}
            loading={downvoting}
            onlyIcon
            icon={postState.downvoted ? 'downcircleo' : 'downcircle'}
            iconFamily="antdesign"
            iconSize={actionBarStyle.iconSize}
            color={argonTheme.COLORS.FACEBOOK}
            style={{
              marginHorizontal: 5,
              padding: 0,
              top: actionBarStyle.bookmark ? 0 : -7,
              width: actionBarStyle.iconSize + 3,
              height: actionBarStyle.iconSize + 3,
            }}
          />
        )}
      </Block>
      {showVotingModal && _renderVotingModal()}
      {showDownvoting && _renderDownvotingModal()}
      {showTTSModal && _renderTTSModal()}
    </Block>
  );
};

export { ActionBarView };

const styles = StyleSheet.create({
  votingContainer: {
    width: '80%',
    height: 'auto',
    backgroundColor: theme.COLORS.WHITE,
    paddingVertical: 10,
  },
  signContainer: {
    width: '100%',
    height: 'auto',
    backgroundColor: theme.COLORS.WHITE,
    paddingVertical: 10,
  },
});
