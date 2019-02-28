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
const requireg = require('requireg');
const npm = requireg('npm');
const Q = require('q');
const semver = require('semver');
const cacache = require('cacache');
const pacote = require('pacote');
const load = require('./load');

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
module.exports = function cache(pkg) {
  return load().then((meta) => (
    runCache(pkg, meta)
  ));
};

/**
 * Run `npm cache` command.
 *
 * @param {Array} pkg The package to download.
 * @param {Object} meta NPM metadata.
 * @return {Promise} The promise resolved with command result.
 */
function runCache(pkg, meta) {
  if (semver.lt(meta.version, '5.0.0')) {
    return oldNpmCache(pkg);
  } else {
    return newNpmCache(pkg);
  }
}

/**
 * Run npm cache command and resolve the deferred object with the returned
 * metadata.
 *
 * @param {string} pkg NPM Package id (i.e `bower@1.8.0`).
 * @return {void}
 */
function oldNpmCache(pkg) {
  const deferred = Q.defer();

  npm.commands.cache.add(pkg, null, null, false, (err, data) => {
    if (err) {
      deferred.reject(err);
    } else {
      const name = data.name;
      const version = data.version;
      const tarball = path.resolve(npm.cache, name, version, 'package.tgz');
      const inputStream = fs.createReadStream(tarball);
      deferred.resolve({name, version, inputStream});
    }
  });

  return deferred.promise;
}

/**
 * Run npm cache command and resolve the deferred object with the returned
 * metadata.
 *
 * @param {string} pkg NPM Package id (i.e `bower@1.8.0`).
 * @return {void}
 */
function newNpmCache(pkg) {
  const deferred = Q.defer();

  npm.commands.cache.add(pkg)
      .then((info) => (
        // With npm < 5.6.0, the manifest object is returned by the ̀cache.add` command, so use it
        // instead of explicitly fetching the manifest file.
        info ? info : getManifest(pkg)
      ))
      .then((info) => {
        const manifest = info.manifest;
        const name = manifest.name;
        const version = manifest.version;
        const cache = path.join(npm.cache, '_cacache');
        const inputStream = cacache.get.stream.byDigest(cache, info.integrity);
        deferred.resolve({name, version, inputStream});
      })
      .catch((err) => {
        deferred.reject(err);
      });

  return deferred.promise;
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
  // detect custom registry and user auth info
  const opts = {
    registry: npm.config.get('registry'),
  };

  // https://github.com/npm/npm/blob/latest/lib/config/pacote.js
  npm.config.keys.forEach(function(k) {
    const authMatchGlobal = k.match(
        /^(_authToken|username|_password|password|email|always-auth|_auth)$/
    );
    const authMatchScoped = k[0] === '/' && k.match(
        /(.*):(_authToken|username|_password|password|email|always-auth|_auth)$/
    );

    // if it matches scoped it will also match global
    if (authMatchGlobal || authMatchScoped) {
      let nerfDart = null;
      let key = null;
      let val = null;

      if (!opts.auth) {
        opts.auth = {};
      }

      if (authMatchScoped) {
        nerfDart = authMatchScoped[1];
        key = authMatchScoped[2];
        val = npm.config.get(k);
        if (!opts.auth[nerfDart]) {
          opts.auth[nerfDart] = {
            alwaysAuth: !!npm.config.get('always-auth'),
          };
        }
      } else {
        key = authMatchGlobal[1];
        val = npm.config.get(k);
        opts.auth.alwaysAuth = !!npm.config.get('always-auth');
      }

      const auth = authMatchScoped ? opts.auth[nerfDart] : opts.auth;
      if (key === '_authToken') {
        auth.token = val;
      } else if (key.match(/password$/i)) {
        auth.password =
          // the config file stores password auth already-encoded. pacote expects
          // the actual username/password pair.
          Buffer.from(val, 'base64').toString('utf8');
      } else if (key === 'always-auth') {
        auth.alwaysAuth = val === 'false' ? false : !!val;
      } else {
        auth[key] = val;
      }
    }

    if (k[0] === '@') {
      if (!opts.scopeTargets) {
        opts.scopeTargets = {};
      }
      opts.scopeTargets[k.replace(/:registry$/, '')] = npm.config.get(k);
    }
  });

  return pacote.manifest(pkg, opts).then((pkgJson) => ({
    integrity: pkgJson._integrity,
    manifest: {
      name: pkgJson.name,
      version: pkgJson.version,
    },
  }));
}
