'use strict';

const ROOT = __dirname;
const path = require('path');
const webpack = require('webpack');

module.exports = {
  context: ROOT,
  entry: {
    csp: path.join(ROOT, 'src', 'csp')
  },
  output: {
    path: path.join(ROOT, 'build'),
    filename: '[name].min.js',
    libraryTarget: 'umd',
    library: '[name]'
  },
  externals: {},
  resolve: {
    extensions: ['', '.js'],
    modules: [
      path.resolve('./app'),
      'node_modules',
    ],
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
    ]
  },
  devtool: false,
  plugins: [
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': "'production'",
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
      },
      output: {
        comments: false,
      },
      sourceMap: false,
    }),
  ]
};
