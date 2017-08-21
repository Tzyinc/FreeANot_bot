var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')

function getAllDataFromUsers () {
  db.each('SELECT * FROM user', function (err, row) {
    if (err) {
      console.log(err)
      return err
    }
    return row
  })
}

module.exports = {
  selectAll: getAllDataFromUsers
}
