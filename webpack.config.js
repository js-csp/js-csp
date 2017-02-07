'use strict';
var es5 = process.env.BABEL_ENV === 'es5'
var webpack = require('webpack'), join = require('path').join
var context = __dirname, path = join(context, 'lib')
var entry = join(context, 'src', 'csp')
var filename = 'js-csp.js', library = 'csp', libraryTarget = 'umd', umdNamedDefine = true
var loaders = [
  { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
]
var plugins = []
var uglify = new webpack.optimize.UglifyJsPlugin({compress: {warnings: false, drop_console: true}})
if(es5) {
    plugins.push(uglify)
    filename = 'js-csp.es5.min.js'
    path = join(context, 'dist')
}
var output = { path, filename, library, libraryTarget, umdNamedDefine }
module.exports = { context, entry, output, plugins, module: { loaders } }
