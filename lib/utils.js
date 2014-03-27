var log = require('npmlog')
  , gcr = require('./gcr')
  , spawn = require('child_process').spawn
  , utils = exports

utils.genSSHKey = function(cb) {
  var args = [
      '-t'
    , 'rsa'
    , '-f'
    , '~/.ssh/gcr'
    , '-N'
    , '""'
  ]
  var child = spawn('ssh-keygen', args, {
      env: process.env
    , cwd: process.cwd()
  })
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
  child.on('exit', function(code) {
    if (code !== 0) {
      return cb && cb(new Error('Exited with code: '+code))
    }
    return cb && cb()
  })
}
