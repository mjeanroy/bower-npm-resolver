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
 * Factory function for the resolver.
 * Will be called only one time by Bower, to instantiate resolver.
 */

var mkdirp = require('mkdirp');
var path = require('path');
var npmUtils = require('./npm-utils');
var extract = require('./extract');
var bowerUtils = require('./bower-utils');
var matcherUtils = require('./matcher-utils');

module.exports = function resolver(bower) {
  var logger = bower.logger;

  // Read configuration passed via .bowerrc
  var matchers = matcherUtils.getFromConfig(bower.config.bowerNpmResolver);
  logger.debug('npm-resolver', 'found matchers: ' + JSON.stringify(matchers));

  /**
   * Extract package name from package source.
   * The source is formatted such as:
   *    npm:[package]#[version]
   *
   * @param {string} source Source read from `bower.json` file.
   * @return {string} Package name extracted from given source.
   */
  var extractPackageName = function(source) {
    var matchedSource = matchers.exec(source);
    var withoutVersion = matchedSource.split('#')[0];

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
    match: function(source) {
      logger.debug('npm-resolver', 'checking for: ' + source);
      return matchers.test(source);
    },

    /**
     * List available versions of given package.
     * The list of version is automatically fetched from NPM.
     * Bower chooses matching release and passes it to "fetch".
     *
     * @param {string} source Source from `bower.json`.
     * @return {Promise} Promise resolved with available releases versions.
     */
    releases: function(source) {
      logger.debug('npm-resolver', 'extracting package name from: ' + source);
      var pkg = extractPackageName(source);

      logger.debug('npm-resolver', 'fetching releases information from: ' + pkg);
      return npmUtils.releases(pkg).then(function(versions) {
        logger.debug('npm-resolver', 'found releases: ' + versions);
        return versions.map(function(v) {
          return {
            target: v,
            version: v
          };
        });
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
    fetch: function(endpoint, cached) {
      logger.debug('npm-resolver', 'fetching: ' + JSON.stringify(endpoint));

      // If cached version of package exists, re-use it
      if (cached && cached.version) {
        return undefined;
      }

      logger.debug('npm-resolver', 'extracting package name from: ' + endpoint.source);
      var pkg = extractPackageName(endpoint.source);

      // Directory where the tgz will be stored.
      var compressedDir = path.join(bower.config.storage.packages, 'npm-resolver/compressed');
      mkdirp.sync(compressedDir);

      // Directory where the tgz file will be extracted.
      var uncompressedDir = path.join(bower.config.storage.packages, 'npm-resolver/uncompressed', pkg, endpoint.target);
      mkdirp.sync(uncompressedDir);

      logger.debug('npm-resolver', 'downloading tarball for: ' + pkg + '#' + endpoint.target);
      return npmUtils.downloadTarball(pkg, endpoint.target, compressedDir)

        // Download ok, extract tarball.
        .then(function(tarballPath) {
          logger.debug('npm-resolver', 'extracting tarball from: "' + tarballPath + '" to "' + uncompressedDir);
          return extract.tgz(tarballPath, uncompressedDir);
        })

        // Patch configuration with `package.json` file if `bower.json` does not exist.
        .then(function(dir) {
          var pkgPath = path.join(dir, 'package');
          logger.debug('npm-resolver', 'extracting and patching bower.json from: ' + pkgPath);
          return bowerUtils.patchConfiguration(pkgPath).then(function() {
            return {
              tempPath: pkgPath,
              removeIgnores: true
            };
          });
        });
    }
  };
};
