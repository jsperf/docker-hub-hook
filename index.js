const http = require('http');
const https = require('https');
const url = require('url');
const cp = require('child_process');

function c () {
  var args = Array.prototype.slice.call(arguments);
  var method = args.shift();
  args.unshift(new Date().toISOString());
  console[method].apply(this, args);
}

const log = c.bind(this, 'log');
const error = c.bind(this, 'error');

function reply (res, code) {
  var msg = http.STATUS_CODES[code];
  log(`response ${code} ${msg}`);
  res.writeHead(code);
  res.end(msg);
}

function validate (u, state, cb) {
  log('validating webhook', u, state);
  const cbUrl = url.parse(u);

  const req = https.request({
    method: 'POST',
    hostname: cbUrl.hostname,
    path: cbUrl.path
  }, (res) => {
    cb(null, res.statusCode);
  });

  req.on('error', cb);

  req.write(JSON.stringify({ state: state }));
  req.end();
}

const server = http.createServer(function (req, res) {
  log(`request ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/hook' && parsedUrl.query.token === process.env.DHH_TOKEN) {
      var body = '';

      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (payload.repository.repo_name === process.env.DHH_REPO && payload.push_data.tag === process.env.DHH_TAG) {
            log('executing command');
            cp.exec(process.env.DHH_CMD, {
              cwd: process.env.DHH_CWD
            }, function (err, stdout, stderr) {
              var state = 'success';
              var code = 200;

              if (err) {
                error(err);
                state = 'failure';
                code = 500;
              } else {
                log(stdout);
                log(stderr);
              }

              validate(payload.callback_url, state, (err, statusCode) => {
                if (err) {
                  error(err);
                }
                log(`webhook callback response: ${statusCode}`);
                reply(res, code);
              });
            });
          } else {
            throw new Error('Mismatched repo or tag in payload');
          }
        } catch (e) {
          error(e);
          reply(res, 400);
        }
      });
    } else {
      reply(res, 404);
    }
  } else {
    reply(res, 404);
  }
});

server.listen(process.env.DHH_PORT, () => {
  log('Server listening on ', JSON.stringify(server.address()));
});
