var fs = require('fs')
var urlExpander = require('expand-url')
var apiKeys = JSON.parse(fs.readFileSync('apiKeys.json', 'utf8'))
var TelegramBot = require('node-telegram-bot-api')
var bot = new TelegramBot(apiKeys.telegramKey, { polling: true })
var nusmodsApi = require('./nusmodsApiModule.js')
var newUsers = []
var oddWeek = []
var evenWeek = []

const numOfDays = 5
const numOfHours = 16
const dayMonday = 0
const dayTuesday = 1
const dayWednesday = 2
const dayThursday = 3
const dayFriday = 4

bot.on('message', (msg) => {
  // console.log(msg);
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
  if (msg.text.toLowerCase().indexOf('/start') === 0) {
    handlePublicStart(msg)
  } else if (msg.text.toLowerCase().indexOf('/test') === 0) {
    handlePublicTest(msg)
  }
}

function handlePublicStart (msg) {
  // TODO: if chat record exists, add user to the chat. else create chat and add user
  console.log(msg)
}

function handlePrivateStart (msg) {
  var newUser = {
    telegramId: msg.from.id,
    name: msg.from.first_name,
    timetableUrl: ''
  }
  if (msg.from.username) {
    newUser.username = msg.from.username
  }
  var exists = false
  for (var i = 0; i < newUsers.length; i++) {
    var checkUser = newUsers[i]
    if (msg.from.id === checkUser.telegramId) {
      exists = true
    }
  }
  if (!exists) {
    newUsers.push(newUser)
  }
  var toSend = 'Please send me your nusmods timetable url!'
  bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
}

function handlePrivateOthers (msg) {
  for (var i = 0; i < newUsers.length; i++) {
    var checkUser = newUsers[i]
    if (msg.from.id === checkUser.telegramId) {
      console.log(msg)
      urlExpander.expand(msg.text, function (err, longUrl) {
        if (err) {
          var toSend = 'There was some error deciphering your message, check if you\'ve copied the right url! '
          bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
        } else {
          toSend = parseLongUrl(longUrl, msg)
          // TODO: remove user from newusers array
          bot.sendMessage(msg.chat.id, toSend, {parse_mode: 'HTML'})
        }
      })
    }
  }
}

// converts the shortened URL into a long url, replaces escaped characters to more readable characters
function parseLongUrl (longUrl, msg) {
  var urlSubStrs = longUrl.split('/')
  var toSend = ''
  if (urlSubStrs.length === 6) {
    if (urlSubStrs[2] === 'nusmods.com') {
      var acadYear = urlSubStrs[4]
      var toParse = urlSubStrs[5]
      var parseModuleStrings = toParse.split('?')
      if (parseModuleStrings.length === 2) {
        var semester = parseModuleStrings[0].substring(3)
        var modInfo = parseModuleStrings[1].replaceAll('%5B', '[').replaceAll('%5D', ']')
        console.log(acadYear, semester, modInfo)
        toSend += 'Success!'
        var parsedMods = parseModStr(modInfo)
        var promises = []
        for (var i = 0; i < parsedMods.length; i++) {
          console.log('printing parsedMods')
          console.log(parsedMods[i])
          promises.push(nusmodsApi.getModuleInformation(acadYear, semester, parsedMods[i].moduleCode))
        }
        Promise.all(promises).then(values => {
          console.log('printing values')
          console.log(values)
          for (var l = 0; l < values.length; l++) {
            var oneValue = values[l]
            console.log(oneValue.Timetable)
          }

          // TODO: from the results and parsed mods, find the time slots to add in database
          getTimeSlots(parsedMods, values)
          console.log('printing timeslots')
          console.log(evenWeek)
          console.log(oddWeek)
        })
      }
    }
  }
  // console.log(urlSubStrs)
  return toSend
}

// parses the string from the url and converts into a json in the format
/*
{ moduleCode: 'SC2212',
  moduleSlots:
   [ { slotType: 'LEC', slotValue: '1' },
     { slotType: 'TUT', slotValue: 'D1' } ] }
{ moduleCode: 'SSS1207',
  moduleSlots: [ { slotType: 'LEC', slotValue: 'SL1' } ] }
{ moduleCode: 'CS2102',
  moduleSlots:
   [ { slotType: 'LEC', slotValue: '1' },
     { slotType: 'TUT', slotValue: '12' } ] }

*/
function parseModStr (inputStr) {
  var modList = []
  var inputArr = inputStr.split('&')
  for (var i = 0; i < inputArr.length; i++) {
    var slotInfo = inputArr[i]
    var moduleCode = slotInfo.split('[')[0]
    var slotType = slotInfo.split('[').pop().split(']').shift() // returns 'two'
    var slotValue = slotInfo.split('=').pop()
    console.log(moduleCode, slotType, slotValue)
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

function getTimeSlots (parsedMods, values) {
  var len = numOfDays * numOfHours
  // var results = new Array(len).fill('0')
  evenWeek = new Array(len).fill('0')
  oddWeek = new Array(len).fill('0')

  for (var j = 0; j < parsedMods.length; j++) {
    var oneMod = parsedMods[j]
    for (var k = 0; k < oneMod.moduleSlots.length; k++) {
      var slotType = oneMod.moduleSlots[k].slotType
      var slotValue = oneMod.moduleSlots[k].slotValue
      //  find what type it is
      slotType = getSlotType(slotType)
      // console.log('slot type is ');
      // console.log(slotType);
      var timing = values[j].Timetable
      //  get all the time associated to the slot type
      for (var m = 0; m < timing.length; m++) {
        var oneTimeSlot = timing[m]
        if (oneTimeSlot.LessonType === slotType && oneTimeSlot.ClassNo === slotValue) {
          // console.log('one time slot')
          // console.log(oneTimeSlot)
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
      console.log('cannot find slot type')
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
    // console.log(timeTableStart, timeTableEnd)
    // console.log(startTime, endTime)

    var position = rowPosition + i

    // finding the starting slot
    if (startTime >= timeTableStart && !startTimeFound && startTime < timeTableEnd) {
      checkWeekType(weekType, evenWeek, oddWeek, position)

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
      checkWeekType(weekType, evenWeek, oddWeek, position)
      if (endTime <= timeTableEnd) {
        // found the end time slot
        // console.log(endTime, timeTableEnd)
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
      console.log('unable to find the day')
  }

  return index
}

function checkWeekType (weekType, evenWeek, oddWeek, position) {
  if (weekType === 'Even Week') {
    evenWeek[position] = '1'
  } else if (weekType === 'Odd Week') {
    oddWeek[position] = '1'
  } else if (weekType === 'Every Week') {
    evenWeek[position] = '1'
    oddWeek[position] = '1'
  }
}

// unused functions for now
function handlePublicTest (msg) {
  console.log(msg)
}

function handlePrivateTest (msg) {
  console.log('private test!')
}

// overload for String
String.prototype.replaceAll = function (search, replacement) { // eslint-disable-line
  var target = this
  return target.split(search).join(replacement)
}
