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

/**
 * This module will extract an NPM package into
 * a destination directory.
 * NPM package are `tar.gz` files, so this module will:
 * - Unzip the package.
 * - Extract it.
 */

var fs = require('fs');
var zlib = require('zlib');
var tar = require('tar-fs');
var Q = require('q');

var isSymlink = function(file) {
  return file.type === 'SymbolicLink';
};

module.exports = {
  /**
   * Extract the package.
   *
   * This function return a promise resolved with the path
   * to the extracted file.
   *
   * If an error occurred (during unzip, or extraction), the promise
   * will be rejected with the error object.
   *
   * @param {String} src Source file to extract.
   * @param {String} dst Destination directory.
   * @return {Promise} The promise.
   */
  tgz: function(src, dst) {
    var deferred = Q.defer();

    fs.createReadStream(src)
      .on('error', deferred.reject)
      .pipe(zlib.createGunzip())
      .on('error', deferred.reject)
      .pipe(tar.extract(dst, {ignore: isSymlink, dmode: '0555', fmode: '0444'}))
      .on('error', deferred.reject)
      .on('finish', deferred.resolve.bind(deferred, dst));

    return deferred.promise;
  }
};
