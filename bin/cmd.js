#!/usr/bin/env node

process.title = 'gcr'
var log = require('npmlog')
log.pause()

var gcr = require('../lib/gcr')
  , nopt = require('nopt')
  , path = require('path')
  , help = require('help')()
  , fs = require('fs')
  , inquirer = require('inquirer')
  , url = require('url')
  , knownOpts = { loglevel: ['verbose', 'info', 'warn', 'error', 'silly']
                , url: String
                , token: String
                , help: Boolean
                , version: Boolean
                , buildDir: path
                , strictSSL: Boolean
                , timeout: Number
                , keypath: path
                }
  , shortHand = { verbose: ['--loglevel', 'verbose']
                , h: ['--help']
                , u: ['--url']
                , t: ['--token']
                , v: ['--version']
                , b: ['--buildDir']
                , s: ['--strictSSL']
                , T: ['--timeout']
                , k: ['--keypath']
                }
  , parsed = nopt(knownOpts, shortHand)

if (parsed.help) {
  return help()
}

if (parsed.version) {
  console.log('gcr', 'v'+gcr.version)
  return
}

var needsUrl = false
  , needsRegToken = false

var urlQuestion = {
    type: 'input'
  , name: 'url'
  , message: 'Please enter your GitLab CI url'
  , validate: function(input) {
    var u = url.parse(input)
    var valid = u.protocol && u.host && u.href
    if (valid) {
      gcr.config.set('url', valid)
    }
    return valid && true
  }
}

var tokenQuestion = {
    type: 'input'
  , name: 'token'
  , message: 'Please enter your GitLab CI Registration Token'
  , validate: function(input) {
    var done = this.async()
    if (!input) return done('Registration token is required')
    var fp = gcr.config.get('keypath')
    fs.readFile(fp, 'utf8', function(err, content) {
      if (err) {
        log.error('[readFile]', 'error reading public key', err)
        process.exit(1)
      }
      gcr.client.registerRunner(content, input, function(err, token){
        if (err) {
          log.error('[register]', 'error registering', err)
          process.exit(1)
        } else {
          gcr.config.set('token', token)
          gcr.config.save(function(err) {
            done(true)
          })
        }
      })
    })
  }
}

process.on('SIGTERM', process.exit)

gcr.load(parsed, function(err) {
  if (err) {
    var t = err.heading || ''
    delete err.heading
    log.error(t, err)
    process.exit(1)
  }
  var questions = []

  if (!gcr.config.get('url')) {
    questions.push(urlQuestion)
    needsUrl = true
  }

  if (!gcr.config.get('token')) {
    questions.push(tokenQuestion)
    needsRegToken = true
  }

  if (questions.length) {
    inquirer.prompt(questions, function(answers) {
      gcr.runner.start()
    })
  } else {
    gcr.runner.start()
  }
})
