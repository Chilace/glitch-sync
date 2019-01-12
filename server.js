const http = require('http');
const url = require('url');
const handler = require('./handler.js');

const server = http.createServer((req, res) => {
  const { method, headers } = req;
  const { pathname } = url.parse(req.url);
  console.log(`\nIncoming "${method}" request, User-Agent: "${headers['user-agent']}"`);

  if (method === 'POST' && pathname === '/webhook') {
    handler(req, res);
  } else {
    console.log('\nNot a hook!');
    res.end('OK');
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`\nServer is listening on port: ${server.address().port}`);
});
