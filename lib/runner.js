var gcr = require('./gcr')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter
  , log = require('npmlog')
  , Build = require('./build')

module.exports = Runner

function Runner() {
  if (!(this instanceof Runner))
    return new Runner()
  EventEmitter.call(this)
  // { buildId: projectId }
  this.builds = {}
  // { buildId: buildData }
  this.queue = {}
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

Runner.prototype.projectIsRunning = function(id) {
  var builds = Object.keys(this.builds)
    , len = builds.length

  for (var i=0; i<len; i++) {
    var key = builds[i]
    var proj = this.builds[key]
    if (+proj === +id) return true
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
      self.queue[buildId] = data
    } else {
      // Go ahead and start the build
      self.runBuild(data)
    }
  })
}

Runner.prototype.checkQueue = function() {
  var self = this
  var queue = this.queue
  var queuedProjects = Object.keys(queue).map(function(build) {
    return queue[build]
  })
  queuedProjects.forEach(function(proj) {
    if (self.projectIsRunning(proj.project_id)) {
      // We are already running a build for this project
      // It is already queued so do nothing
      return
    }
    self.runBuild(proj)
    delete self.queue[proj.id]
  })
}

Runner.prototype.runBuild = function(data) {
  var self = this
  this.builds[data.id] = data.project_id
  var build = new Build(data)
  build.on('done', function(success) {
    if (success) {
      log.info('[runner]', 'build success [%s]', build.opts.id)
    } else {
      log.error('[runner]', 'build failed [%s]', build.opts.id)
    }
    // cleanup
    delete self.builds[build.opts.id]
    delete build
    self.checkQueue()
  })
  build.run()
}
