export const Users = `CREATE TABLE IF NOT EXISTS Users (
      id CHAR(36), // primary key
      userId CHAR(36), // 유저 아이디
      socketId CHAR(255), // socket 아이디
      status BOOLEAN, // 접송 상태
      constraint Pk_User PRIMARY KEY (id) // 제약조건 생성
    ) `;
