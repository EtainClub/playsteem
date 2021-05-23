//// react
import React, { useState, useEffect, useContext, useRef } from 'react';
//// react native
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Linking,
} from 'react-native';
//// config
import Config from 'react-native-config';
//// language
import { useIntl } from 'react-intl';
//// blockchain api
import { signImage, uploadImage } from '~/providers/steem';
//// ui
import { Block, Button, Input, Text, theme, Icon } from 'galio-framework';
import ImagePicker, { ImageOrVideo } from 'react-native-image-crop-picker';
import { argonTheme } from '~/constants';
const { width, height } = Dimensions.get('window');
import { AuthContext, UIContext } from '~/contexts';
//// view
import { ImageUploadView } from './ImageUploadView';

interface Props {
  isComment: boolean;
  containerStyle: any;
  getImageURL: (url: string) => void;
}
const ImageUploadContainer = (props: Props): JSX.Element => {
  //// props
  //// language
  const intl = useIntl();
  //// contexts
  const { authState } = useContext(AuthContext);
  const { setToastMessage } = useContext(UIContext);
  //// states
  const [uploading, setUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [closeActionSheet, setCloseActionSheet] = useState(false);
  //// refs
  // photo

  ////
  const _handlePhotoUpload = () => {
    console.log('[_handlePhotoUpload]');
    // reset close action sheet flag
    setCloseActionSheet(false);
    ImagePicker.openPicker({
      includeBase64: true,
      multiple: true,
      mediaType: 'photo',
      smartAlbums: ['UserLibrary', 'Favorites', 'PhotoStream', 'Panoramas', 'Bursts'],
      compressImageMaxWidth: 1280,
    })
      .then((images) => {
        console.log('[_handlePhotoUpload]. selected images', images);
        _handleImageUpload(images);
      })
      .catch((error) => {
        _handleSelectionFailure(error);
      });
  };

  ////
  const _handleCameraUpload = () => {
    // reset close action sheet flag
    setCloseActionSheet(false);
    //    console.log('[_handleCameraUpload]');
    ImagePicker.openCamera({
      includeBase64: true,
      mediaType: 'photo',
      compressImageMaxWidth: 1280,
    })
      .then((image) => {
        //        console.log('[_handleCameraUpload]. selected images', image);
        _handleImageUpload([image]);
      })
      .catch((error) => {
        _handleSelectionFailure(error);
      });
  };

  //// handle selection failure
  const _handleSelectionFailure = (error) => {
    console.log('[_handleSelectionFailure]. error', error);
    // close action sheet
    setCloseActionSheet(true);
  };

  //// handle image upload
  const _handleImageUpload = async (images: any) => {
    //    console.log('[ImageUpload] _uploadPhoto. images', images);
    // close action sheet
    setCloseActionSheet(true);
    //
    setUploading(true);
    // check logged in
    if (!authState.loggedIn) {
      setUploading(false);
      return;
    }
    // get username and key
    const { username, password } = authState.currentCredentials;

    /// loop over the images
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await _uploadImage(images[i], username, password);
      }
    }
  }

  //// upload images
  const _uploadImage = async (image: ImageOrVideo, username: string, password: string) => {
    // sign the image
    let sign = await signImage(image, username, password);
    //    console.log('[_uploadPhoto] sign', sign);
    // check sanity
    if (!sign) {
      setUploading(false);
      setToastMessage(intl.formatMessage({ id: 'ImageUpload.sign_failed' }));
      return;
    }

    let timer = null;
    //// upload an image
    uploadImage(image, username, sign)
      .then((res) => {
        console.log('[ImageUpload] uploadImage, res', res);
        if (res.data && res.data.url) {
          res.data.hash = res.data.url.split('/').pop();
          setUploading(false);
          setToastMessage(
            intl.formatMessage({ id: 'ImageUpload.upload_success' }),
          );
          setUploadedImage(res.data);
          // return the result
          const url = `![](${res.data.url})`;
          props.getImageURL(url);
        }
        // clear timeout
        clearTimeout(timer);
        return;
      })
      .catch((error) => {
        console.log('Failed to upload image', error, error.message);
        if (error.toString().includes('code 413')) {
          setToastMessage(intl.formatMessage({ id: 'Alert.payload_too_large' }));
        } else if (error.toString().includes('code 429')) {
          setToastMessage(intl.formatMessage({ id: 'Alert.quota_exceeded' }));
        } else if (error.toString().includes('code 400')) {
          setToastMessage(intl.formatMessage({ id: 'Alert.invalid_image' }));
        } else {
          setToastMessage(intl.formatMessage({ id: 'Alert.failed' }));
        }
        // clear uploading
        setUploading(false);
        return;
      });

    // set timeout (15 seconds)
    timer = setTimeout(() => {
      // clear uploading
      setUploading(false);
      // toast
      setToastMessage('uploading timeout (15 seconds)');
    }, 15000);
  };

  return (
    true && (
      <ImageUploadView
        isComment={props.isComment}
        containerStyle={props.containerStyle}
        uploading={uploading}
        closeActionSheet={closeActionSheet}
        handlePhotoUpload={_handlePhotoUpload}
        handleCameraUpload={_handleCameraUpload}
      />
    )
  );
};

export { ImageUploadContainer };
