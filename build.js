/* build.js — inline every stylesheet and script into one self-contained file:

     node build.js      ->  dist/index.html

   Handy for hosts where uploading folders is a pain (the GitHub web UI, for
   example): dist/index.html is a single file with no external requests at all.
   The multi-file version in the project root stays the one you edit. */
var fs = require('fs');
var path = require('path');

var root = __dirname;
var outDir = path.join(root, 'dist');

var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var inlined = 0;

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, function (whole, href) {
  var file = path.join(root, href.split('?')[0]);       // ignore ?v= cache busting
  if (!fs.existsSync(file)) return whole;
  inlined++;
  return '<style>\n/* ' + href + ' */\n' + fs.readFileSync(file, 'utf8').trim() + '\n</style>';
});

html = html.replace(/<script src="([^"]+)"><\/script>/g, function (whole, src) {
  var file = path.join(root, src.split('?')[0]);
  if (!fs.existsSync(file)) return whole;
  inlined++;
  return '<script>\n/* ' + src + ' */\n' + fs.readFileSync(file, 'utf8').trim() + '\n</script>';
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
/* .nojekyll keeps GitHub Pages from running the files through Jekyll */
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
fs.writeFileSync(path.join(root, '.nojekyll'), '');

var kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log('dist/index.html  ' + kb + ' KB, ' + inlined + ' files inlined');
if (html.indexOf('<link rel="stylesheet"') > -1 || html.indexOf('<script src=') > -1) {
  console.log('warning: something was left as an external reference');
}
