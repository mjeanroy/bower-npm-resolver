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
var fs = require('fs');
var extract = require('../src/extract');
var tmp = require('tmp');

describe('extract', function() {
  var tmpDir;
  var originalTimeout;

  beforeEach(function() {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true
    });

    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
  });

  afterEach(function() {
    tmpDir.removeCallback();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('should extract tarball', function(done) {
    var src = path.join(__dirname, 'bower-1.7.7.tgz');
    var dst = tmpDir.name;
    var promise = extract.tgz(src, dst);
    expect(promise).toBeDefined();

    promise
      .then(function(extracted) {
        expect(extracted).toBeDefined();
        expect(fs.statSync(extracted).isDirectory()).toBe(true);
      })
      .catch(function() {
        jasmine.fail();
      })
      .finally(function() {
        done();
      });
  });
});
