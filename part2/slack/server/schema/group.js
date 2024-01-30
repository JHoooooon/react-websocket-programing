export const GroupUserList = `CREATE TABLE IF NOT EXISTS GroupUserList (
  id CHAR(36) DEFAULT UUID(), // primary id
  userId CHAR(36), // userid
  socketId CHAR(255), // socket id
  status BOOLEAN, // user 상태값
  CONSTRAINT pk_group_user_list PRIMARY KEY(id)
)`;

export const GroupRooms = `CREATE TABLE IF NOT EXISTS GroupRooms (
  id CHAR(36) DEFAULT UUID(),
  status BOOLEAN,
  loginUserId CHAR(36),
  userId CHAR(36),
  socketId CHAR(255),
  CONSTRAINT pk_group_rooms PRIMARY KEY (id)
)`;

export const GroupMsgs = `CREATE TABLE IF NOT EXISTS GroupMsgs (
  id CHAR(36) DEFAULT UUID(),
  roomNumber VARCHAR(),
  msg VARCHAR(),
  toUserId CHAR(255),
  fromUserId CHAR(255),
  time DATETIME
  CONSTRAINT pk_group_msgs PRIMARY KEY (id)
)`;
