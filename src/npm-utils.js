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
 * This module is used as a wrapper for NPM commands.
 * Each functions will returned a promise:
 *  - Resolved with the desired result.
 *  - Rejected with the error returned from NPM.
 */

var requireg = require('requireg');
var Q = require('q');
var npm = requireg('npm');
var path = require('path');

var wrapCallback = function(deferred) {
  return function(err, data) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(data);
    }
  };
};

var execViewCommand = function(args) {
  var deferred = Q.defer();

  npm.load(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      npm.commands.view(args, true, wrapCallback(deferred));
    }
  });

  return deferred.promise;
};

/**
 * Executes `npm pack` command with passed arguments. Arguments is the array of command
 * line options. So if cmd command was `npm pack bower@1.7.7 jasmine`, then array of
 * arguments would be ['bower@1.7.7', 'jasmine'].
 *
 * The returned promise will be resolved with array of tarball paths relative to process.cwd()
 * (i.e. ['bower-1.7.7.tgz', 'jasmine-2.4.1.tgz'])
 *
 * @param {Array} args Arguments object
 * @return {Promise} The promise object
 */
var execPackCommand = function(args) {
  var deferred = Q.defer();

  npm.load(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      npm.commands.pack(args, true, wrapCallback(deferred));
    }
  });

  return deferred.promise;
};

var getLastKey = function(o) {
  var keys = Object.keys(o);
  keys.sort();
  return keys[keys.length - 1];
};

module.exports = {

  /**
   * Return the versions defined on NPM for a given package.
   * Basically, execute `npm view pkg versions` and return the results.
   * Note that NPM will return an object, such as:
   *
   * ```json
   *   { '1.7.7': { versions: ['1.0.0', '1.1.0' ] } }
   * ```
   *
   * The promise will be resolved with the array of versions (i.e `['1.0.0', '1.1.0' ]`).
   *
   * @param {String} pkg The package name.
   * @return {Promise} The promise object.
   */
  releases: function(pkg) {
    return execViewCommand([pkg, 'versions']).then(function(data) {
      // If it is already an array, return it.
      if (Array.isArray(data)) {
        return data;
      }

      // Otherwise, unwrap it.
      var mostRecentVersion = getLastKey(data);
      return data[mostRecentVersion].versions;
    });
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
  downloadTarball: function(pkg, version, dir) {
    process.chdir(dir);
    return execPackCommand([pkg + '@' + version])
      .then(function(filename) {
        return path.resolve(dir || process.cwd(), filename[0]);
      });
  }
};
