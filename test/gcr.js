var path = require('path')
var HOME = path.join(__dirname, 'home')
process.env.HOME = HOME

var should = require('should')
  , gcr = require('../')
  , rimraf = require('rimraf')
  , sinon = require('sinon')

describe('gcr', function() {
  var server, port
  before(function(done) {
    rimraf.sync(__dirname + '/home/.config/gcr.json')
    rimraf.sync(__dirname + '/home/builds')
    server = require('./fixtures/server')
    server.listen(0, function(err) {
      if (err) return done(err)
      port = server.address().port
      done()
    })
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
      url: 'http://127.0.0.1:' + port
    , token: 'biscuits'
    , buildDir: '/tmp/gcr-builds'
    , npm: true
    , strictSSL: false
    , timeout: 5000
    , loglevel: 'silent'
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
        commands: ['npm test']
      , timeout: 5000
      , project_id: 1
      , repo_url: 'git://github.com/evanlucas/gcr-test.git'
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

    it('should run with clone', function(done) {
      this.timeout(10000)
      var sandbox = sinon.sandbox.create()
      sandbox.stub(build, 'update', function(cb) {
        cb && cb()
      })
      var count = 0
      function next() {
        count++
        if (count === 2) done()
      }
      build.on('done', function(success) {
        success.should.be.true
        sandbox.restore()
        done()
      })
      build.run()
      build.state.should.equal('running')
    })

    it('should run with fetch', function(done) {
      var build2 = Build({
        commands: ['npm test']
      , timeout: 5000
      , project_id: 2
      , repo_url: 'git://github.com/evanlucas/gcr-test.git'
      , ref: 'origin/master'
      , allow_git_fetch: false
      , before_sha: 'blah'
      , ref_name: 'master'
      , id: 2
      })
      this.timeout(10000)
      var sandbox = sinon.sandbox.create()
      sandbox.stub(gcr.client, 'updateBuild', function(id, s, o, cb) {
        cb && cb()
      })
      var count = 0
      function next() {
        count++
        if (count === 2) done()
      }
      build2.on('done', function(success) {
        success.should.be.true
        sandbox.restore()
        done()
      })
      build2.run()
      build2.state.should.equal('running')
    })
  })

  describe('client', function() {
    it('should be accessible via gcr.client', function() {
      should.exist(gcr.client)
    })

    it('apuUrl() should return gcr.config.get(\'url\')', function() {
      gcr.client.apiUrl().should.equal(gcr.config.get('url'))
    })

    describe('updateBuild', function() {
      it('should return null, true on success', function(done) {
        gcr.client.updateBuild(1, 'running', 'blah', function(err, out) {
          if (err) return done(err)
          out.should.be.true
          done()
        })
      })

      it('should return null, false on error', function(done) {
        gcr.client.updateBuild(1, 'running', 'blah2', function(err, out) {
          if (err) return done(err)
          out.should.be.false
          done()
        })
      })
    })

    describe('registerRunner', function() {
      it('should return null, token on success', function(done) {
        gcr.client.registerRunner(1, 'biscuits', function(err, out) {
          if (err) return done(err)
          should.exist(out)
          done()
        })
      })

      it('should return err on error', function(done) {
        gcr.client.registerRunner(1, 'blah', function(err, out) {
          should.exist(err)
          err.should.match(/Invalid response/)
          done()
        })
      })
    })

    describe('getBuild', function() {
      it('should return null, object on success', function(done) {
        gcr.config.set('token', 'biscuits')
        gcr.client.getBuild(done)
      })

      it('should return err on 403', function(done) {
        gcr.config.set('token', 'blah')
        gcr.client.getBuild(function(err, out) {
          should.exist(err)
          err.should.match(/Unable to get builds/)
          done()
        })
      })

      it('should return undefined on anything else', function(done) {
        gcr.config.set('token', 'baaaaa')
        gcr.client.getBuild(function(err, out) {
          if (err) return done(err)
          should.not.exist(out)
          done()
        })
      })
    })
  })

  describe('runner', function() {

  })

  describe('utils', function() {

  })
})
