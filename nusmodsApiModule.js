var rp = require('request-promise')

function getModuleInformation (year, semester, code) {
  var options = {
    uri: 'http://api.nusmods.com/' + year + '/' + semester + '/modules/' + code + '.json',
    json: true // Automatically parses the JSON string in the response
  }

  return rp(options)
}
module.exports = {
  getModuleInformation: getModuleInformation
}
