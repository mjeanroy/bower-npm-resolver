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
/**
 * This module is used as a wrapper for NPM commands.
 * Each functions will returned a promise:
 *  - Resolved with the desired result.
 *  - Rejected with the error returned from NPM.
 */

var Q = require('q');

var path = require('path');

var writeStreamAtomic = require('fs-write-stream-atomic');

var npmVersions = require('./npm/versions');

var npmCache = require('./npm/cache');
/**
 * Executes `npm cache-add` command with passed arguments.
 * Arguments is the name of the cache to download.
 * So if cmd command was `npm cache-add bower@1.7.7 versions`, then argument
 * would be `['bower@1.7.7', 'versions']`.
 *
 * The returned promise will be resolved with the result of the cache command (i.e
 * object with all informations about the package).
 *
 * @param {Array} pkg THe package to download.
 * @return {Promise} The promise object
 */


function execCacheCommand(pkg) {
  return npmCache(pkg);
}
/**
 * Normalize NPM package name:
 * - For a scope package, remove the first `@` charachter and replace `/` with `-`.
 * - For a non scoped package, return the original name.
 *
 * @param {string} name The NPM package name.
 * @return {string} The normalized package name.
 */


function normalizePkgName(name) {
  return name[0] === '@' ? name.substr(1).replace(/\//g, '-') : name;
}

module.exports = {
  /**
   * Return the versions defined on NPM for a given package.
   * The promise will be resolved with the array of versions (i.e `['1.0.0', '1.1.0' ]`).
   *
   * @param {String} pkg The package name.
   * @return {Promise} The promise object.
   */
  releases: function releases(pkg) {
    return npmVersions(pkg);
  },

  /**
   * Download tarball using `npm pack pkg@version`, move to temporary folder and return
   * the location of the tarball in the temporary folder.
   *
   * The promise will be resolved with the tarball
   * path (i.e. `'/home/user/.cache/bower-1.7.7.tgz'`).
   *
   * @param {String} pkg The package name.
   * @param {String} version The package version.
   * @param {String} [dir] Tarball download location.
   * @return {Promise} The promise object.
   */
  downloadTarball: function downloadTarball(pkg, version, dir) {
    var deferred = Q.defer();
    execCacheCommand("".concat(pkg, "@").concat(version)).then(function (result) {
      // The original `pack` command does not support custom directory output.
      // So, to avoid to change the current working directory pointed by `process.cwd()` (i.e
      // to avoid side-effect), we just copy the file manually.
      // This is basically what is done by `npm pack` command.
      // See: https://github.com/npm/npm/issues/4074
      // See: https://github.com/npm/npm/blob/v3.10.8/lib/pack.js#L49
      var inputStream = result.inputStream;
      var targetDir = path.resolve(dir);
      var name = normalizePkgName(result.name);
      var fileName = "".concat(name, "-").concat(result.version, ".tgz");
      var outputFile = path.join(targetDir, fileName);
      var outputStream = writeStreamAtomic(outputFile); // Handle errors.

      inputStream.on('error', function (err) {
        deferred.reject(err);
      });
      outputStream.on('error', function (err) {
        deferred.reject(err);
      }); // Handle success.

      outputStream.on('close', function () {
        deferred.resolve(outputFile);
      });
      inputStream.pipe(outputStream);
    })["catch"](function (err) {
      deferred.reject(err);
    });
    return deferred.promise;
  }
};