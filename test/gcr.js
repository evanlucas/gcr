var path = require('path')
var HOME = path.join(__dirname, 'home')
process.env.HOME = HOME

var should = require('should')
  , gcr = require('../')

describe('gcr', function() {
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

  it('should have property key', function() {
    var kp = path.join(HOME, '.ssh', 'gcr.pub')
    gcr.key.should.equal(kp)
  })

  it('should have property utils', function() {
    should.exist(gcr.utils)
  })

  it('should allow loading', function(done) {
    gcr.load({

    })
  })
})
