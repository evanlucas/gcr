var log = require('npmlog')
  , gcr = require('./gcr')
  , exec = require('child_process').exec
  , utils = exports

utils.genSSHKey = function(cb) {
  var cmd = 'ssh-keygen -t rsa -f ~/.ssh/gcr -N ""'
  exec(cmd, {
    env: process.env
  , cwd: process.cwd()
  }, function(err, stdout, stderr) {
    if (err) return cb && cb(err)
    return cb && cb(null, stdout)
  })
}
