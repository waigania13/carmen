#!/usr/bin/env node

var fs = require('fs');
process.argv[0] = 'node';
require('bones').load(__dirname);
!module.parent && require('bones').start();
