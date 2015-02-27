var EventEmitter = require('events').EventEmitter
  , gcr = new EventEmitter
  , log = require('npmlog')
  , fs = require('fs')
  , nconf = require('nconf')
  , mkdirp = require('mkdirp')
  , path = require('path')
  , home = process.env.HOME || process.env.USERPROFILE || '/root'
  , slide = require('slide')
  , chain = slide.chain
  , which = require('which')

log.heading = 'gcr'

module.exports = gcr

gcr.root = path.join(home, '.config')
gcr.loaded = false
gcr.version = require('../package').version
// TODO: allow setting key path via config
// WARN: semver-major
gcr.key = path.join(home, '.ssh', 'gcr.pub')

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
    if (opts.project) {
      nconf.file({ file: path.join(home, '.config', 'gcr.' + opts.project + '.json') })
    } else {
      nconf.file({ file: path.join(home, '.config', 'gcr.json') })
    }
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
    gcr.client = require('./client')()
    cb()
  })
}

gcr.help = [
    ''
  , 'gcr v'+gcr.version
  , ''
  , '   Usage:'
  , ''
  , '     gcr [options]'
  , ''
  , '   Options:'
  , ''
  , '     -h, --help                  Show help and usage'
  , '     -l, --loglevel <level>      Set log level'
  , '     -v, --version               Show version'
  , '     -u, --url <url>             Set CI Server URL'
  , '     -t, --token <token>         Set Registration Token'
  , '     -T, --timeout <number>      Set the timeout in seconds'
  , '     -b, --buildDir <dir>        Set the builds directory'
  , '     -s, --strictSSL             Strict SSL'
  , '     -n, --npm                   Run npm install/test if no commands '+
    'are present'
  , '     -p, --project               Use named config file for a project ' +
    'if you need to launch multiple runners'
  , ''
].join('\n')
