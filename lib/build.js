'use strict'

const gcr = require('./gcr')
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
    , EE = require('events')

module.exports = Build

function Build(opts) {
  if (!(this instanceof Build))
    return new Build(opts)

  EE.call(this)
  this.git = gcr.config.get('git')
  this.buildDir = gcr.config.get('buildDir')
  opts.commands = opts.commands || []
  opts.timeout = +(gcr.config.get('timeout') || opts.timeout || 5000) * 1000
  this.opts = opts
  this.output = ''
  this.projectDir = path.join(this.buildDir, 'project-'+opts.project_id)
  this.state = 'waiting'
}

util.inherits(Build, EE)

Build.prototype.run = function() {
  this.state = 'running'
  const self = this
  this.shouldClone((should) => {
    if (!should) {
      this.fetch((err) => {
        if (err) return this.emit('done', false)
        runCommand(0)
      })
    } else {
      rimraf(self.projectDir, (err) => {
        if (err) {
          this.state = 'failed'
          this.update(() => {
            this.emit('done', false)
          })
          return
        }
        this.clone((err) => {
          if (err) return this.emit('done', false)
          runCommand(0)
        })
      })
    }
  })

  const cmds = this.opts.commands
  const len = cmds.length
  const dir = this.projectDir
  function runCommand(idx) {
    if (idx < len) {
      log.verbose('[build]', 'running command', idx+1, 'of', len)
      const cmd = cmds[idx]
      self.runCommand(cmd, dir, function(err) {
        if (err) return self.emit('done', false)
        runCommand(idx+1)
      })
    } else {
      self.state = 'success'
      self.update(function() {
        self.emit('done', true)
      })
    }
  }
}

Build.prototype.clone = function(cb) {
  const cmd = ['clone', this.opts.repo_url, 'project-'+this.opts.project_id]
  const dir = this.projectDir
  this.gitCommand(cmd, this.buildDir, (err) => {
    if (err) return cb && cb(err)
    this.gitCommand(['checkout', this.opts.ref], dir, cb)
  })
}

Build.prototype.fetch = function(cb) {
  const self = this

  const dir = this.projectDir
  const repoUrl = this.opts.repo_url

  function resetHard(cb) {
    self.gitCommand(['reset', '--hard'], dir, cb)
  }

  function clean(cb) {
    self.gitCommand(['clean', '-fdx'], dir, cb)
  }

  function setOrigin(cb) {
    self.gitCommand( ['remote', 'set-url', 'origin', repoUrl]
                   , dir
                   , cb
                   )
  }

  function fetchOrigin(cb) {
    self.gitCommand(['fetch', 'origin'], dir, cb)
  }

  function checkout(cb) {
    self.gitCommand(['checkout', self.opts.ref], dir, cb)
  }

  chain([
    resetHard
  , clean
  , setOrigin
  , fetchOrigin
  , checkout
  ], cb)
}

Build.prototype.shouldClone = function(cb) {
  const d = path.join(this.projectDir, '.git')
  fs.exists(d, (e) => {
    if (!e) return cb(true)
    return cb(!this.opts.allow_git_fetch)
  })
}

Build.prototype.append = function(str) {
  this.output += str
}

Build.prototype.runCommand = function(cmd, dir, cb) {
  const self = this
  if ('function' === typeof dir) cb = dir, dir = process.cwd()
  const env = {
    CI_SERVER: true
  , CI_SERVER_NAME: 'GitLab CI'
  , CI_SERVER_VERSION: null
  , CI_SERVER_REVISION: null
  , CI_BUILD_REF: this.opts.ref
  , CI_BUILD_BEFORE_SHA: this.opts.before_sha
  , CI_BUILD_REF_NAME: this.opts.ref_name
  , CI_BUILD_ID: this.opts.id
  }

  if (this.opts.variables && this.opts.variables.length) {
    this.opts.variables.forEach(function(variable) {
      env[variable.key] = variable.value
    })
  }

  util._extend(env, process.env)

  const opts = {
    env: env
  , cwd: dir
  , timeout: this.opts.timeout
  }

  var fixedCmd = cmd
  if (!Array.isArray(cmd)) {
    fixedCmd = argsplit(cmd)
  }

  log.verbose('[builder]', 'cmd', cmd)
  this.append(`\n${cmd}\n`)

  const child = spawn('/bin/sh', ['-c', fixedCmd.join(' ')], opts)
  var timedout = false
  var timer = setTimeout(() => {
    timedout = true
    child.kill()
    this.append('\n** TIMEOUT **\n')
  }, this.opts.timeout)

  child.stderr.on('data', (d) => {
    const data = d.toString()
    log.silly('[builder]', 'stderr', data)
    this.append(data)
  })

  child.stdout.on('data', (d) => {
    const data = d.toString()
    log.silly('[builder]', 'stdout', data)
    this.append(data)
  })

  child.on('error', (err) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const e = new Error(`Command: [${cmd}] failed ${err.message}`)
    this.append(e)
    log.error(e, err)
    this.state = 'failed'
    this.update(function() {
      cb && cb(e)
    })
  })

  child.on('close', (code) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (code !== 0) {
      const msg = timedout
        ? 'process timedout'
        : `process exited with code: ${code}`

      const e = new Error(msg)
      const to = timedout ? 'yes' : 'no'
      this.append(`Command: ${cmd} exited with code: ${code} timedout: ${to}`)
      e.command = cmd
      e.opts = opts
      this.state = 'failed'
      this.update(function() {
        cb && cb(e)
      })
      return
    }
    this.update(function() {
      cb && cb()
    })
  })
}

Build.prototype.gitCommand = function(cmd, dir, cb) {
  const self = this
  if ('function' === typeof dir) cb = dir, dir = process.cwd()
  const env = {
    CI_SERVER: true
  , CI_SERVER_NAME: 'GitLab CI'
  , CI_SERVER_VERSION: null
  , CI_SERVER_REVISION: null
  , CI_BUILD_REF: this.opts.ref
  , CI_BUILD_BEFORE_SHA: this.opts.before_sha
  , CI_BUILD_REF_NAME: this.opts.ref_name
  , CI_BUILD_ID: this.opts.id
  }

  if (this.opts.variables && this.opts.variables.length) {
    this.opts.variables.forEach(function(variable) {
      env[variable.key] = variable.value
    })
  }

  util._extend(env, process.env)

  const opts = {
    env: env
  , cwd: dir
  , timeout: this.opts.timeout
  }

  log.verbose('[builder]', 'cmd', cmd)
  self.append(`\n${self.git} ${cmd.join(' ')}\n`)
  const child = spawn(this.git, cmd, opts)
  var timedout = false
  var timer = setTimeout(() => {
    timedout = true
    child.kill()
    this.append('\n** TIMEOUT **\n')
  }, this.opts.timeout)

  child.stderr.on('data', (d) => {
    const data = d.toString()
    log.silly('[builder]', 'stderr', data)
    this.append(data)
  })

  child.stdout.on('data', (d) => {
    const data = d.toString()
    log.silly('[builder]', 'stdout', data)
    this.append(data)
  })

  child.on('error', (err) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    const e = new Error(`Command: [${cmd}] failed ${err.message}`)
    this.append(e)
    log.error(e, err)
    this.state = 'failed'
    this.update(function() {
      cb && cb(e)
    })
  })

  child.on('exit', (code) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (code !== 0) {
      var msg = timedout
        ? 'process timedout'
        : `process exited with code: ${code}`
      const e = new Error(msg)
      const to = timedout ? 'yes' : 'no'
      this.append(`Command: [${self.git} ${cmd.join(' ')}] exited with code: ` +
        `${code} timedout: ${to}`)
      e.command = cmd
      e.opts = opts
      this.state = 'failed'
      this.update(function() {
        cb && cb(e)
      })
      return
    }
    this.update(function() {
      cb && cb()
    })
  })
}

Build.prototype.update = function(cb) {
  const id = this.opts.id
  gcr.client.updateBuild(+id, this.state, this.output, cb)
}
