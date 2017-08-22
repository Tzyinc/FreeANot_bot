var sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database('freeAnot.tb')
const constraintErr = 'SQLITE_CONSTRAINT'

function getAllDataFromUsers () {
  db.all('SELECT * FROM user', function (err, row) {
    if (err) {
      console.error(err)
      return err
    }
    console.log(row)
    return row
  })
}

function getAllUsersInGroup (groupId) {
  var userPromise = new Promise(function (resolve, reject) {
    db.all('SELECT * ' +
    'FROM user ' +
    'WHERE EXISTS ' +
    '(SELECT * FROM userGroupRelations WHERE groupId = $groupId)', {
      $groupId: groupId
    }, function (err, row) {
      if (err) {
        console.error(err)
        reject(err)
      }
      console.log(row)
      resolve(row)
    })
  })
  return userPromise
}

function addUserToChat (userId, chatId) {
  db.run('INSERT INTO userGroupRelations VALUES($userId, $groupId)', {
    $userId: userId,
    $groupId: chatId
  }, function (err) {
    if (err) {
      console.error(err)
    }
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
  insertUser: insertStudentToUsers,
  insertUserToChat: addUserToChat,
  getUsersInChat: getAllUsersInGroup
}
