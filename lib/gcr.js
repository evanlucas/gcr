var EventEmitter = require('events').EventEmitter
  , gcr = new EventEmitter
  , log = require('npmlog')
  , fs = require('fs')
  , nconf = require('nconf')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , home = require('os-homedir')()
  , confFile = path.join(home, '.config', 'gcr.json')
  , slide = require('slide')
  , chain = slide.chain
  , which = require('which')

log.heading = 'gcr'

module.exports = gcr

gcr.confFile = confFile
gcr.root = path.dirname(gcr.confFile)
gcr.loaded = false
gcr.version = require('../package').version

gcr.utils = require('./utils')

gcr.load = function(opts, cb) {
  if ('function' === typeof opts) cb = opts, opts = {}
  if (gcr.loaded) return cb()
  mkdirp(gcr.root, function(err) {
    log.resume()
    if (err) {
      err.heading = '[mkdirp]'
      return cb(err)
    }
    nconf.file({ file: gcr.confFile })
    nconf.defaults(require('./config.default')(opts))
    if (opts.url) {
      nconf.set('url', opts.url)
    }
    if (opts.token) {
      nconf.set('token', opts.token)
    }
    if (opts.buildDir) {
      nconf.set('buildDir', opts.buildDir)
    }
    if (opts.npm) {
      nconf.set('npm', opts.npm)
    }
    if (opts.hasOwnProperty('strictSSL')) {
      nconf.set('strictSSL', opts.strictSSL)
    }
    if (opts.timeout) {
      nconf.set('timeout', opts.timeout)
    }
    if (!nconf.get('buildDir')) {
      nconf.set('buildDir', '/tmp/builds')
    }
    if (opts.keypath) {
      nconf.set('keypath', opts.keypath)
    }
    if (opts.shell) {
      nconf.set('shell', opts.shell)
    }
    if (opts.shellFlag) {
      nconf.set('shellFlag', opts.shellFlag)
    }
    gcr.config = nconf
    chain([
        validateGit
      , validateSetup
      , saveConfig
    ], cb)
  })
}

function validateGit(cb) {
  if (nconf.get('git')) return cb()
  which('git', function(err, git) {
    if (err) {
      err.heading = '[which]'
      return cb(err)
    }
    nconf.set('git', git)
    cb()
  })
}

function validateSetup(cb) {
  mkdirp(gcr.config.get('buildDir'), function(err) {
    if (err) {
      err.heading = '[mkdirp]'
      return cb && cb(err)
    }
    gcr.utils.maybeGenSSHKey(function(err) {
      if (err) {
        err.heading = '[ssh-keygen]'
        return cb(err)
      } else {
        cb()
      }
    })
  })
}

function saveConfig(cb) {
  nconf.save(function() {
    log.level = gcr.config.get('loglevel')
    log.heading = gcr.config.get('heading') || 'gcr'
    gcr.log = log
    gcr.loaded = true
    gcr.runner = require('./runner')()
    gcr.client = require('./client')()
    cb()
  })
}
