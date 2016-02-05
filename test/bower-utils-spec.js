/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Mickael Jeanroy
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var bowerUtil = require('../src/bower-utils');

describe('bower-utils', function() {
  var tmpDir;

  beforeEach(function() {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true
    });
  });

  afterEach(function() {
    tmpDir.removeCallback();
  });

  it('should create json file from package json', function(done) {
    var config = {
      main: 'bower-npm-resolver',
      description: 'This is a fake module',
      main: 'src/resolver.js',
      moduleType: ['amd', 'globals', 'node'],
      keywords: ['test'],
      authors: ['mickael.jeanroy@gmail.com'],
      license: 'MIT',
      ignore: ['test'],
      bugs: 'https://github.com/mjeanroy/bower-npm-resolver/issues',
      homepage: 'https://github.com/mjeanroy/bower-npm-resolver',
      repository: {
        type: 'git',
        url: 'https://github.com/mjeanroy/bower-npm-resolver.git'
      },
      private: false
    };

    fs.writeFileSync(path.join(tmpDir.name, 'package.json'), JSON.stringify(config, null, 2), 'utf-8');

    var p = bowerUtil.patchConfiguration(tmpDir.name);
    expect(p).toBeDefined();

    p.then(function() {
      expect(fs.statSync(path.join(tmpDir.name, 'bower.json')).isFile()).toBe(true);

      var bowerJson = JSON.parse(fs.readFileSync(path.join(tmpDir.name, 'bower.json'), 'utf-8'));
      expect(bowerJson).toEqual(jasmine.objectContaining(config));
      expect(bowerJson.dependencies).toEqual({});
      expect(bowerJson.devDependencies).toEqual({});
    });

    p.catch(function() {
      jasmine.fail();
    });

    p.finally(function() {
      done();
    });
  });

  it('should not create json file if bower.json already exist', function(done) {
    var packageConfig = {
      main: 'foo',
      description: 'This is a fake module',
      main: 'foo.js',
      moduleType: ['amd', 'globals', 'node'],
      keywords: ['test'],
      authors: ['mickael.jeanroy@gmail.com'],
      license: 'MIT',
      ignore: ['test'],
      private: false
    };

    var bowerConfig = {
      main: 'foo',
      description: 'This is a fake module',
      main: 'foo.js',
      moduleType: ['amd', 'globals', 'node'],
      keywords: ['test'],
      authors: ['mickael.jeanroy@gmail.com'],
      license: 'MIT',
      ignore: ['test'],
      private: false,
      dependencies: {
        jquery: '1.11.0'
      }
    };

    fs.writeFileSync(path.join(tmpDir.name, 'package.json'), JSON.stringify(packageConfig, null, 2), 'utf-8');
    fs.writeFileSync(path.join(tmpDir.name, 'bower.json'), JSON.stringify(bowerConfig, null, 2), 'utf-8');

    var p = bowerUtil.patchConfiguration(tmpDir.name);
    expect(p).toBeDefined();

    p.then(function() {
      expect(fs.statSync(path.join(tmpDir.name, 'bower.json')).isFile()).toBe(true);
      expect(JSON.parse(fs.readFileSync(path.join(tmpDir.name, 'bower.json'), 'utf-8'))).toEqual(bowerConfig);
    });

    p.catch(function() {
      jasmine.fail();
    });

    p.finally(function() {
      done();
    });
  });
});
