#!/usr/bin/env node

'use strict';

var path = require('path');
var Liftoff = require('liftoff');
var argv = require('minimist')(process.argv.slice(2));
var v8flags = require('v8flags');
var interpret = require('interpret');
var colors = require('colors');

var plop = require('./mod/plop-base');
var logic = require('./mod/logic');
var out = require('./mod/console-out');
var globalPkg = require('./package.json');
var generator = argv._[0] || null;

var Plop = new Liftoff({
	name: 'plop',
	extensions: interpret.jsVariants,
	v8flags: v8flags
});

Plop.launch({
	cwd: argv.cwd,
	configPath: argv.plopfile,
	require: argv.require,
	completion: argv.completion,
	verbose: argv.verbose
}, run);

function run(env) {
	var generators, plopfilePath;

	// handle request for version number
	if (argv.version || argv.v) {
		if (env.modulePackage.version !== globalPkg.version) {
			console.log('CLI version'.yellow, globalPkg.version);
			console.log('Local version'.yellow, env.modulePackage.version);
		} else {
			console.log(globalPkg.version);
		}
		return;
	}

	// set the default base path to the plopfile directory
	plopfilePath = env.configPath;
	// abort if there's no plopfile found
	if (plopfilePath == null) {
		console.error(colors.red('[PLOP] ') + 'No plopfile found');
		process.exit(1);
	}
	plop.setPlopfilePath(path.dirname(plopfilePath));

	// run the plopfile against the plop object
	require(plopfilePath)(plop);

	generators = plop.getGeneratorList();
	if (!generator) {
		out.chooseOptionFromList(generators).then(go);
	}else if (generators.map(function (v) { return v.name; }).indexOf(generator) > -1) {
		go(generator);
	} else {
		console.error(colors.red('[PLOP] ') + 'Generator "' + generator + '" not found in plopfile');
		process.exit(1);
	}
}

function go(generator) {
	logic.getPlopData(generator)
		.then(logic.executePlop)
		.then(function (result) {
			result.changes.forEach(function(line) {
				console.log('[SUCCESS]'.green, line.type, line.path);
			});
			result.failures.forEach(function(line) {
				console.log('[FAILED]'.red, line.type, line.path, line.error);
			});
		})
		.fail(function (err) {
			console.error('[ERROR]'.red, err.message, err.stack);
			process.exit(1);
		});
}
