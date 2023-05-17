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
const fs = require('fs');
const Q = require('q');
const npmLoad = require('./_load');
const npmConfig = require('./_config');
const {exec} = require('child_process');

module.exports = function cache(args) {
  return cacheAdd(args).then((result) => (
    readCacheQueryResult(result)
  ));
};

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
function cacheAdd(pkg) {
  return npmLoad().then((meta) => npmCacheAdd(pkg));
}

/**
 * Run npm cache command and resolve the deferred object with the returned
 * metadata.
 *
 * @param {string} pkg NPM Package id (i.e `bower@1.8.0`).
 * @return {void}
 */
function npmCacheAdd(pkg) {
  const promise = Q.promise((resolve, reject) => {
    exec('npm cache add ' + pkg, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
  return promise
      .then((info) => info ? info : manifest(pkg))
      .then((info) => ({
        cache: path.join(info.npmConfig.cache, '_cacache'),
        name: info.manifest.name,
        version: info.manifest.version,
        integrity: info.integrity,
        path: null,
      }));
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
function manifest(pkg) {
  return Q.Promise((resolve, reject) => {
    npmConfig().then((npmConfig) => {
      return require('pacote')
          .manifest(pkg, npmConfig)
          .then((pkgJson) => {
            resolve({
              npmConfig: npmConfig,
              integrity: pkgJson._integrity,
              manifest: {
                name: pkgJson.name,
                version: pkgJson.version,
              },
            });
          });
    });
  });
}

/**
 * Read cache query result and transform cache entry result to a readable stream.
 *
 * @param {Object} result The cache query result.
 * @return {Object} The result.
 */
function readCacheQueryResult(result) {
  const name = result.name;
  const version = result.version;
  const inputStream = result.path ? createReadStream(result) : getStreamByDigest(result);
  return {
    name,
    version,
    inputStream,
  };
}

/**
 * Create stream from given `path` property of result object.
 *
 * @param {Object} result The result object.
 * @return {ReadStream} The result stream.
 */
function createReadStream(result) {
  return fs.createReadStream(result.path);
}

/**
 * Get stream from npm cache.
 *
 * @param {Object} result The result object.
 * @return {ReadStream} The result stream.
 */
function getStreamByDigest(result) {
  return require('cacache').get.stream.byDigest(result.cache, result.integrity);
}
