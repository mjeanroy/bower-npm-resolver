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

var fs = require('fs');
var path = require('path');
var tmp = require('tmp');
var npmUtil = require('../src/npm-utils');

describe('npm-utils', function() {
  var tmpDir;
  var originalTimeout;

  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
  });

  afterEach(function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  beforeEach(function() {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true
    });
  });

  afterEach(function() {
    tmpDir.removeCallback();
  });

  it('should get list of releases', function(done) {
    var promise = npmUtil.releases('bower', '1.7.7');
    expect(promise).toBeDefined();

    promise
      .then(function(releases) {
        expect(releases.length).toBeGreaterThan(0);
        expect(releases).toContains('1.7.7');
      })
      .catch(function() {
        jasmine.fail('Unable to get list of releases');
      })
      .finally(function() {
        done();
      });
  });

  it('should get tarball', function(done) {
    var promise = npmUtil.downloadTarball('bower', '1.7.7', tmpDir.name);
    expect(promise).toBeDefined();

    promise
      .then(function(path) {
        expect(path.length).toBeGreaterThan(0);
        expect(path).toContains('bower');
        expect(path).toContains('1.7.7');
      })
      .catch(function() {
        jasmine.fail('Unable to download the tarball');
      })
      .finally(function() {
        done();
      });
  });

  it('should not change current working directory', function(done) {
    var cwd = process.cwd();
    var promise = npmUtil.downloadTarball('bower', '1.7.7', tmpDir.name);

    promise
      .then(function(path) {
        expect(process.cwd()).toBe(cwd);
      })
      .catch(function() {
        jasmine.fail('Unable to download the tarball');
      })
      .finally(function() {
        done();
      });
  });

  it('should get tarball with relative path', function(done) {
    var newTmpDir = tmp.dirSync({
      unsafeCleanup: true,
      dir: path.join(__dirname, '..')
    });

    var relativeToCwd = path.relative(process.cwd(), newTmpDir.name);
    var expected = path.join(newTmpDir.name, 'bower-1.7.7.tgz');

    var promise = npmUtil.downloadTarball('bower', '1.7.7', relativeToCwd);

    promise
      .then(function(path) {
        expect(path).toBe(expected);
        expect(fs.statSync(path).isFile()).toBe(true);
      })
      .catch(function() {
        jasmine.fail('Unable to download the tarball');
      })
      .finally(function() {
        newTmpDir.removeCallback();
        done();
      });
  });

  it('should get scoped package tarball', function(done) {
    var expected = path.join(tmpDir.name, 'angular-core-2.0.0.tgz');
    var promise = npmUtil.downloadTarball('@angular/core', '2.0.0', tmpDir.name);

    promise
      .then(function(path) {
        expect(path).toBe(expected);
        expect(fs.statSync(path).isFile()).toBe(true);
      })
      .catch(function() {
        jasmine.fail('Unable to download the tarball');
      })
      .finally(function() {
        done();
      });
  });
});
