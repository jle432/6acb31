import React, { useCallback, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { Grid, CssBaseline, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { SidebarContainer } from '../components/Sidebar';
import { ActiveChat } from '../components/ActiveChat';
import { SocketContext } from '../context/socket';

const useStyles = makeStyles((theme) => ({
  root: {
    height: '100vh',
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [] };
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post('/api/messages', body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit('new-message', {
      message: data.message,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const sendReadMessage = (data) => {
    socket.emit('update-read-message', {
      lastReadMsg: data.lastReadMsg,
      conversationId: data.conversationId,
      otherUserId: data.otherUserId,
    })
  }

  const getLastReadMessage = (messages) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId !== user.id) {
        return messages[i].id;
      }
    }
  }

  const updateAndPatchReadMsgs = (convo) => {
    const conversationId = convo.id;
    sendReadMessage({
      lastReadMsg: getLastReadMessage(convo.messages),
      conversationId,
      otherUserId: convo.otherUser.id,
    });

    try {
      axios.patch(`/api/messages/read`, {conversationId});
    } catch (error) {
      console.error('Caught error', error);
    }
  }

  const updateMessagesToRead = (messagesCopy) => {
    return messagesCopy.map((msg) => {
      if (msg.senderId !== user.id && !msg.read) {
        const msgCopy = { ...msg }
        msgCopy.read = true;
        return msgCopy;
      } else {
        return msg;
      }
    })
  }

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.otherUser.id === recipientId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [ ...convo.messages, message ];
            convoCopy.latestMessageText = message.text;
            convoCopy.id = message.conversationId;
            convoCopy.latestReadMsg = null;
            convoCopy.unreadMessages = 0;
            return convoCopy;
          } else {
            return convo;
          }
        })
      );
    },
    [setConversations, conversations]
  );

  const addMessageToConversation = useCallback(
    (data) => {
      // if sender isn't null, that means the message needs to be put in a brand new convo
      const { message, sender = null, recipientId } = data;
      if (sender !== null) {
        if (recipientId === user.id) {
          const newConvo = {
            id: message.conversationId,
            otherUser: sender,
            messages: [message],
            latestReadMsg: null,
            unreadMessages: 1,
          };
          newConvo.latestMessageText = message.text;
          // Changed how new conv should be added to conversations to prevent adding duplicate convos when a message is received via WebSocket in a given situations. For example if user1 is searching for user2 in the sidebar or has user2 selected (active chat) and user2 sends a message while this is occuring a duplicate conversation is added.
          setConversations((prev) => {
            let newConvoAdded = false;
            const newConversations = prev.map((convo) => {
              if (convo.otherUser.id === sender.id) {
                newConvoAdded = true;
                if (activeConversation === sender.id) {
                  newConvo.latestReadMsg = message.id;
                  newConvo.unreadMessages = 0;
                  newConvo.messages[0].read = true;
                  updateAndPatchReadMsgs(newConvo);
                }
                return newConvo;
              }
              else return convo;
            })
            // If newConvoAdded is false user has not searched for another user or have a user selected for active chat, so newConvo must be added.
            if (!newConvoAdded) newConversations.push(newConvo);
            return newConversations;
          });
        }
      } else {
        setConversations((prev) =>
          prev.map((convo) => {
            if (convo.id === message.conversationId) {
              const convoCopy = { ...convo };
              convoCopy.messages = [...convo.messages, message];
              convoCopy.latestMessageText = message.text;
              if (message.senderId !== user.id) {
                // If the current user does not have the sender open in active chat we want to increment unreadMessages property.
                if (activeConversation !== message.senderId) convoCopy.unreadMessages += 1;
                // If current user has the sender open in active chat updates need to be made.
                if (activeConversation === message.senderId) {
                  convoCopy.messages = updateMessagesToRead(convoCopy.messages);
                  updateAndPatchReadMsgs(convoCopy);
                }
              }
              return convoCopy;
            } else {
              return convo;
            }
          })
        );
      }
    },
    // Added activeConversation as a dependency to ensure the value of activeConversation in current method reflects the conversation the user clicks for active chat.
    [setConversations, conversations, activeConversation]
  );

  const changeMessagesToRead = (conversation) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.id === conversation.id) {
          const convoCopy = { ...convo };
          convoCopy.unreadMessages = 0;
          convoCopy.messages = updateMessagesToRead(convoCopy.messages);
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
    updateAndPatchReadMsgs(conversation);
  }

  const setActiveChat = (userId) => {
    setActiveConversation(userId);
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      })
    );
  }, []);

  const updateReadMessage = useCallback((data) => {
    const { lastReadMsg, conversationId, otherUserId } = data;
    console.log('inside updateReadMessage', lastReadMsg, conversationId, otherUserId);
    if (otherUserId === user.id) {
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.id === conversationId) {
            const convoCopy = { ...convo };
            convoCopy.latestReadMsg = lastReadMsg;
            return convoCopy;
          } else {
            return convo;
          }
        })
      );
    }
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on('add-online-user', addOnlineUser);
    socket.on('remove-offline-user', removeOfflineUser);
    socket.on('new-message', addMessageToConversation);
    socket.on('update-read-message', updateReadMessage)

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off('add-online-user', addOnlineUser);
      socket.off('remove-offline-user', removeOfflineUser);
      socket.off('new-message', addMessageToConversation);
      socket.off('update-read-message', updateReadMessage)
    };
  }, [updateReadMessage, addMessageToConversation, addOnlineUser, removeOfflineUser, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push('/login');
      else history.push('/register');
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get('/api/conversations');
        setConversations(data);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
          changeMessagesToRead={changeMessagesToRead}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
