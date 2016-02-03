'use strict'

const test = require('tap').test
const path = require('path')
const HOME = path.join(__dirname, 'home')
process.env.HOME = HOME

const gcr = require('../')
const rimraf = require('rimraf')
const EE = require('events')
const Build = require('../lib/build')
const Client = require('../lib/client')
const Runner = require('../lib/runner')

let server, port

test('setup', (t) => {
  rimraf.sync(__dirname + '/home/.config/gcr.json')
  rimraf.sync(__dirname + '/home/builds')
  server = require('./fixtures/server')
  server.listen(0, (err) => {
    if (err) {
      return t.bailout('Could not start mock server')
    }

    port = server.address().port
    t.end()
  })
})

test('gcr', (t) => {
  t.type(gcr, EE)
  t.equal(gcr.root, path.join(HOME, '.config'), 'gcr.root is correct')
  t.equal(gcr.loaded, false, 'gcr.loaded is false')
  t.equal(gcr.version, require('../package').version, 'gcr.version is correct')
  t.ok(gcr.hasOwnProperty('utils'), 'hasOwnProperty(utils)')
  t.notOk(gcr.config, 'config is null before load')
  t.end()
})

test('load', (t) => {
  gcr.load({
    url: `http://127.0.0.1:${port}/ci`
  , token: 'biscuits'
  , buildDir: '/tmp/gcr-builds'
  , npm: true
  , strictSSL: false
  , timeout: 5000
  , loglevel: 'silent'
  }, (err) => {
    t.ifError(err, 'err should not exist')
    t.equal(gcr.loaded, true, 'gcr.loaded === true')
    t.ok(gcr.hasOwnProperty('config'), 'gcr.config')

    gcr.load((err) => {
      t.ifError(err, 'err should not exist')
      t.end()
    })
  })
})

test('build and run with clone', (t) => {
  t.plan(11)
  const build = Build({
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

  t.type(build, EE)
  t.equal(build.git, gcr.config.get('git'), 'git is correct')
  t.equal(build.buildDir, gcr.config.get('buildDir'), 'buildDir is correct')
  t.ok(build.hasOwnProperty('opts'), 'hasOwnProperty(opts)')
  t.ok(build.hasOwnProperty('output'), 'hasOwnProperty(output)')
  t.ok(build.hasOwnProperty('projectDir'), 'hasOwnProperty(projectDir)')
  t.equal(build.projectDir, '/tmp/gcr-builds/project-1')
  t.equal(build.state, 'waiting')

  const orig = build.update
  build.update = function(cb) {
    build.update = orig
    t.pass('called update')
    cb && cb()
  }

  build.on('done', (success) => {
    t.equal(success, true, 'success is correct')
  })

  build.run()
  t.equal(build.state, 'running', 'build.state === running')
})

test('build and run with fetch', (t) => {
  t.plan(11)
  const build = Build({
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

  t.type(build, EE)
  t.equal(build.git, gcr.config.get('git'), 'git is correct')
  t.equal(build.buildDir, gcr.config.get('buildDir'), 'buildDir is correct')
  t.ok(build.hasOwnProperty('opts'), 'hasOwnProperty(opts)')
  t.ok(build.hasOwnProperty('output'), 'hasOwnProperty(output)')
  t.ok(build.hasOwnProperty('projectDir'), 'hasOwnProperty(projectDir)')
  t.equal(build.projectDir, '/tmp/gcr-builds/project-2')
  t.equal(build.state, 'waiting')

  const updateOrig = gcr.client.updateBuild
  gcr.client.updateBuild = function(id, s, o, cb) {
    gcr.client.updateBuild = updateOrig
    t.pass('called client.updateBuild')
    cb && cb()
  }

  build.on('done', (success) => {
    t.equal(success, true, 'success is correct')
  })

  build.run()
  t.equal(build.state, 'running', 'build.state === running')
})

test('client', (t) => {
  t.plan(15)
  t.type(gcr.client, Client)
  t.equal(gcr.client.apiUrl(), gcr.config.get('url'), 'gcr.url is correct')

  gcr.client.updateBuild(1, 'running', 'blah', (err, out) => {
    t.ifError(err, 'err should not exist')
    t.equal(out, true, 'out is true')
  })

  gcr.client.updateBuild(1, 'running', 'blah2', (err, out) => {
    t.ifError(err, 'err should not exist')
    t.equal(out, false, 'out is false')
  })

  gcr.client.registerRunner(1, 'biscuits', (err, out) => {
    t.ifError(err, 'err should not exist')
    t.equal(out, 'biscuits', 'out is correct')
  })

  gcr.client.registerRunner(1, 'blah', (err, out) => {
    t.type(err, Error)
    t.match(err.message, /Invalid response/)
  })

  gcr.config.set('token', 'biscuits')
  gcr.client.getBuild((err) => {
    t.ifError(err, 'err should not exist')
    gcr.config.set('token', 'blah')
    gcr.client.getBuild((err, out) => {
      t.type(err, Error)
      t.match(err.message, /Unable to get builds/)
      gcr.config.set('token', 'baaaaa')
      gcr.client.getBuild((err, out) => {
        t.ifError(err, 'err should not exist')
        t.notOk(out)
      })
    })
  })
})

test('runner', (t) => {
  t.type(gcr.runner, Runner)
  t.ok(gcr.runner.hasOwnProperty('builds'), 'hasOwnProperty(builds)')
  t.ok(gcr.runner.hasOwnProperty('queue'), 'hasOwnProperty(queue)')
  t.ok(gcr.runner.hasOwnProperty('interval'), 'hasOwnProperty(interval)')

  gcr.runner.builds = new Map([[1, 1]])
  t.equal(gcr.runner.projectIsRunning(1), true, 'project 1 is running')

  gcr.runner.builds = new Map()
  t.equal(gcr.runner.projectIsRunning(1), false, 'project 1 is not running')

  t.end()
})

test('cleanup', (t) => {
  rimraf.sync(__dirname + '/home/.config/gcr.json')
  rimraf.sync(__dirname + '/home/builds')
  server.close((err) => {
    if (err) throw err
    t.end()
  })
})
