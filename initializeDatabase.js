var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')

db.serialize(function () {
  db.run('DROP TABLE IF EXISTS user')
  db.run('DROP TABLE IF EXISTS userGroupRelations')
  db.run('CREATE TABLE user ' +
    '(userId        INT           NOT NULL  PRIMARY KEY,' +
    'firstname      VARCHAR(255)  NOT NULL,' +
    // need odd week timetable and even timetable
    'oddtimetable   NCHAR(40)     NOT NULL,' +
    'eventimetable  NCHAR(40)     NOT NULL,' +
    'username       VARCHAR(255)' +
    ')')

  db.run('CREATE TABLE userGroupRelations ' +
    '(userId         INT           NOT NULL,' +
    'groupId        INT           NOT NULL,' +
    'PRIMARY KEY (userId, groupId),' +
    'FOREIGN KEY (userId) REFERENCES user(userId)' +
    ')')
})

db.close()
