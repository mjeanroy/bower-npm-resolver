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

/**
 * This module is used as a wrapper for NPM commands.
 * Each functions will returned a promise:
 *  - Resolved with the desired result.
 *  - Rejected with the error returned from NPM.
 */

var requireg = require('requireg');
var npm = requireg('npm');
var Q = require('q');
var path = require('path');
var fs = require('fs');
var writeStreamAtomic = require('fs-write-stream-atomic');

/**
 * Load NPM and execute the given callback giving the deferred that should be
 * resolved or rejected in callback parameter.
 *
 * @param {function} cb The callback function executed once NPM has been loaded.
 * @return {Object} A promise, rejected if NPM cannot be loaded.
 */
function execNpm(cb) {
  var deferred = Q.defer();

  npm.load(function (err, meta) {
    if (err) {
      deferred.reject(err);
    } else {
      cb(meta, deferred);
    }
  });

  return deferred.promise;
}

/**
 * Executes `npm view` command with passed arguments.
 * Arguments is an array of `npm view` arguments.
 * So if cmd command was `npm view bower@1.7.7`, then argument
 * would be 'bower@1.7.7'.
 *
 * The returned promise will be resolved with the result of the cache command (i.e
 * object with all informations about the package).
 *
 * @param {Array} args THe package to download.
 * @return {Promise} The promise object
 */
function execViewCommand(args) {
  return execNpm(function (meta, deferred) {
    npm.commands.view(args, true, function (err, data) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(data);
      }
    });
  });
}

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
  return execNpm(function (meta, deferred) {
    if (require('semver').lt(meta.version, '5.0.0')) {
      oldNpmCache(pkg, deferred);
    } else {
      newNpmCache(pkg, deferred);
    }
  });
}

/**
 * Run npm cache command and resolve the deferred object with the returned
 * metadata.
 *
 * @param {string} pkg NPM Package id (i.e `bower@1.8.0`).
 * @param {Object} deferred The deferred object to resolve.
 * @return {void}
 */
function oldNpmCache(pkg, deferred) {
  npm.commands.cache.add(pkg, null, null, false, function (err, data) {
    if (err) {
      deferred.reject(err);
    } else {
      var name = data.name;
      var version = data.version;
      var tarball = path.resolve(npm.cache, name, version, 'package.tgz');
      var inputStream = fs.createReadStream(tarball);
      deferred.resolve({ name: name, version: version, inputStream: inputStream });
    }
  });
}

/**
 * Fetch package manifest using `pacote` dependency.
 * With npm < 5.6.0, the manifest object was automatically returned by
 * the `cache.add` command. This function is here to deal with npm >= 5.6.0
 * to get the `integrity` checksum used to download the tarball using `cacache`.
 *
 * @param {string} pkg Package identifier.
 * @return {Promise<Object>} The manifest object.
 */
function getManifest(pkg) {
  return require('pacote').manifest(pkg).then(function (pkgJson) {
    return {
      integrity: pkgJson._integrity,
      manifest: {
        name: pkgJson.name,
        version: pkgJson.version
      }
    };
  });
}

/**
 * Run npm cache command and resolve the deferred object with the returned
 * metadata.
 *
 * @param {string} pkg NPM Package id (i.e `bower@1.8.0`).
 * @param {Object} deferred The deferred object to resolve.
 * @return {void}
 */
function newNpmCache(pkg, deferred) {
  npm.commands.cache.add(pkg).then(function (info) {
    return (
      // With npm < 5.6.0, the manifest object is returned by the ̀cache.add` command, so use it
      // instead of explicitly fetching the manifest file.
      info ? info : getManifest(pkg)
    );
  }).then(function (info) {
    var manifest = info.manifest;
    var name = manifest.name;
    var version = manifest.version;
    var cache = path.join(npm.cache, '_cacache');
    var inputStream = require('cacache').get.stream.byDigest(cache, info.integrity);
    deferred.resolve({ name: name, version: version, inputStream: inputStream });
  }).catch(function (err) {
    deferred.reject(err);
  });
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

/**
 * Returns the last key (in alpha-numeric order) of an object.
 *
 * @param {Object} o The object.
 * @return {string} The last key.
 */
function getLastKey(o) {
  var keys = Object.keys(o);
  keys.sort();
  return keys[keys.length - 1];
}

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
  releases: function releases(pkg) {
    return execViewCommand([pkg, 'versions']).then(function (data) {
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
  downloadTarball: function downloadTarball(pkg, version, dir) {
    var deferred = Q.defer();

    execCacheCommand(pkg + '@' + version).then(function (result) {
      // The original `pack` command does not support custom directory output.
      // So, to avoid to change the current working directory pointed by `process.cwd()` (i.e
      // to avoid side-effect), we just copy the file manually.
      // This is basically what is done by `npm pack` command.
      // See: https://github.com/npm/npm/issues/4074
      // See: https://github.com/npm/npm/blob/v3.10.8/lib/pack.js#L49
      var inputStream = result.inputStream;

      var targetDir = path.resolve(dir);
      var name = normalizePkgName(result.name);
      var fileName = name + '-' + result.version + '.tgz';
      var outputFile = path.join(targetDir, fileName);
      var outputStream = writeStreamAtomic(outputFile);

      // Handle errors.
      inputStream.on('error', function (err) {
        deferred.reject(err);
      });

      outputStream.on('error', function (err) {
        deferred.reject(err);
      });

      // Handle success.
      outputStream.on('close', function () {
        deferred.resolve(outputFile);
      });

      inputStream.pipe(outputStream);
    }).catch(function (err) {
      deferred.reject(err);
    });

    return deferred.promise;
  }
};