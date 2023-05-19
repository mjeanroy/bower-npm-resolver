/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2020 Mickael Jeanroy
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
const Q = require('q');
const factory = require('../src/resolver');
const npmUtils = require('../src/npm-utils-factory').get();
const extract = require('../src/extract');
const bowerUtils = require('../src/bower-utils');
const tmp = require('tmp');

describe('resolver', () => {
  let resolver;
  let tmpDir;
  let logger;

  beforeEach(() => {
    tmpDir = tmp.dirSync({
      unsafeCleanup: true,
    });

    logger = jasmine.createSpyObj('logger', [
      'debug',
      'error',
    ]);

    resolver = factory({
      config: {
        storage: {
          packages: tmpDir.name,
        },
      },
      version: '1.7.7',
      logger,
    });
  });

  afterEach(() => {
    tmpDir.removeCallback();
  });

  it('should not fail to match valid npm package', () => {
    const source = 'npm:jquery';
    const result = resolver.match(source);
    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not fail to match valid npm package with version', () => {
    const source = 'npm:jquery#1.12.4';
    const result = resolver.match(source);
    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not fail to match valid npm scope package', () => {
    const source = 'npm:@angular/core';
    const result = resolver.match(source);
    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not fail to match valid npm scope package with version', () => {
    const source = 'npm:@angular/core#2.0.0';
    const result = resolver.match(source);
    expect(result).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should fail to match npm package URL', () => {
    const source = 'npm:https://github.com/clappr/clappr-level-selector-plugin.git';
    const result = resolver.match(source);
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should get list of releases', (done) => {
    const source = 'npm:bower';
    const defer = Q.defer();
    const promise = defer.promise;
    spyOn(npmUtils, 'releases').and.returnValue(promise);

    const result = resolver.releases(source);

    expect(npmUtils.releases).toHaveBeenCalledWith('bower');
    expect(result).toBeDefined();
    expect(result).not.toBe(promise);

    const success = jasmine.createSpy('success').and.callFake((data) => {
      expect(data).toEqual([
        {target: '1.0.0', version: '1.0.0'},
        {target: '2.0.0', version: '2.0.0'},
      ]);

      done();
    });

    const error = jasmine.createSpy('error').and.callFake(() => {
      done.fail();
    });

    result.then(success, error);
    defer.resolve(['1.0.0', '2.0.0']);
  });

  it('should fetch release', (done) => {
    const pkgName = 'bower';
    const pkgVersion = '1.7.7';

    const tarballPath = '/tmp/bower.tgz';
    const pkgPath = '/tmp/bower';
    const bowerPkgPath = path.normalize(pkgPath + '/package');

    spyOn(npmUtils, 'downloadTarball').and.callFake((pkg, version, dir) => {
      expect(pkg).toBe('bower');
      expect(version).toBe('1.7.7');
      expect(dir).toBe(path.join(tmpDir.name, 'npm-resolver', 'compressed'));
      return Q.resolve(tarballPath);
    });

    spyOn(extract, 'tgz').and.callFake((file, dir) => {
      expect(file).toBe(tarballPath);
      expect(dir).toBe(path.join(tmpDir.name, 'npm-resolver', 'uncompressed', pkgName, pkgVersion));
      return Q.resolve(pkgPath);
    });

    spyOn(bowerUtils, 'patchConfiguration').and.callFake((dir) => {
      expect(dir).toBe(bowerPkgPath);
      return Q.resolve();
    });

    const source = `npm:${pkgName}#~1.7.0`;
    const target = `${pkgVersion}`;
    const result = resolver.fetch({
      source: source,
      target: target,
    });

    // Fail if something bad happen.
    result.catch((err) => {
      done.fail(err);
    });

    result.then((r) => {
      expect(npmUtils.downloadTarball).toHaveBeenCalled();
      expect(extract.tgz).toHaveBeenCalled();
      expect(bowerUtils.patchConfiguration).toHaveBeenCalled();

      expect(r).toBeDefined();
      expect(r).toEqual({
        tempPath: bowerPkgPath,
        removeIgnores: true,
      });

      done();
    });
  });
});
