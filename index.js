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

const logger = {
  info: c.bind(this, 'log'),
  error: c.bind(this, 'error')
};

function reply (res, code) {
  var msg = http.STATUS_CODES[code];
  logger.info(`response ${code} ${msg}`);
  res.writeHead(code);
  res.end(msg);
}

function validate (u, state, cb) {
  logger.info('validating webhook', u, state);
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
  logger.info(`request ${req.method} ${req.url}`);
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
            logger.info('executing command');
            cp.exec(process.env.DHH_CMD, {
              cwd: process.env.DHH_CWD
            }, function (err, stdout, stderr) {
              var state = 'success';
              var code = 200;

              if (err) {
                logger.error(err);
                state = 'failure';
                code = 500;
              } else {
                logger.info(stdout);
                logger.error(stderr);
              }

              validate(payload.callback_url, state, (err, statusCode) => {
                if (err) {
                  logger.error(err);
                }
                logger.info(`webhook callback response: ${statusCode}`);
                reply(res, code);
              });
            });
          } else {
            throw new Error('Mismatched repo or tag in payload');
          }
        } catch (e) {
          logger.error(e);
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
  logger.info('Server listening on ', JSON.stringify(server.address()));
});
