'use script';

var webpack = require('webpack');
var join = require('path').join;

var es5 = process.env.BABEL_ENV === 'es5';

var context = __dirname;
var entry = join(context, 'src', 'csp');
var library = 'csp';
var libraryTarget = 'umd';
var umdNamedDefine = true;
var filename = 'js-csp.js';
var path = join(context, 'lib');

var loaders = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'babel-loader',
  },
];

var plugins = [];
var uglify = new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false, drop_console: true } });

if (es5) {
  plugins.push(uglify);
  filename = 'js-csp.es5.min.js';
  path = join(context, 'dist');
}

var output = { path, filename, library, libraryTarget, umdNamedDefine };

module.exports = { context, entry, output, plugins, module: { loaders } };
