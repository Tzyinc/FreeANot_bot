var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')

db.serialize(function () {
  db.each('SELECT * FROM user', function (err, row) {
    if (err) {
      console.error(err)
    } else {
      db.run('DROP TABLE user')
    }
  })
  db.each('SELECT * FROM userGroupRelations', function (err, row) {
    if (err) {
      console.error(err)
    } else {
      db.run('DROP TABLE userGroupRelations')
    }
  })

  db.run('CREATE TABLE user ' +
    '(userId        INT           NOT NULL  PRIMARY KEY,' +
    'firstname      VARCHAR(255)  NOT NULL,' +
    // need odd week timetable and even timetable
    'oddtimetable   NCHAR(40)     NOT NULL,' +
    'eventimetable  NCHAR(40)     NOT NULL,' +
    'username       VARCHAR(255)' +
    ')')

  db.run('CREATE TABLE userGroupRelations ' +
    '(rowId         INT           NOT NULL PRIMARY KEY ASC,' +
    'userId         INT           NOT NULL,' +
    // need odd week timetable and even timetable
    'groupId        INT           NOT NULL,' +
    'FOREIGN KEY (userId) REFERENCES user(userId)' +
    ')')
})

db.close()
