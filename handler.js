const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');
const secret = process.env.SECRET || 'test';
const isGlitch = Boolean(process.env.PROJECT_ID);

module.exports = (req, res) => {
  const { 'content-type': contentType, 'user-agent': userAgent, 'x-github-event': event } = req.headers;
  const signature = req.headers['x-hub-signature'].split('=').pop();
  let body, json = '';
  function onError (err) {
    console.error(`\nIncoming request ${err}`);
    res.statusCode = 400;
    res.end(err.toString());
  }

  req.on('error', onError);
  if (!/application\/json/.test(contentType)) onError(new Error('Unexpected Content-Type'));
  else if (!userAgent.startsWith('GitHub-Hookshot')) onError(new Error('Unexpected User-Agent'));
  else {
    req.on('data', chunk => json += chunk);
    req.on('end', () => {
      const hash = crypto.createHmac('sha1', secret).update(json).digest('hex');
      if (hash !== signature) onError(new Error('Invalid HMAC'));
      else {
        try {
          body = JSON.parse(json);
        } catch (err) {
          onError(err);
          return;
        }
        console.log(`\nRequest is a "${event}" webhook, Repo: "${body.repository.full_name}"`);

        if (event === 'push' && body.ref === 'refs/heads/master') {
          console.log('\nSync...');
          const gitUrl = body.repository.git_url;
          exec(`git pull -X theirs ${gitUrl} ${isGlitch ? '&& refresh' : ''}`, (err, stdout, stderr) => {
            if (err) {
              console.error(`\n${err}\n\n==========\n`);
              fs.appendFileSync('./push_log.txt', `\n${new Date()}\n${err}\n\n==========\n`);
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }

            console.log(`\n${stderr}`);
            console.log(`\nResult: ${stdout}\n\n==========\n`);
            fs.appendFileSync('./push_log.txt', `\n${new Date()}\nResult: ${stdout}\n\n==========\n`);
            res.end(stdout);
          });
        } else {
          console.log('\nNot a push to master!');
          res.end('OK');
        }
      }
    });
  }
};
