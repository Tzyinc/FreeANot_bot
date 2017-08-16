var fs = require('fs')
var urlExpander = require('expand-url')
var apiKeys = JSON.parse(fs.readFileSync('apiKeys.json', 'utf8'))
var TelegramBot = require('node-telegram-bot-api')
var bot = new TelegramBot(apiKeys.telegramKey, { polling: true })
var nusmodsApi = require('./nusmodsApiModule.js')
var newUsers = []

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
        for (var i = 0; i < parsedMods.length; i++) {
          console.log(parsedMods[i])
          // TODO: using nusmodsAPI.getModuleInformation, get the time slots, parse it and store in database
        }
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
