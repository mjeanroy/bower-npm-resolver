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

var Q = require('q');
var factory = require('../src/resolver');
var npmUtils = require('../src/npm-utils');
var download = require('../src/download');
var extract = require('../src/extract');

describe('resolver', function() {

  var resolver;

  beforeEach(function() {
    resolver = factory({
      version: '1.7.7'
    });
  });

  it('should match npm source', function() {
    expect(resolver.match('npm/test')).toBe(true);
    expect(resolver.match('test')).toBe(false);
  });

  it('should get list of releases', function(done) {
    var source = 'npm/bower=npm/bower';
    var defer = Q.defer();
    var promise = defer.promise;
    spyOn(npmUtils, 'releases').and.returnValue(promise);

    var result = resolver.releases(source);

    expect(npmUtils.releases).toHaveBeenCalledWith('bower');
    expect(result).toBeDefined();
    expect(result).not.toBe(promise);

    var success = jasmine.createSpy('success').and.callFake(function(data) {
      expect(data).toEqual([
        { target: '1.0.0', version: '1.0.0' },
        { target: '2.0.0', version: '2.0.0' }
      ]);

      done();
    });

    var error = jasmine.createSpy('error').and.callFake(function() {
      jasmine.fail();
      done();
    });

    result.then(success, error);
    defer.resolve(['1.0.0', '2.0.0']);
  });

  it('should fetch release', function(done) {
    var d1 = Q.defer();
    var p1 = d1.promise;
    spyOn(npmUtils, 'tarball').and.returnValue(p1);

    var d2 = Q.defer();
    var p2 = d2.promise;
    spyOn(download, 'fetch').and.returnValue(p2);

    var d3 = Q.defer();
    var p3 = d3.promise;
    spyOn(extract, 'tgz').and.returnValue(p3);

    var source = 'npm/bower=npm/bower';
    var target = '1.7.7';

    var result = resolver.fetch({
      source: source,
      target: target
    });

    // Fail if something bad happen.
    result.catch(function() {
      jasmine.fail();
    });

    expect(result).toBeDefined();
    expect(npmUtils.tarball).toHaveBeenCalledWith('bower', '1.7.7');
    expect(download.fetch).not.toHaveBeenCalled();
    expect(extract.tgz).not.toHaveBeenCalled();

    d1.resolve('http://registry.npmjs.org/bower/-/bower-1.7.7.tgz');

    p1.then(function() {
      d2.resolve('/tmp/bower.tgz');
    });

    p2.then(function() {
      d3.resolve('/tmp/bower');
    });

    // Check final result.
    result.then(function(result) {
      expect(download.fetch).toHaveBeenCalledWith('http://registry.npmjs.org/bower/-/bower-1.7.7.tgz', jasmine.any(String));
      expect(extract.tgz).toHaveBeenCalledWith('/tmp/bower.tgz', jasmine.any(String));

      expect(result).toBeDefined();
      expect(result).toEqual({
        tempPath: '/tmp/bower/package',
        removeIgnores: true
      });

      done();
    });
  });
});