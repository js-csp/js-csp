"use strict";

var csp = require("./csp.core");
var operations = require("./csp.operations");

csp.operations = operations;
csp.operations.pipeline = require('./csp.pipeline').pipeline;
csp.operations.pipelineAsync = require('./csp.pipeline').pipelineAsync;

module.exports = csp;
