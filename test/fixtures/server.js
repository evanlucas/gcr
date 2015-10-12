var http = require('http')

module.exports = http.createServer(handle)

function handle(req, res) {
  var url = req.url
  if (req.method === 'PUT') return handlePUT(req, res)
  if (url === '/api/v1/runners/register.json') {
    return handleRegister(req, res)
  } else if (url === '/ci/api/v1/runners/register.json') {
    return handleRegister(req, res)
  }

  var body = ''
  req.on('data', function(chunk) {
    body += chunk
  })

  req.on('end', function() {
    body = JSON.parse(body)
    if (body.token === 'biscuits') {
      res.writeHead(201, {
        'Content-Type': 'application/json'
      })
      res.end(JSON.stringify({
        id: 1
      , project_id: 1
      , commands: 'ls\npwd\n'
      , repo_url: 'git@github.com:evanlucas/gcr-test'
      , ref: 'origin/master'
      , ref_name: 'origin/master'
      , allow_git_fetch: false
      , timeout: 5000
      }))
    } else if (body.token === 'blah') {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      })
      res.end()
    } else {
      res.writeHead(404, {
        'Content-Type': 'application/json'
      })
      res.end()
    }
  })
}

function handleRegister(req, res) {
  var body = ''
  req.on('data', function(chunk) {
    body += chunk
  })

  req.on('end', function() {
    body = JSON.parse(body)
    if (body.token === 'biscuits') {
      res.writeHead(201, {
        'Content-Type': 'application/json'
      })

      res.end(JSON.stringify({
        token: 'biscuits'
      }))
    } else {
      res.writeHead(500, {
        'Content-Type': 'application/json'
      })
      res.end()
    }
  })
}

function handlePUT(req, res) {
  var body = ''
  req.on('data', function(chunk) {
    body += chunk
  })

  req.on('end', function() {
    body = JSON.parse(body)
    if (body.trace === 'blah') {
      res.writeHead(200, {
        'Content-Type': 'application/json'
      })
      res.end()
    } else {
      res.writeHead(500, {
        'Content-Type': 'application/json'
      })
      res.end()
    }
  })
}
