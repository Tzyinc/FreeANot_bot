var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')
const constraintErr = 'SQLITE_CONSTRAINT'

// enforce foreign key constraint
db.run('PRAGMA foreign_keys = ON')

function getAllDataFromUsers () {
  var p = new Promise(function (resolve, reject) {
    db.all('SELECT * FROM user', function (err, row) {
      if (err) {
        reject(err)
      }
      resolve(row)
    })
  })
  return p
}

function getAllUsersInGroup (groupId) {
  var p = new Promise(function (resolve, reject) {
    db.all('SELECT * ' +
    'FROM user ' +
    'WHERE EXISTS ' +
    '(SELECT * FROM userGroupRelations WHERE groupId = $groupId)', {
      $groupId: groupId
    }, function (err, row) {
      if (err) {
        reject(err)
      }
      resolve(row)
    })
  })
  return p
}

function addUserToChat (userId, chatId) {
  var p = new Promise(function (resolve, reject) {
    db.run('INSERT INTO userGroupRelations VALUES($userId, $groupId)', {
      $userId: userId,
      $groupId: chatId
    }, function (err) {
      if (err) {
        reject(err)
      }
      resolve('success')
    })
  })
  return p
}

function insertStudentToUsers (id, fName, oTime, eTime, uName) {
  var p = new Promise(function (resolve, reject) {
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
            updateStudentToUsers(id, fName, oTime, eTime, uName).then(
              resolve('success')
            )
          } else {
            reject(err)
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
            updateStudentToUsers(id, fName, oTime, eTime, uName).then(
              resolve('success')
            )
          } else {
            reject(err)
          }
        }
      })
    }
  })
  return p
}

function updateStudentToUsers (id, fName, oTime, eTime, uName) {
  var p = new Promise(function (resolve, reject) {
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
        if (err) {
          reject(err)
        }
        resolve('success')
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
        if (err) {
          reject(err)
        }
        resolve('success')
      })
    }
  })
  return p
}

module.exports = {
  selectAll: getAllDataFromUsers,
  insertUser: insertStudentToUsers,
  insertUserToChat: addUserToChat,
  getUsersInChat: getAllUsersInGroup
}
