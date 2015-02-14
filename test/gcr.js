var path = require('path')
var HOME = path.join(__dirname, 'home')
process.env.HOME = HOME

var should = require('should')
  , gcr = require('../')
  , rimraf = require('rimraf')
  , sinon = require('sinon')

describe('gcr', function() {
  before(function() {
    rimraf.sync(__dirname + '/home/.config/gcr.json')
  })

  it('should be an EventEmitter', function() {
    gcr.should.be.instanceOf(require('events').EventEmitter)
  })

  it('should have property root', function() {
    should.exist(gcr.root)
    gcr.root.should.equal(path.join(HOME, '.config'))
  })

  it('should have property loaded', function() {
    gcr.loaded.should.be.false
  })

  it('should have property version', function() {
    gcr.version.should.equal(require('../package').version)
  })

  it('should have property help', function() {
    gcr.should.have.property('help')
  })

  it('should have property key', function() {
    var kp = path.join(HOME, '.ssh', 'gcr.pub')
    gcr.key.should.equal(kp)
  })

  it('should have property utils', function() {
    should.exist(gcr.utils)
  })

  it('should allow loading', function(done) {
    gcr.loaded.should.be.false
    gcr.load({
      url: 'https://gcr'
    , token: 'biscuits'
    , buildDir: '/tmp/gcr-builds'
    , npm: true
    , strictSSL: false
    , timeout: 5000
    }, function(err) {
      if (err) return done(err)
      gcr.loaded.should.be.true
      done()
    })
  })

  it('should allow passing just a callback to load', function(done) {
    gcr.load(done)
  })

  it('gcr.config should exist after loading', function() {
    gcr.should.have.property('config')
  })

  describe('build', function() {
    var Build = require('../lib/build')
    var build

    it('should allow construction', function() {
      build = Build({
        commands: []
      , timeout: 5000
      , project_id: 1
      , repo_url: 'git://github.com/evanlucas/gcr.git'
      , ref: 'origin/master'
      , allow_git_fetch: true
      , before_sha: 'blah'
      , ref_name: 'master'
      , id: 1
      })

      build.should.be.instanceOf(require('events').EventEmitter)
      build.should.have.property('git', gcr.config.get('git'))
      build.should.have.property('buildDir', gcr.config.get('buildDir'))
      build.should.have.property('opts')
      build.should.have.property('output')
      build.should.have.property('projectDir')
      build.projectDir.should.equal('/tmp/gcr-builds/project-1')
      build.should.have.property('state', 'waiting')
    })

    it('should run', function(done) {
      var sandbox = sinon.sandbox.create()
      build.on('done', function(success) {
        success.should.be.true
      })
      build.run()
      build.state.should.equal('running')
      sandbox.stub(build.update).callsArgWith(0, function() {
        done()
      })
    })
  })

  describe('client', function() {

  })

  describe('runner', function() {

  })

  describe('utils', function() {

  })
})
