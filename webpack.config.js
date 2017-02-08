'use script';

const webpack = require('webpack');
const join = require('path').join;

const es5 = process.env.BABEL_ENV === 'es5';

const context = __dirname;
const entry = join(context, 'src', 'csp');
const library = 'csp';
const libraryTarget = 'umd';
const umdNamedDefine = true;
let filename = 'js-csp.js';
let path = join(context, 'lib');

const loaders = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'babel-loader',
  },
];

const plugins = [];
const uglify = new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false, drop_console: true } });

if (es5) {
  plugins.push(uglify);
  filename = 'js-csp.es5.min.js';
  path = join(context, 'dist');
}

const output = { path, filename, library, libraryTarget, umdNamedDefine };

module.exports = { context, entry, output, plugins, module: { loaders } };
