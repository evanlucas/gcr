var request = require('request')
  , gcr = require('./gcr')
  , util = require('util')
  , log = require('npmlog')
  , url = require('url')

var proxyServer = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

if (proxyServer) {
  request = request.defaults({ proxy: proxyServer, timeout: 5000 });
}

module.exports = Client

function Client() {
  if (!(this instanceof Client))
    return new Client()
}

Client.prototype.apiUrl = function() {
  return gcr.config.get('url')
}

Client.prototype.updateBuild = function(id, state, trace, cb) {
  var self = this
  log.info('[client]', 'submitting build %d to coordinator...', id)
  var opts = {
    body: {
      state: state
    , trace: trace
    , token: gcr.config.get('token')
    }
  , json: true
  , strictSSL: gcr.config.get('strictSSL')
  }

  log.verbose('[client]', 'update build', id, state)
  opts.uri = url.resolve( self.apiUrl()
                        , util.format('/api/v1/builds/%d.json', id)
                        )
  log.http('PUT', opts.uri)
  request.put(opts, function(err, res, body) {
    if (err) return cb && cb(err)
    if (res.statusCode === 200) {
      log.http(200, opts.uri)
      return cb && cb(null, true)
    } else {
      log.verbose('[response]', body)
      log.http(res.statusCode, opts.uri)
      return cb && cb(null, false)
    }
  })
}

Client.prototype.registerRunner = function(pubkey, token, cb) {
  var self = this
  var opts = {
    body: {
      public_key: pubkey
    , token: token
    }
  , json: true
  , strictSSL: gcr.config.get('strictSSL')
  }

  opts.uri = url.resolve(self.apiUrl(), '/api/v1/runners/register.json')
  log.http('POST', opts.uri)
  request.post(opts, function(err, res, body) {
    if (err) return cb && cb(err)
    if (res.statusCode === 201) {
      log.http(201, body.token)
      return cb && cb(null, body.token)
    } else {
      log.http(res.statusCode, opts.uri)
      log.error('[client]', 'register runner', body)
      return cb && cb(new Error('Invalid response'))
    }
  })
}

Client.prototype.getBuild = function(cb) {
  var self = this
  log.info('[client]', 'checking for builds...')

  var opts = {
    body: {
      token: gcr.config.get('token')
    }
  , json: true
  , strictSSL: gcr.config.get('strictSSL')
  }

  opts.uri = url.resolve(self.apiUrl(), '/api/v1/builds/register.json')
  request.post(opts, function(err, res, body) {
    if (err) return cb && cb(err)
    log.http(res.statusCode, opts.uri)
    if (res.statusCode === 201) {
      var o = {
        id: body.id
      , project_id: body.project_id
      , commands: body.commands.replace(/\r\n/g, '\n').split('\n')
      , repo_url: body.repo_url
      , ref: body.sha
      , ref_name: body.before_sha
      , allow_git_fetch: body.allow_git_fetch
      , timeout: body.timeout
      }
      return cb && cb(null, o)
    } else if (res.statusCode === 403) {
      log.error('[client]', 'Unable to get builds', 'forbidden')
      return cb && cb(new Error('Unable to get builds'))
    } else {
      log.verbose('[client]', 'no builds found')
      return cb && cb()
    }
  })
}
