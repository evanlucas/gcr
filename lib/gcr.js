var EventEmitter = require('events').EventEmitter
  , gcr = new EventEmitter
  , log = require('npmlog')
  , fs = require('fs')
  , nconf = require('nconf')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , confFile = path.join(process.env.HOME, '.config', 'gcr.json')
  , slide = require('slide')
  , chain = slide.chain
  , which = require('which')

log.heading = 'gcr'

module.exports = gcr

gcr.root = path.dirname(confFile)
gcr.loaded = false
gcr.version = require('../package').version
gcr.key = path.join(process.env.HOME, '.ssh', 'gcr.pub')

var commandCache = {}

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
    nconf.file({ file: confFile })
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
    if (!nconf.get('buildDir')) {
      nconf.set('buildDir', '/tmp/builds')
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

    fs.exists(gcr.key, function(e) {
      if (!e) {
        gcr.utils.genSSHKey(function(err) {
          if (err) {
            err.heading = '[ssh-keygen]'
            return cb && cb(err)
          }
          cb()
        })
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
    gcr.builder = require('./builder')()
    gcr.client = require('./client')()
    gcr.utils = require('./utils')
    cb()
  })
}

gcr.help = [
    ''
  , 'gcr v'+gcr.version
  , ''
  , '   Usage:'
  , ''
  , '     gcr [command] [options]'
  , ''
  , '   Options:'
  , ''
  , '     -h, --help                  Show help and usage'
  , '     -l, --loglevel <level>      Set log level'
  , '     -v, --version               Show version'
  , '     -u, --url <url>             Set CI Server URL'
  , '     -t, --token <token>         Set Registration Token'
  , '     -T, --timeout <number>      Set the timeout in milliseconds'
  , '     -b, --buildDir <dir>        Set the builds directory'
  , ''
].join('\n')
