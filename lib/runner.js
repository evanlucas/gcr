var gcr = require('./gcr')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter
  , log = require('npmlog')

module.exports = Runner

function Runner() {
  if (!(this instanceof Runner))
    return new Runner()
  EventEmitter.call(this)
  this.running = false
  this.interval = null
}

util.inherits(Runner, EventEmitter)

Runner.prototype.start = function() {
  var self = this
  if (gcr.builder.currentBuild) {
    if (this.interval) {
      clearInterval(this.interval)
    }
    return
  }
  self.getBuild()
  this.interval = setInterval(function() {
    self.getBuild()
  }, 5000)
}

Runner.prototype.getBuild = function() {
  var self = this
  gcr.client.getBuild(function(err, build) {
    if (err) {
      log.error('[runner]', 'error getting builds', err)
      return
    }
    if (!build) return
    gcr.builder.setup(build)
    self.runBuild()
  })
}

Runner.prototype.runBuild = function() {
  if (this.interval) {
    clearInterval(this.interval)
  }
  var self = this
  gcr.builder.on('error', function(err, current) {
    log.verbose('[runner]', 'error', err, current)
    current && self.updateBuild(current)
  })

  gcr.builder.on('done', function(current) {
    log.silly('[runner]', 'done', current)
    self.updateBuild(current)
    gcr.builder.currentBuild = null
    process.nextTick(function() {
      self.start()
    })
  })

  gcr.builder.on('state', function(state, current) {
    log.silly('[runner]', 'state', state, current)
    self.updateBuild(current)
  })

  gcr.builder.on('command', function(cmd, current) {
    log.silly('[runner]', 'command', cmd, current)
    self.updateBuild(current)
  })

  gcr.builder.run()
}

Runner.prototype.updateBuild = function(current) {
  if (!current) return
  var id = current.id
    , state = current.state
    , output = current.output
  gcr.client.updateBuild(id, state, output, function(err) {
    if (err) {
      log.error('[runner]', 'error updating build', err)
    }
  })
}
