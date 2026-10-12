/* Tiny static file server for local preview.
   Usage:  node serve.js [port]        (default http://localhost:8123)
   The site itself is plain static files — this is only a convenience for
   browsers that refuse to load local scripts from file://. */
var http = require('http');
var fs = require('fs');
var path = require('path');

var root = __dirname;
var port = parseInt(process.argv[2], 10) || 8123;
var TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4'
};

http.createServer(function (req, res) {
  var url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  var file = path.join(root, path.normalize(url).replace(/^([/\\])+/, ''));
  if (file.indexOf(root) !== 0) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, function (err, data) {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(port, function () {
  console.log('preview: http://localhost:' + port);
});
