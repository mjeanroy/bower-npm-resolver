/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2018 Mickael Jeanroy
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

'use strict';

const path = require('path');
const fs = require('fs');
const extract = require('../dist/extract');
const tmp = require('tmp');

describe('extract', () => {
  let tmpDir;
  let originalTimeout;

  beforeEach(() => {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    });

    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
  });

  afterEach(() => {
    tmpDir.removeCallback();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('should extract tarball', (done) => {
    const src = path.join(__dirname, 'bower-1.7.7.tgz');
    const dst = tmpDir.name;
    const promise = extract.tgz(src, dst);
    expect(promise).toBeDefined();

    promise
      .then((extracted) => {
        expect(extracted).toBeDefined();
        expect(fs.statSync(extracted).isDirectory()).toBe(true);
        done();
      })
      .catch(() => {
        done.fail();
      });
  });
});
