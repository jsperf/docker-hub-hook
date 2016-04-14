# docker-hub-hook [![Build Status](https://travis-ci.org/jsperf/docker-hub-hook.svg?branch=master)](https://travis-ci.org/jsperf/docker-hub-hook)
Webhook for Docker Hub Automated Builds

## Environment Variables

- **DHH_PORT** - port for HTTP server to listen on
- **DHH_CMD** - command to execute
- **DHH_CWD** - current working directory for command
- **DHH_TOKEN** - secret for simple auth
- **DHH_REPO** - repository name on Docker Hub
- **DHH_TAG** - tag for repository on Docker Hub

```
DHH_PORT=4321 DHH_CMD='ls -al' DHH_CWD='/home/' DHH_TOKEN=abc123 DHH_TAG node index.js
```

```
curl -H "Content-Type: application/json" -X POST -d '{"push_data": { "tag": "master" }, "repository": { "repo_name": "jsperf/jsperf.com"}, "callback_url": "https://www.google.com/"}' http://127.0.0.1:4321/hook?token=abc123
```
