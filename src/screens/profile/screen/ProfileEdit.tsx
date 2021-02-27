//// react
import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  ImageBackground,
  Platform,
  FlatList,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
//// react navigation
import {navigate} from '~/navigation/service';
//// language
import {useIntl} from 'react-intl';
//// ui, styles
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import ActionSheet from 'react-native-actions-sheet';
import {materialTheme, Images, argonTheme} from '~/constants/';
const {width, height} = Dimensions.get('screen');
import {HeaderHeight} from '~/constants/utils';
//// components
import {ImageUpload} from '~/components';
//// contexts
import {PostData, PostRef, PostsTypes, ProfileData} from '~/contexts/types';
//// etc

//// props
interface Props {
  name: string;
  about: string;
  location: string;
  website: string;
  uploading: boolean;
  updating: boolean;
  avatarUrl: string;
  handleNameChange: (name: string) => void;
  handleAboutChange: (about: string) => void;
  handleLocationChange: (location: string) => void;
  handleWebsiteChange: (website: string) => void;
  handlePressUpdate: () => void;
  handlePressCancel: () => void;
  handleUploadedImageURL: (url: string) => void;
}
//// component with default props
const ProfileEditForm = (props: Props): JSX.Element => {
  //// props
  const {name, about, location, website, avatarUrl} = props;
  //// language
  const intl = useIntl();

  return (
    <Block flex style={styles.profileScreen}>
      <ImageBackground
        source={Images.ProfileBackground}
        style={styles.profileContainer}
        imageStyle={styles.profileBackground}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{marginTop: '1%'}}>
          <Block flex style={styles.profileCard}>
            <Block middle style={styles.avatarContainer}>
              <Block row>
                <Image
                  source={{
                    uri: avatarUrl || null,
                  }}
                  style={[styles.avatar, {left: 10}]}
                />
                <Block style={{position: 'absolute', left: 80, top: 80}}>
                  <ImageUpload
                    isComment={false}
                    containerStyle={{right: true}}
                    getImageURL={props.handleUploadedImageURL}
                  />
                </Block>
              </Block>
            </Block>
          </Block>
          <Block card center>
            <Input
              borderless
              color="white"
              placeholder={intl.formatMessage({id: 'Profile.display_name'})}
              placeholderTextColor={theme.COLORS.PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              bgColor="transparent"
              style={[styles.input, styles.inputActive]}
              defaultValue={name}
              onChangeText={props.handleNameChange}
            />
            <Input
              borderless
              color="white"
              placeholder={intl.formatMessage({id: 'Profile.introduction'})}
              placeholderTextColor={theme.COLORS.PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              bgColor="transparent"
              style={[styles.input, styles.inputActive]}
              defaultValue={about}
              onChangeText={props.handleAboutChange}
            />
            <Input
              borderless
              color="white"
              placeholder={intl.formatMessage({id: 'Profile.location'})}
              placeholderTextColor={theme.COLORS.PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              bgColor="transparent"
              style={[styles.input, styles.inputActive]}
              defaultValue={location}
              onChangeText={props.handleLocationChange}
            />
            <Input
              borderless
              color="white"
              placeholder={intl.formatMessage({id: 'Profile.website'})}
              placeholderTextColor={theme.COLORS.PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              bgColor="transparent"
              style={[styles.input, styles.inputActive]}
              defaultValue={website}
              onChangeText={props.handleWebsiteChange}
            />
            <Block row space="around">
              <Button
                onPress={props.handlePressUpdate}
                loading={props.updating}
                center
                style={{
                  padding: 0,
                  width: 100,
                  backgroundColor: argonTheme.COLORS.STEEM,
                }}>
                {intl.formatMessage({id: 'Profile.update_button'})}
              </Button>
              <Button
                onPress={props.handlePressCancel}
                center
                style={{
                  padding: 0,
                  width: 100,
                  backgroundColor: argonTheme.COLORS.MUTED,
                }}>
                {intl.formatMessage({id: 'Profile.profile_cancel_button'})}
              </Button>
            </Block>
          </Block>
        </ScrollView>
      </ImageBackground>
    </Block>
  );
};

export {ProfileEditForm};

const styles = StyleSheet.create({
  profileScreen: {
    marginTop: Platform.OS === 'android' ? -HeaderHeight / 100 : 0,
    flex: 1,
  },
  profileContainer: {
    width: width,
    height: height,
    padding: 0,
    zIndex: 1,
    flex: 1,
  },
  profileBackground: {
    width: width,
    height: '100%',
    flex: 1,
  },
  profileCard: {
    // position: "relative",
    padding: theme.SIZES.BASE,
    marginHorizontal: theme.SIZES.BASE,
    marginTop: 65,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: theme.COLORS.WHITE,
    shadowColor: 'black',
    shadowOffset: {width: 0, height: 0},
    shadowRadius: 8,
    shadowOpacity: 0.2,
    zIndex: 2,
  },
  stats: {
    paddingHorizontal: 40,
    backgroundColor: theme.COLORS.WHITE,
  },
  avatarContainer: {
    position: 'relative',
    marginTop: -80,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 0,
  },
  input: {
    width: width * 0.9,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: materialTheme.COLORS.PLACEHOLDER,
  },
  inputActive: {
    borderBottomColor: 'white',
  },
});
