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

var tmp = require('tmp');
var path = require('path');
var npmUtils = require('./npm-utils');
var download = require('./download');
var extract = require('./extract');
var bowerUtils = require('./bower-utils');

module.exports = function resolver(bower) {
  var DEFAULT_MATCH_PREFIX = 'npm+';
  var DEFAULT_STRIP_PREFIX = true;

  // Read configuration passed via .bowerrc
  var cfg = bower.config.bowerNpmResolver || {};
  var matchPrefix = cfg.matchPrefix || DEFAULT_MATCH_PREFIX;
  var stripPrefix = ('stripPrefix' in cfg) ? Boolean(cfg.stripPrefix) : DEFAULT_STRIP_PREFIX;

  // Extract the package identifier.
  var extractPackageName = function(source) {
    var parts = source.split('=');
    var pkgName = parts[0];

    if (stripPrefix) {
      pkgName = pkgName.slice(matchPrefix.length);
    }

    return pkgName;
  };

  // Resolver factory returns an instance of resolver
  return {

    /**
     * Match method tells whether resolver supports given source.
     * By default, the resolver matches entries whose key name in `bower.json` starts with `npm+` string.
     * This is configurable via `bowerNpmResolver.prefix` property in `.bowerrc`.
     *
     * @param {string} source Source from `bower.json`.
     * @return {boolean} `true` if source match this resolver, `false` otherwise.
     */
    match: function(source) {
      return source.indexOf(matchPrefix) === 0;
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
      var pkg = extractPackageName(source);
      return npmUtils.releases(pkg).then(function(versions) {
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
      // If cached version of package exists, re-use it
      if (cached && cached.version) {
        return undefined;
      }

      var pkg = extractPackageName(endpoint.source);

      // Directory where the tgz will be stored.
      var tmpTar = tmp.dirSync({
        unsafeCleanup: true
      });

      // Directory where the tgz file will be extracted.
      var tmpPackage = tmp.dirSync({
        unsafeCleanup: true
      });

      return npmUtils.tarball(pkg, endpoint.target)

        // We have the tarball URL, download it.
        .then(function(tarballUrl) {
          return download.fetch(tarballUrl, tmpTar.name);
        })

        // Download ok, extract tarball.
        .then(function(tarballPath) {
          return extract.tgz(tarballPath, tmpPackage.name);
        })

        // Patch configuration with `package.json` file if `bower.json` does not exist.
        .then(function(dir) {
          var pkgPath = path.join(dir, 'package');
          return bowerUtils.patchConfiguration(pkgPath).then(function() {
            return {
              tempPath: pkgPath,
              removeIgnores: true
            };
          });
        })

        // When an error occured, remove temporary directory.
        .catch(function() {
          tmpPackage.removeCallback();
        })

        // Always remove the temporary directory for the tgz file.
        .finally(function() {
          tmpTar.removeCallback();
        });
    }
  };
};
