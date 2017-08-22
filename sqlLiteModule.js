var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')
const constraintErr = 'SQLITE_CONSTRAINT'

function getAllDataFromUsers () {
  db.each('SELECT * FROM user', function (err, row) {
    if (err) {
      console.error(err)
      return err
    }
    console.log(row)
    return row
  })
}

function insertStudentToUsers (id, fName, oTime, eTime, uName) {
  if (uName) {
    db.run('INSERT INTO user VALUES($userId, $firstname, $oddtimetable, $eventimetable, $username)', {
      $userId: id,
      $firstname: fName,
      $oddtimetable: oTime,
      $eventimetable: eTime,
      $username: uName
    }, function (err) {
      if (err) {
        if (err.code === constraintErr) {
          updateStudentToUsers(id, fName, oTime, eTime, uName)
        } else {
          console.error(err)
        }
      }
    })
  } else {
    db.run('INSERT INTO user (userId, firstName, oddtimetable, eventimetable)' +
    ' VALUES($userId, $firstname, $oddtimetable, $eventimetable)', {
      $userId: id,
      $firstname: fName,
      $oddtimetable: oTime,
      $eventimetable: eTime,
      $username: uName
    }, function (err) {
      if (err) {
        if (err.code === constraintErr) {
          updateStudentToUsers(id, fName, oTime, eTime, uName)
        } else {
          console.error(err)
        }
      }
    })
  }
}
/*
UPDATE Customers
SET ContactName = 'Alfred Schmidt', City= 'Frankfurt'
WHERE CustomerID = 1
*/
function updateStudentToUsers (id, fName, oTime, eTime, uName) {
  if (uName) {
    db.run('UPDATE user SET ' +
    'firstname = $firstname, ' +
    'oddtimetable = $oddtimetable, ' +
    'eventimetable = $eventimetable, ' +
    'username = $username ' +
    'WHERE userId = $userId', {
      $userId: id,
      $firstname: fName,
      $oddtimetable: oTime,
      $eventimetable: eTime,
      $username: uName
    }, function (err) {
      console.error(err)
    })
  } else {
    db.run('UPDATE user SET ' +
    'firstname = $firstname, ' +
    'oddtimetable = $oddtimetable, ' +
    'eventimetable = $eventimetable ' +
    'WHERE userId = $userId', {
      $userId: id,
      $firstname: fName,
      $oddtimetable: oTime,
      $eventimetable: eTime
    }, function (err) {
      console.error(err)
    })
  }
}

module.exports = {
  selectAll: getAllDataFromUsers,
  insertUser: insertStudentToUsers
}
