const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const files = ['index.html', 'style.css', 'app.js', 'art.js', 'core.js', 'legacy-data.js'];
if (process.argv.includes('--build')) {
  const target = path.join(root, 'dist');
  fs.mkdirSync(target, { recursive: true });
  for (const file of files) fs.copyFileSync(path.join(root, file), path.join(target, file));
  fs.cpSync(path.join(root, 'assets'), path.join(target, 'assets'), { recursive: true });
  console.log('Static build ready in dist/');
} else {
  const option = (name, fallback) => {
    const args = process.argv.slice(2);
    const joined = args.find(value => value.startsWith(name + '='));
    if (joined) return joined.slice(name.length + 1);
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
  };
  const port = Number(option('--port', process.env.PORT || 3000));
  const host = option('--host', process.env.HOST || '0.0.0.0');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
  http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); return res.end(); }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.relative(root, file);
    const allowed = files.includes(relative) || relative === 'browser-qa.js' || relative === 'responsive-qa.html' || relative.startsWith('assets' + path.sep);
    if (!allowed || relative.split(path.sep).some(part => part.startsWith('.'))) { res.writeHead(404); return res.end(); }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  }).listen(port, host, () => console.log(`Pixel office ready on http://${host}:${port}`));
}