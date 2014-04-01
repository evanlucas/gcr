module.exports = function(parsed) {
  var o = {}
  if (parsed.url) o.url = parsed.url
  if (parsed.token) o.token = parsed.token
  if (parsed.buildDir) o.buildDir = parsed.buildDir
  if (parsed.npm) o.npm = parsed.npm
  if (parsed.timeout) o.timeout = parsed.timeout
  o.loglevel = parsed.loglevel || 'info'
  o.strictSSL = parsed.hasOwnProperty('strictSSL')
              ? parsed.strictSSL
              : true
  return o
}
