#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var util = require('util');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertUrlValid = function(url) {
    if (! /^http:\/\/[-_\.a-zA-Z0-9]+/.test(url))
    {
	console.log("%s is not a valid URL. Exiting.", url);
	process.exit(1);
    }
    return url;
}

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkDOM = function($, checksfile) {
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var checkHtmlFile = function(htmlfile, checksfile) {
    return checkDOM(cheerioHtmlFile(htmlfile), checksfile);
}

var checkUrl = function(url, checksfile, callback) {
    rest.get(url).on('complete', function(result, response) {
	if (result instanceof Error) {
	    console.error('Error: ' + util.format(response.message));
        } else {
	    callback(checkDOM(cheerio.load(result), checksfile));
        }
    });
}

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>',
		'Path to checks.json',
		clone(assertFileExists),
		CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>',
		'Path to index.html',
		clone(assertFileExists),
		HTMLFILE_DEFAULT)
        .option('-u, --url <url>',
		'Url to index.html',
		clone(assertUrlValid))
        .parse(process.argv);
    var checkJson = '';
    if (!program.url)
    {
	checkJson = checkHtmlFile(program.file, program.checks);
	console.log(JSON.stringify(checkJson, null, 4));
    }
    else
    {
	checkUrl(program.url, program.checks, function(json)
        {
	    console.log(JSON.stringify(json, null, 4));
	});
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
