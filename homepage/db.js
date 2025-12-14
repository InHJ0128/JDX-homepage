const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost", // 또는 서버 IP
  user: "jdxuser",
  password: "jdxjdx123",  // root 또는 사용자 비밀번호
  database: "jdx",
});

module.exports = db;