'use script';

var webpack = require('webpack');
var join = require('path').join;
var LodashPlugin = require('lodash-webpack-plugin');

var es5 = process.env.BABEL_ENV === 'es5';

var filename = 'js-csp.js';
var path = join(__dirname, 'lib');

var plugins = [new LodashPlugin];
var uglify = new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false, drop_console: true } });

if (es5) {
  plugins.push(uglify);
  filename = 'js-csp.es5.min.js';
  path = join(__dirname, 'dist');
}

var config = {
  context: __dirname,
  entry: join(__dirname, 'src', 'csp'),
  output: {
    path: path,
    filename: filename,
    library: 'csp',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  plugins: plugins,
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  }
};

module.exports = config;
