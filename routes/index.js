var xmlparser = require('express-xml-bodyparser'),
    bodyParser = require('body-parser'),
    twilio = require('twilio'),
    watson = require('watson-developer-cloud'),
    phonebot = require('../lib/phonebot.js'),
    cfenv = require('cfenv'),
    log = require('loglevel')

var service_credentials = function (name) {
  var service = cfenv.getAppEnv().getService(name)
  if (!service) {
    log.error('FATAL: Missing service credentials: ' + name)
    process.exit(1)
  }

  return service.credentials
}

var twilio_account = service_credentials('twilio'),
  client = twilio(twilio_account.accountSID, twilio_account.authToken)

var s2t = service_credentials('speech_to_text')
var speech_to_text = watson.speech_to_text({
  username: s2t.username,
  password: s2t.password,
  version: 'v1'
})

var bot = phonebot(client, speech_to_text, service_credentials('slack_webhooks'), cfenv.getAppEnv().url + '/recording')

module.exports = function (app) {
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(xmlparser())

  app.post('/recording/:channel', function (req, res) {
    log.debug('HTTP POST /recording/' + req.params.channel + '@ ' + (new Date()).toISOString())
    log.trace(JSON.stringify(req.body))

    res.send(bot.phone_message(req.params.channel, req))
  })

  app.post('/slackbot', function (req, res) {
    log.debug('HTTP POST /slackbot/ (#' + req.body.channel_name + ')' + ' @ ' + (new Date()).toISOString())
    log.trace(req.body)

    bot.slack_message(req.body.channel_name, req.body)
  })
}
