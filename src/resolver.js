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
 * Factory function for the resolver.
 * Will be called only one time by Bower, to instantiate resolver.
 */

const mkdirp = require('mkdirp');
const path = require('path');
const pkg = require('../package.json');
const npmUtils = require('./npm-utils');
const extract = require('./extract');
const bowerUtils = require('./bower-utils');
const isNpmPackageName = require('./is-npm-package-name');
const matcherUtils = require('./matcher-utils');

module.exports = function resolver(bower) {
  const logger = bower.logger;

  // Read configuration passed via .bowerrc
  const matchers = matcherUtils.getFromConfig(bower.config.bowerNpmResolver);
  logger.debug('npm-resolver', `initializing bower-npm-resolver ${pkg.version}`);
  logger.debug('npm-resolver', `found matchers: ${JSON.stringify(matchers)}`);

  /**
   * Extract package name from package source.
   * The source is formatted such as:
   *    npm:[package]#[version]
   *
   * @param {string} source Source read from `bower.json` file.
   * @return {string} Package name extracted from given source.
   */
  function extractPackageName(source) {
    const matchedSource = matchers.exec(source);
    const withoutVersion = matchedSource.split('#')[0];
    return withoutVersion;
  };

  // Resolver factory returns an instance of resolver
  return {
    /**
     * Match method tells whether resolver supports given source.
     * The resolver matches entries whose package value in `bower.json` starts with `npm:` string.
     *
     * @param {string} source Source from `bower.json`.
     * @return {boolean} `true` if source match this resolver, `false` otherwise.
     */
    match(source) {
      logger.debug('npm-resolver', `checking for: ${source}`);

      const matchResolver = matchers.test(source);
      const pkgName = matchResolver ? extractPackageName(source) : source;
      const matchPackageName = matchResolver && isNpmPackageName(pkgName);

      if (matchResolver && !matchPackageName) {
        logger.error('npm-resolver', `it seems that you try to fetch a package that is a not a valid npm package: ${source} (parsed as: ${pkgName}).`);
        logger.error('npm-resolver', `if you want to fetch a GIT endpoint or an URL, bower can do it natively.`);
        logger.error('npm-resolver', `otherwise, if your are sure that your package exist, please submit an issue.`);
      }

      return matchResolver && matchPackageName;
    },

    /**
     * List available versions of given package.
     * The list of version is automatically fetched from NPM.
     * Bower chooses matching release and passes it to "fetch".
     *
     * @param {string} source Source from `bower.json`.
     * @return {Promise} Promise resolved with available releases versions.
     */
    releases(source) {
      logger.debug('npm-resolver', `extracting package name from: ${source}`);
      const pkg = extractPackageName(source);

      logger.debug('npm-resolver', `fetching releases information from: ${pkg}`);
      return npmUtils.releases(pkg).then((versions) => {
        logger.debug('npm-resolver', `found releases: ${versions}`);
        return versions.map((v) => ({
          target: v,
          version: v,
        }));
      });
    },

    /**
     * Downloads package and extracts it to temporary directory.
     * If an error occurred, the temporary directory will be deleted.
     *
     * The endpoint parameter is an object, containing following keys:
     * - `name`: the name of resource (like jquery).
     * - `source`: Where to download resource.
     * - `target`: the version or release of resource to download (like v1.0.0).
     *
     * The `cached` paramter contains information about cached resource. It
     * contains following keys:
     * - `endpoint`: endpoint of cached resource (the same format as above).
     * - `release`: release of cached resource.
     * - `releases`: the result of releases method.
     * - `version`: present cached resource has been resolved as version (like 1.0.0).
     * - `resolution`: the “resolution” returned from previous fetch call for same resource.
     *
     * @param {object} endpoint Endpoint source.
     * @param {object} cached The cached object (describe above).
     * @return {Promise} Promise object.
     * @see http://bower.io/docs/pluggable-resolvers/#resolverfetch
     */
    fetch(endpoint, cached) {
      logger.debug('npm-resolver', `fetching: ${JSON.stringify(endpoint)}`);

      // If cached version of package exists, re-use it
      if (cached && cached.version) {
        return undefined;
      }

      logger.debug('npm-resolver', `extracting package name from: ${endpoint.source}`);
      const pkg = extractPackageName(endpoint.source);
      const storage = bower.config.storage.packages;

      // Directory where the tgz will be stored.
      const compressedDir = path.join(storage, 'npm-resolver/compressed');
      mkdirp.sync(compressedDir);

      // Directory where the tgz file will be extracted.
      const uncompressedDir = path.join(storage, 'npm-resolver/uncompressed', pkg, endpoint.target);
      mkdirp.sync(uncompressedDir);

      logger.debug('npm-resolver', `downloading tarball for: ${pkg}#${endpoint.target}`);
      return npmUtils.downloadTarball(pkg, endpoint.target, compressedDir)

        // Download ok, extract tarball.
        .then((tarballPath) => {
          logger.debug('npm-resolver', `extracting tarball from: "${tarballPath}" to "${uncompressedDir}`);
          return extract.tgz(tarballPath, uncompressedDir);
        })

        // Patch configuration with `package.json` file if `bower.json` does not exist.
        .then((dir) => {
          const pkgPath = path.join(dir, 'package');
          logger.debug('npm-resolver', `extracting and patching bower.json from: ${pkgPath}`);
          return bowerUtils.patchConfiguration(pkgPath).then(() => ({
            tempPath: pkgPath,
            removeIgnores: true,
          }));
        });
    },
  };
};
