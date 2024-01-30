export const PrivateMsgs = `CREATE TABLE IF NOT EXISTS Msgs (
  id CHAR(36) DEFAULT UUID(), // id
  roomNumber VARCHAR(), // room 이름
  msg VARCHAR(), // 메시지
  toUserId CHAR(36), // 보낼 userId
  fromUserId CHAR(36) // 보낸 userId
  time DATETIME, // 시간
  CONSTRAINT pk_msgs PRIMARY KEY (id)
)`;

export const Rooms = `CREATE TABLE IF NOT EXISTS Rooms (
  id VARCHAR() // 룸 아이디
)`;
