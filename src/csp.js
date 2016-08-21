const pipeline = require('./csp.pipeline');

exports = module.exports = require('./csp.core');

exports.operations = require('./csp.operations');

exports.operations.pipeline = pipeline.pipeline;
exports.operations.pipelineAsync = pipeline.pipelineAsync;
