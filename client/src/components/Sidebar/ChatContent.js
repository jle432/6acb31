import React from "react";
import { Box, Typography, Badge } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: 'center',
    marginLeft: 20,
    flexGrow: 1,
  },
  username: {
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  previewText: {
    fontSize: 12,
    color: "#9CADC8",
    letterSpacing: -0.17,
  },
  boldPreviewText: {
    fontSize: 12,
    color: "black",
    letterSpacing: -0.17,
    fontWeight: 'bold',
  },
  msgBadge: {
    margin: '0 20px',
  }
}));

const ChatContent = ({ conversation }) => {
  const classes = useStyles();

  const { otherUser } = conversation;
  const latestMessageText = conversation.id && conversation.latestMessageText;
  let latestMsgClass = classes.previewText;
  if (conversation.unreadMessages && conversation.unreadMessages !== 0) latestMsgClass = classes.boldPreviewText;

  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.username}>
          {otherUser.username}
        </Typography>
        <Typography className={latestMsgClass}>
          {latestMessageText}
        </Typography>
      </Box>
      { conversation.unreadMessages !== 0 && <Badge badgeContent={conversation.unreadMessages} color="primary" className={ classes.msgBadge }></Badge> }
    </Box>
  );
};

export default ChatContent;
