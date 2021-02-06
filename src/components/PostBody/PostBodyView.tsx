import React, {useRef, useState, useContext} from 'react';
import {
  Dimensions,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {Block, Icon, Button, Input, Text, theme} from 'galio-framework';
import HTMLView from 'react-native-render-html';
import AutoHeightWebView from 'react-native-autoheight-webview';
import RNFetchBlob from 'rn-fetch-blob';
import ActionSheet from 'react-native-actions-sheet';
import {get} from 'lodash';
import {customBodyScript} from './config';
import {useIntl} from 'react-intl';
import {UIContext} from '../../contexts';

import FAB from 'react-native-fab';

const {width, height} = Dimensions.get('window');

//// constants
const customStyle = `
* {
  color: #3c4449;
  font-family: Roboto, sans-serif;
  max-width: 100%;

  overflow-wrap: break-word;
  word-wrap: break-word;

  -ms-word-break: break-all;
  word-break: break-all;
  word-break: break-word;

  -ms-hyphens: auto;
  -moz-hyphens: auto;
  -webkit-hyphens: auto;
  hyphens: auto;
}
body {
  color: #3c4449;
}
a {
  color: #357ce6;
  cursor: pointer;
  margin-right: 5;
}
img {
  align-self: 'center';
  width: 100%;
}
center {
  text-align: 'center';
  align-items: 'center';
  justify-content: 'center';
}
table {
  table-layout: fixed;
  width: 100%;
}
th {
  flex: 1;
  justify-content: 'center';
  font-weight: 'bold';
  color: #3c4449;
  font-size: 14;
  padding: 5;
}
tr {
  background-color: #c1c5c7;
  flex-direction: 'row';
}
td {
  border-width: 0.5;
  border-color: #FFFFFF;
  flex: 1;
  padding: 10;
  background-color: #f5f5f5;
}
blockquote {
  border-left-width: 5;
  border-left-style: solid;
  border-color: #c1c5c7;
  margin-left: 5;
  padding-left: 5;
}
code {
  background-color: #c1c5c7;
  font-family: RobotoMono-Regular;
}
center {
  text-align: 'center';
  align-items: 'center';
  justify-content: 'center';
}
.markdown-video-link {
  max-width: 100%;
  position: relative;
}
.markdown-video-play {
  position: absolute;
  width: 100px;
  height: 100px;
  background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAVlpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDUuNC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KTMInWQAACo1JREFUeAHlm02IHMcVx/trZrEDwsImvggCklYrxRAslhykQLyRFodI2g/ZFjnKsojBxJBbfPAaRJJD4ot1iQI+xArJKcpa3p1VZMPGWiUgQUC2T1ovIZCAwNiRUbDARjPT3fn/aro6vbPz1bOaj0UFPT3dXR/v/96rV69eVbnO/UvuxMSEv7KyUs1WeeTI8T2eF+13XedJ1/XGHCfeof9fj+P4McdxH6rljb9yXfd2HDuf6fst3dd0feQ4wQdLS/P/yNanNgK1EepdnH3f7X+324KZcu74+Hhw48aNin03NXX8KdeNjwvgpOjcVygUPAF0BNqJolj3yPznmcS32uU5nlf7z7dKpRLp66rqWI5j92KpdPGqbUNtFtQmzN4UIzbFgIQIA3xqakoS9U4Ly/O+H+z1PF9gQycMEZaT1QrazF58B0T24h0p8H3f4aKeMKx+rKJvxXH421KpdJsMWRp4zpu6YsCJEyf8CxcuSDpOfPTo0e2eV3xFEn+pWCxuqxEahpJoJCn6ymPB5qWN/IYpqitUXZ4YQXLK5fIXej4XRdXXL126dIc2RJMnmgy38zSUmwHj4y9K9d40Up+enn1Zjf1MwLdLXVFr3gPay0NEjrwwHeaqVxVgxB39f21h4eKvqSNLW6d15mFAauQwbIVCfL5QKB7IAA/UaJ76OqWxUT40o2oZce9e+bqU7SQGM6+R7EhSZ86cMfmw8NPTx08GQbyqfn5AEpDEZdEcp6CrX+BhCG2pzTiChkIhOOB54Sq02VHI0kzmVgl1bZmoSBcgHan8WaneL6MocnVh2PoNvJ5WGOEntASibXZ0dM8ja2sfvytGxNDOvb5Q9rml1OrAzxeLI8+Uy/cAjkZ0pD3Zxnr8HyFFskdBpVKeX1h45znay2Jo1H5TBmQLSvJ/VsU/kLqVVUmxUUVD9K4sWosi9fLi4jtHoCuLpZ7OZgyw72OBl+SLkvyWAG/xGSZkNCHFYzPYe0M1xqVVBsCfran9lgIPNjSgrFHqWWF4AywJJr6tSxuMIGPp9evzxtpj8MRFa+zWFdwCD76csqowHBwdHfvXe++9+yHYPvnkhjHoln6rGuY58fBCxnkNdTf1EgZRoKGmmELD/WNpD6PI34efYDFastcBS9xbBycnCALAW4tv83dyp1HKDUMCXxUs8qZ/B0EWoyUuZQCTCr2k37+Mh1etVnFr8e7ypFC+uhcEBcrhlw8DIwKwjIwUD8zMzPxYNMUJVoPLdgHuZmLj+4V/ysXcLr/eqo/J2OYn9jSPlUPCnP5Hnue8JE/xacqocTt3z8vMNk3m+hwJkydMd8KwsstOoFRDbDRAHDHEeV7wioY8wCP9VDs6aUplyObfvfvfJTkh3y+Xq5MC/z7TN6ngoDUC8BWwCeNPIdRiRvJG+sznXddH+tuUGTRWO8jfLsUq56rYHc3V99i5OoWmp6e/J17OiQ+HlGWQGpHQGGkqHe1KaHS9/4+P3mlxCPBIPw/4dcxRNzBzcvoZFndxcfGKPLLDUr1DA9YIBCQtGNkmQb8A0WBPgU5PzzDD26uxM0/ft+BTDajvYzCBTDZYMWCNiDDSktGquuk3ocswgBheEHgrAo/0NjhHZGyTmjLAlmvECNmlVxU6O9znrsFIJSep8pS086/G+BHArMXwFLKshbEs3fftbjUgw4grqvwKGgEjRFNfGCFmowV4ic+o/RoDpAiTdN1egc9ysRUjFPZ7VT5LTxkBxpqix5PQ5SZur0LPZtjLa/0ttrZdwGasv2c0whhPqxE97BoWo+y1vzdg0UKen6fYHl6b6RL1RPbyuZVG9KhrYPeYJAWKpu0PNDRrxSYdDHqJtWXdzRgxOzs7Ua06c/ezawgvGqvFGOdJMcAbU79oSVw/PzZgxIraX7mfjBBefAJgjUnl4x0sVykNXg2gIkk9ZoTmLTEasIMuoIVKfJ/hYkCXjKBYJ36MNCDS0p3zeCBOPOZ5w6cBlgH23kwjjh2bnZAQ52TTzPApYw6YdtpsuoDKPSoNcB9K+kO7QpaWgd6bMULD5375Eb/QrFyR4FgOnRnWm9FqbcDDuaa8zWobvvedyzKQ9L9SMONruneiOgPHWu84MTqoL8uDDCYZ2pIu0E6w1nH7Uo6Qe1sFh54BjYBr6janqe3hIEjjDAioEyNoGCD797k0wPlMGvANBX+NJRy4iOsIaAW8UEiBQ3seL1YMYDdK9Cl+wC1pwbfFzaFiQI+AW/Yqhulqx4lzCw1Yo+8MS+ox8BRmgnkNBnyUDIPpx0H8qQfOrJDpMX18E6reFAqYwa4uEHwgy4krSB+iG/RVHZoB72GAxNgLMCs08GHAclESD3xCgYK+MaARcKa/PYwDWG2IxVxXy4arYE8sp7ushp8goivVaDeG2oq6ug8QuKFXfd+sXknYy7wwDGATorD/pJfgBw3cSguMtZBY9Dbv0v7+IIXFtVq3WirVwuKBFgfYe6twmPuW+savxB1ic5vuBiw97dy5M7KTF6z6EKwQWfU/j/TBjgZwxQ/s0hjgWcZirUz94zcKFupV98vad7U6SgWapx/WUvtftNr8viYqh9AsLY0ReMVXT4wvOfuWCIQy9p8DK5jVcmxtgNEC9v0+kMvjcAKOsG6uYeK1RAtMnL5D+bA3gKzbFb29KCY+LWEPWuJZ0sOa9OM5MFrpk8FqgM2c2IPZa2w/TVQ2r7rCCetZ2noHeWeLDLtErmmV+jsixGC0BK2z9hqrzbNcxJNIUJkAb0RrC3Rwp468TOug2q6ysDME8NokVX2eGixGW9u64MHNmzfVFV4sXL36h/+Mje37t9RmNlnvX8coW3gL3FF97Q4JT8nwXQHb8vLvMcRpWscA3rKPjvGRfXVsPNamiYMy4GyR3ZA3rWU4/2i36EhB+xzPLi4uvA4m9j/Wk1pvA+x3+z6emZn9Ezsut+JWWZ0jmJfHx6bpFI8FaO/NVJut5qaQdlI8J/CXpQlskkYThj2ZfcICfzkB7yRYmOluSM0YQKFIl/nOrms2HidMQI3yGsYNDffgBTRVpfbFRPJtd4pDQ8t+zWEDmMBdhxD+uHv36CMyKgflMaIdMKIpA6m8j4njMz4GT9p6VpI/TdvQrqulsFoygEoyTHA4icHGY6YOjK0aISoKJ8IM28f0t6/JSF2kFGqxjPAUBk8UuJ2Ah9I8hKeHpo4de3aUvbdsP1VoyZ4WY+zPUx/td5voz+mhKUn9GuP80tJS7kNTuQlmLLXH5th7q97wc9mGAR2bu6eNmc5cqbRwDk5maeuUs227QH1F+AlEd+Q0qUus/X337l1vaoUFiXxLjHhYdxYeOduHJ2kZbO/11bV7pl7UnItYHv1cm5yqX8i5e0NS/+HSUulv+sbBSb/eydH7tqlbwkzFTCrsmeEknvCC6DzFhkvRmhx3NXOqrANCm9mLugCavXhHWnd0VqBXZXPOD/zobI229HfD4WlFf76rAUL78NiK5nZ8eFpLdMkh6tpB61q4PtYONndZSvA2GxttqwnzYSyM6zptSgPqWk2NZPZ9YjDN8Xm9H5MEtSXHeVz3R/VMlyF9qU70ufB/qvstPZvj88TtCV2bHMkPLq1GJtRqU8Btnf8DPtmgstMt+csAAAAASUVORK5CYII=') no-repeat center center;
  z-index: 20;
  opacity: 0.9;
  left: 50%;
  top: 50%;
  margin-top: -100px;
  transform: translateX(-50%) translateY(-50%);
  -webkit-transform: translateX(-50%) translateY(-50%);
  -moz-transform: translateX(-50%) translateY(-50%);
}

iframe {
  width: 100%;
  height: 240px;
}
.phishy {
  display: inline;
  color: red;
}
.text-justify {
  text-align: justify;
}
p {
  font-size: 16px;
}
.pull-left,
.pull-right {
  max-width: calc(50% - 10px);
  padding-left: 10px;
  margin-bottom: 10px;
  box-sizing: border-box;
}
.pull-left {
  margin-right: 10px;
  padding-right: 10px;
  float: left;
}
.pull-right {
  margin-left: 10px;
  padding-right: 10px;
  float: right;
}
`;

interface Props {
  body: string;
  commentDepth: number;
  linkActionRef: any;
  imageActionRef: any;
  handleLinkPress: (event: any) => void;
  copyLinkToClipboard: (isImage: boolean) => void;
  openExternalLInk: () => void;
  onSaveImage: () => void;
  closeActionSheet: (isImage: boolean) => void;
}
const PostBodyView = (props: Props): JSX.Element => {
  //// props
  const {linkActionRef, imageActionRef} = props;
  //// language
  const intl = useIntl();

  const {body} = props;

  const html = body.replace(/<a/g, '<a target="_blank"');

  return (
    <Block flex>
      <AutoHeightWebView
        source={{html}}
        allowsFullscreenVideo={true}
        style={{width: width - (20 + 25 * props.commentDepth)}}
        customStyle={customStyle}
        onMessage={props.handleLinkPress}
        customScript={customBodyScript}
        startInLoadingState={true}
        scrollEnabled={false}
        scalesPageToFit={false}
      />
      <ActionSheet ref={linkActionRef}>
        <Block center>
          <Button color="primary" onPress={props.openExternalLInk}>
            {intl.formatMessage({id: 'Actionsheet.open'})}
          </Button>
          <Button
            color="warning"
            onPress={() => props.copyLinkToClipboard(false)}>
            {intl.formatMessage({id: 'Actionsheet.copy'})}
          </Button>
          <Button color="gray" onPress={() => props.closeActionSheet(false)}>
            {intl.formatMessage({id: 'Actionsheet.close'})}
          </Button>
        </Block>
      </ActionSheet>
      <ActionSheet ref={imageActionRef}>
        <Block center>
          <Button
            color="primary"
            onPress={() => props.copyLinkToClipboard(true)}>
            {intl.formatMessage({id: 'Actionsheet.copy'})}
          </Button>
          <Button color="warning" onPress={props.onSaveImage}>
            {intl.formatMessage({id: 'Actionsheet.download'})}
          </Button>
          <Button color="gray" onPress={() => props.closeActionSheet(true)}>
            {intl.formatMessage({id: 'Actionsheet.close'})}
          </Button>
        </Block>
      </ActionSheet>
    </Block>
  );
};

export {PostBodyView};

// // Tag Renders
// const _renderHTML = {
//   a: (htmlAttribs, children, convertedCSSStyles, passProps) => {
//     const style = [
//       passProps.tagsStyles ? passProps.tagsStyles['a'] : undefined,
//       htmlAttribs.style ? htmlAttribs.style : undefined,
//     ];
//     const {parentWrapper, onLinkPress, key, data, parentTag} = passProps;
//     const onPress = (evt) =>
//       onLinkPress && htmlAttribs && htmlAttribs.href
//         ? onLinkPress(evt, htmlAttribs.href, htmlAttribs)
//         : undefined;

//     if (parentWrapper === 'Text') {
//       return (
//         <Text {...passProps} style={style} onPress={onPress} key={key}>
//           {children || data}
//           <Icon
//             name="external-link"
//             family="font-awesome"
//             style={{
//               fontSize: 20 * 0.8,
//               color: '#208800',
//               marginLeft: 4,
//             }}
//           />
//         </Text>
//       );
//     } else {
//       return (
//         <TouchableOpacity onPress={onPress} key={key}>
//           {children || data}
//         </TouchableOpacity>
//       );
//     }
//   },
// };
