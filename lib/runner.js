'use strict'

const gcr = require('./gcr')
    , util = require('util')
    , EventEmitter = require('events')
    , log = require('npmlog')
    , Build = require('./build')

module.exports = Runner

function Runner() {
  if (!(this instanceof Runner))
    return new Runner()
  EventEmitter.call(this)
  // { buildId: projectId }
  this.builds = new Map()
  // { buildId: buildData }
  this.queue = new Map()
  this.interval = null
}

util.inherits(Runner, EventEmitter)

Runner.prototype.start = function() {
  var self = this
  self.getBuild()
  this.interval = setInterval(function() {
    self.getBuild()
  }, 5000)
}

// id must always be a number
Runner.prototype.projectIsRunning = function(id) {
  for (let proj of this.builds.values()) {
    if (proj === id) return true
  }

  return false
}

Runner.prototype.getBuild = function() {
  var self = this
  gcr.client.getBuild(function(err, data) {
    if (err) {
      log.error('[runner]', 'error getting builds', err)
      return
    }
    if (!data) return
    var buildId = data.id
    var projectId = data.project_id
    if (self.projectIsRunning(projectId)) {
      // We are already running a build for this project
      // queue it
      self.queue.set(buildId, data)
    } else {
      // Go ahead and start the build
      self.runBuild(data)
    }
  })
}

Runner.prototype.checkQueue = function() {
  var self = this
  this.queue.forEach(function(val, key) {
    if (self.projectIsRunning(+val.project_id))
      return
    self.runBuild(val)
    self.queue.delete(+val.id)
  })
}

Runner.prototype.runBuild = function(data) {
  var self = this
  this.builds.set(+data.id, +data.project_id)
  var build = new Build(data)
  build.on('done', function(success) {
    if (success) {
      log.info('[runner]', 'build success [%s]', build.opts.id)
    } else {
      log.error('[runner]', 'build failed [%s]', build.opts.id)
    }
    // cleanup
    self.builds.delete(+build.opts.id)
    build = null
    self.checkQueue()
  })
  build.run()
}
