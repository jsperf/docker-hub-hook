const http = require('http');
const https = require('https');
const url = require('url');
const cp = require('child_process');

function reply (res, code) {
  res.writeHead(code);
  res.end(http.STATUS_CODES[code]);
}

function validate (u, state, cb) {
  console.log('validating webhook...');
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

http.createServer(function (req, res) {
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
            console.log('executing command...');
            cp.exec(process.env.DHH_CMD, {
              cwd: process.env.DHH_CWD
            }, function (err, stdout, stderr) {
              var state = 'success';
              var code = 200;

              if (err) {
                console.error(err);
                state = 'failure';
                code = 500;
              } else {
                console.log(stdout);
                console.log(stderr);
              }

              validate(payload.callback_url, state, (err, statusCode) => {
                if (err) {
                  console.error(err);
                }
                console.log(`webhook callback response: ${statusCode}`);
                reply(res, code);
              });
            });
          } else {
            throw new Error('Mismatched repo or tag in payload');
          }
        } catch (e) {
          console.error(e);
          reply(res, 400);
        }
      });
    } else {
      console.log(`Ignoring ${req.method} ${req.url}`);
      reply(res, 404);
    }
  } else {
    console.log(`Ignoring ${req.method} ${req.url}`);
    reply(res, 404);
  }
}).listen(process.env.DHH_PORT, () => {
  console.log('Server listening...');
});
