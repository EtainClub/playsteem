//// react
import React, {useState, useEffect, useContext, useCallback} from 'react';
//// react native
//// react navigation
import {useFocusEffect} from '@react-navigation/native';
import {navigate} from '~/navigation/service';
//// language
//// ui, styles
//// contexts
import {
  PostsContext,
  AuthContext,
  UIContext,
  UserContext,
  SettingsContext,
} from '~/contexts';
//// etc
//// screens, views
import {NotificationScreen} from '../screen/Notification';

interface Props {}

const Notification = (props: Props): JSX.Element => {
  //// props
  //// contexts
  const {setPostRef, setPostDetails} = useContext(PostsContext);
  const {userState, getNotifications} = useContext(UserContext);
  const {authState} = useContext(AuthContext);
  const {setAuthorParam} = useContext(UIContext);
  const {settingsState} = useContext(SettingsContext);
  //// states
  const [username, setUsername] = useState('');
  const [fetching, setFetching] = useState(false);
  const [notifications, setNotifications] = useState(null);

  //////// effects
  //// focus event
  // useFocusEffect(
  //   useCallback(() => {
  //     if (authState.loggedIn)
  //       setUsername(authState.currentCredentials.username);
  //     _fetchNotifications(authState.currentCredentials.username);
  //   }, []),
  // );
  //// username change event
  useEffect(() => {
    if (authState.loggedIn) {
      // fetch new notifications data if the username changed,
      if (notifications && username !== authState.currentCredentials.username) {
        _fetchNotifications(authState.currentCredentials.username, true);
      } else {
        // otherwise use prefetched notifications if available
        _fetchNotifications(authState.currentCredentials.username);
      }
      // set username
      setUsername(authState.currentCredentials.username);
    }
  }, [authState.currentCredentials]);
  //// fetch notifications
  const _fetchNotifications = async (username: string, refresh?: boolean) => {
    // clear notification
    setNotifications(null);
    setFetching(true);
    let _notifications = null;
    if (refresh || !userState.notificationData.fetched) {
      _notifications = await getNotifications(username);
    } else {
      _notifications = userState.notificationData.notifications;
    }
    setNotifications(_notifications);
    setFetching(false);
  };

  //// handle press item
  const _handlePressItem = (author: string, permlink: string) => {
    console.log(
      '[notifications] _handlePressItem. author, permlink',
      author,
      permlink,
    );
    // check if permlink exists
    if (permlink) {
      // set post ref
      setPostRef({author, permlink});
      // set post data to context
      setPostDetails(null);
      // navigate to the post
      navigate({name: 'PostDetails'});
    } else {
      // set author param
      setAuthorParam(author);
      // navigate to the author profile
      navigate({name: 'AuthorProfile'});
    }
  };

  //// handle refresh list
  const _handleRefresh = async () => {
    // fetch notifications
    _fetchNotifications(username, true);
  };
  return (
    <NotificationScreen
      notifications={notifications}
      fetching={fetching}
      username={authState.currentCredentials.username}
      imageServer={settingsState.blockchains.image}
      handlePressItem={_handlePressItem}
      handleRefresh={_handleRefresh}
    />
  );
};

export {Notification};
