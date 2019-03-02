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

const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
const npmUtil = require('../dist/npm-utils');

describe('npm-utils', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    });
  });

  afterEach(() => {
    tmpDir.removeCallback();
  });

  it('should get list of releases', (done) => {
    const promise = npmUtil.releases('bower', '1.7.7');
    expect(promise).toBeDefined();

    promise
        .then((releases) => {
          expect(releases.length).toBeGreaterThan(0);
          expect(releases).toContain('1.7.7');
          done();
        })
        .catch(() => {
          done.fail('Unable to get list of releases');
        });
  });

  it('should get tarball', (done) => {
    const promise = npmUtil.downloadTarball('bower', '1.7.7', tmpDir.name);
    expect(promise).toBeDefined();

    promise
        .then((path) => {
          expect(path.length).toBeGreaterThan(0);
          expect(path).toContain('bower');
          expect(path).toContain('1.7.7');
          done();
        })
        .catch((err) => {
          done.fail('Unable to download the tarball');
        });
  });

  it('should not change current working directory', (done) => {
    const cwd = process.cwd();
    const promise = npmUtil.downloadTarball('bower', '1.7.7', tmpDir.name);

    promise
        .then((path) => {
          expect(process.cwd()).toBe(cwd);
          done();
        })
        .catch(() => {
          done.fail('Unable to download the tarball');
        });
  });

  it('should get tarball with relative path', (done) => {
    const newTmpDir = tmp.dirSync({
      unsafeCleanup: true,
      dir: path.join(__dirname, '..'),
    });

    const relativeToCwd = path.relative(process.cwd(), newTmpDir.name);
    const expected = path.join(newTmpDir.name, 'bower-1.7.7.tgz');

    const promise = npmUtil.downloadTarball('bower', '1.7.7', relativeToCwd);

    promise
        .then((path) => {
          expect(path).toBe(expected);
          expect(fs.statSync(path).isFile()).toBe(true);
          done();
        })
        .catch(() => {
          done.fail('Unable to download the tarball');
        });
  });

  it('should get scoped package tarball', (done) => {
    const expected = path.join(tmpDir.name, 'angular-core-2.0.0.tgz');
    const promise = npmUtil.downloadTarball('@angular/core', '2.0.0', tmpDir.name);

    promise
        .then((path) => {
          expect(path).toBe(expected);
          expect(fs.statSync(path).isFile()).toBe(true);
          done();
        })
        .catch(() => {
          done.fail('Unable to download the tarball');
        });
  });
});
