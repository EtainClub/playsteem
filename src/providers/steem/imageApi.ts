import axios from 'axios';
import Config from 'react-native-config';
import {IMAGE_SERVERS} from '~/constants/blockchain';
const IMAGE_API = IMAGE_SERVERS[0];

//// upload image
export const uploadImage = (media, username: string, sign) => {
  const file = {
    uri: media.path,
    type: media.mime,
    name: media.filename || `img_${Math.random()}.jpg`,
    size: media.size,
  };

  const fData = new FormData();
  fData.append('file', file);

  return _upload(fData, username, sign);
};

const _upload = (fd, username: string, signature) => {
  console.log(
    '[imageApi|_upload] baseURL',
    `${IMAGE_API}/${username}/${signature}`,
  );
  const image = axios.create({
    baseURL: `${IMAGE_API}/${username}/${signature}`,
    headers: {
      Authorization: IMAGE_API,
      'Content-Type': 'multipart/form-data',
    },
  });
  return image.post('', fd);
};

//// upload image
// e.g. "profile_image":"https://images.blurt.buzz/DQmP1NegAx2E3agYjgdzn4Min9eVVxSdyXxgQ2DWLwHBKbi/helpus_icon.png"
// export const uploadProfileImage = (media, username: string, signature) => {
//   const file = {
//     uri: media.path,
//     type: media.mime,
//     name: media.filename || `img_${Math.random()}.jpg`,
//     size: media.size,
//   };

//   const fData = new FormData();
//   fData.append('file', file);

//   console.log(
//     '[imageApi|_upload] baseURL',
//     `${PROFILE_IMAGE_API}/${signature}`,
//   );
//   const image = axios.create({
//     baseURL: `${PROFILE_IMAGE_API}/${signature}/${media.filename}`,
//     headers: {
//       Authorization: PROFILE_IMAGE_API,
//       'Content-Type': 'multipart/form-data',
//     },
//   });
//   return image.post('', fData);
// };
