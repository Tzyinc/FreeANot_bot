var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('testdb.tb')

db.serialize(function () {
  db.run('DROP TABLE user')
  db.run('CREATE TABLE user ' +
    '(userId     INT            NOT NULL,' +
    'firstname   VARCHAR(255)   NOT NULL,' +
    // need odd week timetable and even timetable
    'oddtimetable   NCHAR(40)      NOT NULL,' +
    'eventimetable   NCHAR(40)      NOT NULL,' +
    'username    VARCHAR(255)' +
    ')')

  var stmt = db.prepare('INSERT INTO user (userId, firstname, timetable, username) VALUES (0, "ten", "1111111111111111111111111111111111111111", "tenten")')
  stmt.run()
  stmt.finalize()

  db.each('SELECT * FROM user', function (err, row) {
    console.log(row)
    if (err) {
      console.log(err)
    }
  })
})

db.close()
