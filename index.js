var fs = require('fs')
var urlExpander = require('expand-url')
var apiKeys = JSON.parse(fs.readFileSync('apiKeys.json', 'utf8'))
var acadCalandar = JSON.parse(fs.readFileSync('academicCalendar.json', 'utf8'))
const AcadYear = '2017/2018'
var TelegramBot = require('node-telegram-bot-api')
var bot = new TelegramBot(apiKeys.telegramKey, { polling: true })
var nusmodsApi = require('./nusmodsApiModule.js')
var sqliteApi = require('./sqlLiteModule.js')

const numOfDays = 5
const numOfHours = 16
const dayMonday = 0
const dayTuesday = 1
const dayWednesday = 2
const dayThursday = 3
const dayFriday = 4

bot.on('message', (msg) => {
  if (msg.text) {
    if (msg.chat.type.toLowerCase().indexOf('private') === 0) {
      handlePrivate(msg)
    } else {
      handlePublic(msg)
    }
  }
})

// handles messages sent 1 on 1 to the bot
function handlePrivate (msg) {
  if (msg.text.toLowerCase().indexOf('/start') === 0) {
    handlePrivateStart(msg)
  } else if (msg.text.toLowerCase().indexOf('/test') === 0) {
    handlePrivateTest(msg)
  } else {
    handlePrivateOthers(msg)
  }
}

// handles messages sent in a group chat
function handlePublic (msg) {
  if (msg.text.toLowerCase().indexOf('/join') === 0) {
    handlePublicStart(msg)
  } else if (msg.text.toLowerCase().indexOf('/test') === 0) {
    handlePublicTest(msg)
  } else if (msg.text.toLowerCase().indexOf('/whofreenoschool') === 0) {
    freeIgnoreSchool(msg)
  } else if (msg.text.toLowerCase().indexOf('/whofree') === 0) {
    freeNow(msg)
  } else if (msg.text.toLowerCase().indexOf('/whoschool') === 0) {
    inSchoolToday(msg)
  } else if (msg.text.toLowerCase().indexOf('/help') === 0) {
    var toSend = 'Tutorial:'
    toSend += '\n1. Start private chat with me'
    toSend += '\n2. Enter your nusmods short url'
    toSend += '\n3. type /join for whichever group you want to share your timetable with!'
    toSend += '\n4. type /whoFree in a group to find out who\'s free!'
    bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
  }
}

function handlePublicStart (msg) {
  sqliteApi.insertUserToChat(msg.from.id, msg.chat.id).then(
    function (value) {
      bot.sendMessage(msg.chat.id, 'Added to group!', {parse_mode: 'HTML'})
    },
    function (err) {
      if (err) {
        bot.sendMessage(msg.chat.id, 'Failed to add you into group!', {parse_mode: 'HTML'})
      }
    }
  )
}

function handlePrivateStart (msg) {
  var toSend = 'Please send me your nusmods timetable url!'
  bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
}

function handlePrivateOthers (msg) {
  urlExpander.expand(msg.text, function (err, longUrl) {
    if (err) {
      var toSend = 'There was some error deciphering your message, check if you\'ve copied the right url! '
      bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
    } else {
      parseLongUrl(longUrl, msg)
    }
  })
}

// converts the shortened URL into a long url, replaces escaped characters to more readable characters
function parseLongUrl (longUrl, msg) {
  var urlSubStrs = longUrl.split('/')
  if (urlSubStrs.length === 6) {
    if (urlSubStrs[2] === 'nusmods.com') {
      var acadYear = urlSubStrs[4]
      var toParse = urlSubStrs[5]
      var parseModuleStrings = toParse.split('?')
      if (parseModuleStrings.length === 2) {
        var semester = parseModuleStrings[0].substring(3)
        var modInfo = parseModuleStrings[1].replaceAll('%5B', '[').replaceAll('%5D', ']')
        var parsedMods = parseModStr(modInfo)
        var promises = []
        for (var i = 0; i < parsedMods.length; i++) {
          promises.push(nusmodsApi.getModuleInformation(acadYear, semester, parsedMods[i].moduleCode))
        }

        Promise.all(promises).then(values => {
          var oddWeek = []
          var evenWeek = []
          var len = numOfDays * numOfHours
          evenWeek = new Array(len).fill('0')
          oddWeek = new Array(len).fill('0')
          getTimeSlots(parsedMods, values, evenWeek, oddWeek)
          sqliteApi.insertUser(msg.from.id, msg.from.first_name, evenWeek.join(''), oddWeek.join(''), msg.from.username).then(
            function (value) {
              if (value) {
                bot.sendMessage(msg.chat.id, 'Your timetable has been uploaded!', {parse_mode: 'HTML'})
              }
            },
            function (err) {
              if (err) {
                bot.sendMessage(msg.chat.id, 'Failed to upload timetable!', {parse_mode: 'HTML'})
              }
            }
          )
        })
      }
    }
  }
}

// parses the string from the url and converts into a json
function parseModStr (inputStr) {
  var modList = []
  var inputArr = inputStr.split('&')
  for (var i = 0; i < inputArr.length; i++) {
    var slotInfo = inputArr[i]
    var moduleCode = slotInfo.split('[')[0]
    var slotType = slotInfo.split('[').pop().split(']').shift()
    var slotValue = slotInfo.split('=').pop()
    var modExists = false
    for (var j = 0; j < modList.length; j++) {
      var toCompareMod = modList[j]
      if (toCompareMod.moduleCode === moduleCode) {
        modExists = true
        modList[j].moduleSlots.push({
          slotType: slotType,
          slotValue: slotValue
        })
      }
    }
    if (!modExists) {
      var newMod = {
        moduleCode: moduleCode,
        moduleSlots: [
          {
            slotType: slotType,
            slotValue: slotValue
          }
        ]
      }
      modList.push(newMod)
    }
  }
  return modList
}

function getTimeSlots (parsedMods, values, evenWeek, oddWeek) {
  for (var j = 0; j < parsedMods.length; j++) {
    var oneMod = parsedMods[j]
    for (var k = 0; k < oneMod.moduleSlots.length; k++) {
      var slotType = oneMod.moduleSlots[k].slotType
      var slotValue = oneMod.moduleSlots[k].slotValue
      //  find what type it is
      slotType = getSlotType(slotType)
      var timing = values[j].Timetable
      //  get all the time associated to the slot type
      for (var m = 0; m < timing.length; m++) {
        var oneTimeSlot = timing[m]
        if (oneTimeSlot.LessonType === slotType && oneTimeSlot.ClassNo === slotValue) {
          // add start and time end to database
          var startTime = oneTimeSlot.StartTime
          var endTime = oneTimeSlot.EndTime
          var day = oneTimeSlot.DayText
          var weekType = oneTimeSlot.WeekText

          getSlotArray(startTime, endTime, day, weekType, evenWeek, oddWeek)
        }
      }
    }
  }
}

function getSlotType (slotType) {
  switch (slotType) {
    case 'LEC':
      slotType = 'Lecture'
      break
    case 'TUT':
      slotType = 'Tutorial'
      break
    case 'LAB':
      slotType = 'Laboratory'
      break
    case 'SEM':
      slotType = 'Seminar-Style Module Class'
      break
    default:
      console.error('cannot find slot type')
  }

  return slotType
}

function getSlotArray (startTime, endTime, day, weekType, evenWeek, oddWeek) {
  var timeArray = ['0800', '0900', '1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000', '2100', '2200', '2300', '0000']
  var startTimeFound = false
  var index = getSlotPositionByDay(day)
  var rowPosition = index * numOfHours

  for (var i = 0; i < (timeArray.length - 1); i++) {
    var timeTableStart = timeArray[i]
    var timeTableEnd = timeArray[i + 1]

    var position = rowPosition + i

    // finding the starting slot
    if (startTime >= timeTableStart && !startTimeFound && startTime < timeTableEnd) {
      changeSlot(weekType, evenWeek, oddWeek, position)

      if (endTime <= timeTableEnd) {
        // for one slot
        break
      } else {
        // span over more than one slot
        startTimeFound = true
        continue
      }
    } else if (startTimeFound) {
      // finding the ending slot
      changeSlot(weekType, evenWeek, oddWeek, position)
      if (endTime <= timeTableEnd) {
        // found the end time slot
        break
      }
    } else {
      continue
    }
  }
}

function getSlotPositionByDay (day) {
  var index = -1
  switch (day) {
    case 'Monday':
      index = dayMonday
      break
    case 'Tuesday':
      index = dayTuesday
      break
    case 'Wednesday':
      index = dayWednesday
      break
    case 'Thursday':
      index = dayThursday
      break
    case 'Friday':
      index = dayFriday
      break
    default:
      console.error('unable to find the day')
  }

  return index
}

function changeSlot (weekType, evenWeek, oddWeek, position) {
  if (weekType === 'Even Week') {
    evenWeek[position] = '1'
  } else if (weekType === 'Odd Week') {
    oddWeek[position] = '1'
  } else if (weekType === 'Every Week') {
    evenWeek[position] = '1'
    oddWeek[position] = '1'
  }
}

function freeIgnoreSchool (msg) {
  var testPromise = sqliteApi.getUsersInChat(msg.chat.id)
  testPromise.then(function (values) {
    var freeStudents = []
    console.log('freeIgnoreSchool', values)
    var time = new Date()
    var slot = getCurrentSlot(time)
    for (var i = 0; i < values.length; i++) {
      if (isEvenWeek(time)) {
        if (values[i].eventimetable.charAt(slot) === '0') {
          // free
          freeStudents.push(values[i])
        }
      } else {
        if (values[i].oddtimetable.charAt(slot) === '0') {
          // free
          freeStudents.push(values[i])
        }
      }
    }
    if (freeStudents.length <= 0) {
      bot.sendMessage(msg.chat.id, 'No one is free now :(', {parse_mode: 'HTML'})
    } else {
      var toSend = '<b>Students who are free now:</b>'
      for (i = 0; i < freeStudents.length; i++) {
        toSend += '\n' + freeStudents[i].firstname
      }
      bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
    }
  })
}

function inSchoolToday (msg) {
  var testPromise = sqliteApi.getUsersInChat(msg.chat.id)
  testPromise.then(function (values) {
    var freeStudents = []
    console.log('inSchoolToday', values)
    var time = new Date()
    var slot = getCurrentSlot(time)
    var day = time.getDay() - 1
    for (var i = 0; i < values.length; i++) {
      if (isEvenWeek(time)) {
        var subStr = values[i].eventimetable.substring(day * numOfHours, (day + 1) * numOfHours)
        console.log(subStr)
        if ((subStr.indexOf('1') > -1) && (values[i].eventimetable.charAt(slot) === '0')) {
          // free
          freeStudents.push(values[i])
        }
      } else {
        subStr = values[i].oddtimetable.substring(day * numOfHours, (day + 1) * numOfHours)
        if ((subStr.indexOf('1') > -1) && (values[i].oddtimetable.charAt(slot) === '0')) {
          // free
          freeStudents.push(values[i])
        }
      }
    }
    if (freeStudents.length <= 0) {
      bot.sendMessage(msg.chat.id, 'No one is in school today :(', {parse_mode: 'HTML'})
    } else {
      var toSend = '<b>Students have school today:</b>'
      for (i = 0; i < freeStudents.length; i++) {
        toSend += '\n' + freeStudents[i].firstname
      }
      bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
    }
  })
}

function freeNow (msg) {
  var testPromise = sqliteApi.getUsersInChat(msg.chat.id)
  testPromise.then(function (values) {
    var freeStudents = []
    console.log('freeNow', values)
    var time = new Date()
    var day = time.getDay() - 1
    for (var i = 0; i < values.length; i++) {
      console.log('checking',values[i])
      if (isEvenWeek(time)) {
        var subStr = values[i].eventimetable.substring(day * numOfHours, (day + 1) * numOfHours)
        if (subStr.indexOf('1') > -1) {
          freeStudents.push(values[i])
        }
      } else {
        subStr = values[i].oddtimetable.substring(day * numOfHours, (day + 1) * numOfHours)
        if (subStr.indexOf('1') > -1) {
          freeStudents.push(values[i])
        }
      }
    }
    if (freeStudents.length <= 0) {
      bot.sendMessage(msg.chat.id, 'No one who has school is around today :(', {parse_mode: 'HTML'})
    } else {
      var toSend = '<b>Students have school today and free now:</b>'
      for (i = 0; i < freeStudents.length; i++) {
        toSend += '\n' + freeStudents[i].firstname
      }
      bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
    }
  })
}
// unused functions for now
function handlePublicTest (msg) {
  console.log('public test')
}

function isEvenWeek (today) {
  const divideWeek = 604800000
  var acadYear = acadCalandar[AcadYear]
  var sem1 = new Date()
  var sem2 = new Date()
  sem1.setFullYear(acadYear[`1`].start[0], acadYear[`1`].start[1], acadYear[`1`].start[2])
  sem2.setFullYear(acadYear[`2`].start[0], acadYear[`2`].start[1], acadYear[`2`].start[2])
  if (today >= sem2) {
    // settle sem 2
    var week = Math.round((today - sem2) / divideWeek) + 1
    return week % 2 === 0
  } else {
    // settle sem 1
    week = Math.round((today - sem1) / divideWeek) + 1
    return week % 2 === 0
  }
}

function getCurrentSlot (time) {
  var day = time.getDay() - 1
  var timeStr = ('0' + time.getHours()).slice(-2) + '00'

  var timeArray = ['0800', '0900', '1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000', '2100', '2200', '2300', '0000']
  var slot = -1
  for (var i = 0; i < timeArray.length; i++) {
    if (timeStr === timeArray[i]) {
      slot = i + (numOfHours * day)
    }
  }
  return slot
}

function handlePrivateTest (msg) {
  console.log('private test!')
}

// overload for String
String.prototype.replaceAll = function (search, replacement) { // eslint-disable-line
  var target = this
  return target.split(search).join(replacement)
}
