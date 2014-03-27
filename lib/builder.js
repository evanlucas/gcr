var gcr = require('./gcr')
  , spawn = require('child_process').spawn
  , rimraf = require('rimraf')
  , slide = require('slide')
  , chain = slide.chain
  , fs = require('fs')
  , log = require('npmlog')
  , path = require('path')
  , util = require('util')
  , mkdirp = require('mkdirp')
  , argsplit = require('argsplit')
  , EventEmitter = require('events').EventEmitter

module.exports = Builder

function Builder() {
  if (!(this instanceof Builder))
    return new Builder()

  EventEmitter.call(this)
  this.currentBuild = null
  this.git = gcr.config.get('git')
  this.buildDir = gcr.config.get('buildDir')
}

util.inherits(Builder, EventEmitter)

Builder.prototype.setup = function(opts) {
  var projectId = opts.project_id
  this.currentBuild = {
      commands: opts.commands || []
    , ref: opts.ref
    , refName: opts.ref_name
    , id: opts.id
    , projectId: opts.project_id
    , repoUrl: opts.repo_url
    , state: 'waiting'
    , beforeSha: opts.before_sha
    , timeout: gcr.config.get('timeout') || opts.timeout || 7200
    , allowGitFetch: opts.allow_git_fetch
    , output: ''
  }
  this.currentBuild.projectDir = path.join(this.buildDir, 'project-'+projectId)
  this.timer = null
  this.emit('state', 'waiting', this.currentBuild)
}

Builder.prototype.run = function() {
  var self = this
  if (!this.currentBuild) {
    return this.emit('error', new Error('cannot run without a current build'))
  }
  log.verbose('[builder]', 'run', this)
  this.currentBuild.state = 'running'
  this.emit('state', 'running', this.currentBuild)
  this.shouldClone(function(should) {
    if (!should) {
      self.fetch(function(err) {
        if (err) {
          return self.emit('done', self.currentBuild)
        }
        runCommands()
      })
    } else {
      rimraf(self.currentBuild.projectDir, function(err) {
        if (err) {
          return self.emit('done', self.currentBuild)
        }
        self.clone(function(err) {
          if (err) {
            return self.emit('done', self.currentBuild)
          }
          runCommands()
        })
      })
    }
  })

  var len = this.currentBuild.commands.length
  var dir = self.currentBuild.projectDir
  function runCommand(idx) {
    log.verbose('[builder]', 'running command', idx, 'of', len)
    if (idx < len) {
      var cmd = self.currentBuild.commands[idx]
      self.runCommand(cmd, dir, function(err) {
        if (err) {
          return self.emit('done', self.currentBuild)
        } else {
          runCommand(idx+1)
        }
      })
    } else {
      self.currentBuild.state = 'success'
      self.emit('done', self.currentBuild)
    }
  }

  function runCommands() {
    runCommand(0)
  }
}

Builder.prototype.clone = function(cb) {
  var dir = gcr.config.get('buildDir')
  var cmd = ['clone', this.currentBuild.repoUrl,
    'project-'+this.currentBuild.projectId]
  this.gitCommand(cmd, dir, cb)
}

Builder.prototype.fetch = function(cb) {
  var self = this
  var dir = this.currentBuild.projectDir

  function resetHard(cb) {
    self.gitCommand(['reset', '--hard'], dir, cb)
  }

  function clean(cb) {
    self.gitCommand(['clean', '-fdx'], dir, cb)
  }

  function setOrigin(cb) {
    self.gitCommand(['remote', 'set-url', 'origin', self.currentBuild.repoUrl],
                    dir,
                    cb)
  }

  function fetchOrigin(cb) {
    self.gitCommand(['fetch', 'origin'], dir, cb)
  }

  chain([
      resetHard
    , clean
    , setOrigin
    , fetchOrigin
  ], cb)
}

Builder.prototype.runCommand = function(cmd, dir, cb) {
  var self = this
  if ('function' === typeof dir) cb = dir, dir = process.cwd()
  var env = {
      CI_SERVER: true
    , CI_SERVER_NAME: 'GitLab CI'
    , CI_SERVER_VERSION: null
    , CI_SERVER_REVISION: null
    , CI_BUILD_REF: this.currentBuild.ref
    , CI_BUILD_BEFORE_SHA: this.currentBuild.beforeSha
    , CI_BUILD_REF_NAME: this.currentBuild.refName
    , CI_BUILD_ID: this.currentBuild.id
  }

  env = util._extend(process.env, env)

  var opts = {
      env: env
    , cwd: dir
    , timeout: this.timeout
  }

  var fixedCmd = cmd
  if (!Array.isArray(cmd)) {
    fixedCmd = argsplit(cmd)
  }

  log.verbose('[builder]', 'cmd', cmd)
  this.currentBuild.output += util.format('\n%s\n', cmd)

  var child = spawn('/usr/bin/env', fixedCmd, opts)
  this.timer = setTimeout(function() {
    child.kill()
    self.currentBuild.output += '\n** TIMEOUT **\n'
  }, this.currentBuild.timeout)
  child.stderr.on('data', function(d) {
    var data = d.toString()
    log.verbose('[builder]', 'stderr', data)
    self.currentBuild.output += data
  })
  child.stdout.on('data', function(d) {
    var data = d.toString()
    log.verbose('[builder]', 'stdout', data)
    self.currentBuild.output += data
  })
  child.on('exit', function(code) {
    if (self.timer) {
      clearTimeout(self.timer)
      self.timer = null
    }
    if (code !== 0) {
      var e = new Error('process exited with code: '+code)
      self.currentBuild.output += util.format(
        'Command: [%s] exited with code: %d', cmd, code
      )
      e.command = cmd
      e.opts = opts
      self.currentBuild.state = 'failed'
      self.emit('error', e, self.currentBuild)
      return cb && cb(e)
    }
    self.emit('command', cmd, self.currentBuild)
    return cb && cb()
  })
}

Builder.prototype.gitCommand = function(cmd, dir, cb) {
  var self = this
  if ('function' === typeof dir) cb = dir, dir = process.cwd()
  var env = {
      CI_SERVER: true
    , CI_SERVER_NAME: 'GitLab CI'
    , CI_SERVER_VERSION: null
    , CI_SERVER_REVISION: null
    , CI_BUILD_REF: this.currentBuild.ref
    , CI_BUILD_BEFORE_SHA: this.currentBuild.beforeSha
    , CI_BUILD_REF_NAME: this.currentBuild.refName
    , CI_BUILD_ID: this.currentBuild.id
  }

  env = util._extend(process.env, env)

  var opts = {
      env: env
    , cwd: dir
    , timeout: this.timeout
  }

  log.verbose('[builder]', 'cmd', cmd)
  this.currentBuild.output += util.format('\n%s %s\n', self.git, cmd.join(' '))
  var child = spawn(this.git, cmd, opts)
  this.timer = setTimeout(function() {
    child.kill()
    self.currentBuild.output += '\n** TIMEOUT **\n'
  }, this.currentBuild.timeout)
  child.stderr.on('data', function(d) {
    var data = d.toString()
    log.verbose('[builder]', 'stderr', data)
    self.currentBuild.output += data
  })
  child.stdout.on('data', function(d) {
    var data = d.toString()
    log.verbose('[builder]', 'stdout', data)
    self.currentBuild.output += data
  })
  child.on('exit', function(code) {
    if (self.timer) {
      clearTimeout(self.timer)
      self.timer = null
    }
    if (code !== 0) {
      var e = new Error('process exited with code: '+code)
      self.currentBuild.output += util.format(
        'Command: [%s %s] exited with code: %d', self.git, cmd.join(' '), code
      )
      e.command = cmd
      e.opts = opts
      self.currentBuild.state = 'failed'
      self.emit('error', e, self.currentBuild)
      return cb && cb(e)
    }
    self.emit('command', cmd, self.currentBuild)
    return cb && cb()
  })
}

Builder.prototype.shouldClone = function(cb) {
  var self = this
  var d = path.join(this.currentBuild.projectDir, '.git')
  fs.exists(d, function(e) {
    if (!e) return cb(true)
    if (e) {
      return cb(!self.currentBuild.allowGitFetch)
    }
  })
}
