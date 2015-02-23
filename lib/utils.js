var log = require('npmlog')
  , gcr = require('./gcr')
  , exec = require('child_process').exec
  , path = require('path')
  , os = require('os')
  , isWin = os.platform() === 'win32'
  , utils = exports

utils.genSSHKey = function(cb) {
  var k = isWin
    ? 'ssh-keygen.exe'
    : 'ssh-keygen'
  var home = process.env.HOME || process.env.USERPROFILE
  var p = path.join(home, '.ssh', 'gcr')
  var cmd = k + ' -t rsa -f ' + p + ' -N ""'
  exec(cmd, {
    env: process.env
  , cwd: process.cwd()
  }, function(err, stdout, stderr) {
    if (err) return cb && cb(err)
    return cb && cb(null, stdout)
  })
}
