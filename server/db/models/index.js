const Conversation = require("./conversation");
const User = require("./user");
const Message = require("./message");

// associations

User.belongsToMany(Conversation, { through: "users_conversations" });
Conversation.belongsToMany(User, { through: "users_conversations" });
Message.belongsTo(Conversation);
Conversation.hasMany(Message);

module.exports = {
  User,
  Conversation,
  Message
};
