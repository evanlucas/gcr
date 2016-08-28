'use strict'

const path = require('path')
    , os = require('os')
    , isWin = os.platform() === 'win32'
    , homedir = os.homedir

module.exports = function(parsed) {
  const o = {}
  if (parsed.url) o.url = parsed.url
  if (parsed.token) o.token = parsed.token
  if (parsed.buildDir) o.buildDir = parsed.buildDir
  if (parsed.npm) o.npm = parsed.npm
  if (parsed.timeout) o.timeout = parsed.timeout
  if (parsed.sslcert) o.sslcert = parsed.sslcert
  if (parsed.sslkey) o.sslkey = parsed.sslkey
  if (parsed.cacert) o.cacert = parsed.cacert
  o.keypath = parsed.keypath
    ? parsed.key
    : isWin
    ? path.join(homedir(), '.ssh', 'gcr')
    : path.join(homedir(), '.ssh', 'gcr')
  o.loglevel = parsed.loglevel || 'info'
  o.strictSSL = parsed.hasOwnProperty('strictSSL')
              ? parsed.strictSSL
              : true
  return o
}
