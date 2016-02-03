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
 * This module will download NPM package.
 * Before download operation is triggered, NPM proxy
 * configuration will be loaded and added to the HTTP
 * request.
 */

var path = require('path');
var url = require('url');
var fs = require('fs');
var request = require('request');
var npmUtils = require('./npm-utils');
var Q = require('q');

module.exports = {
  /**
   * Download an NPM package and save the file
   * to a given directory.
   *
   * Saved file will be named as the name of the file to download.
   * For example, suppose this URL: 'http://registry.npmjs.org/bower/-/bower-1.7.7.tgz',
   * then the downloaded file will be named 'bower-1.7.7.tgz'.
   *
   * This function returns a Promise resolved with the full path of the
   * download file on disk.
   *
   * The promise will be rejected if an error occured (HTTP status code >= 400, fail to
   * write the file on disk, unable to get the proxy configuration from NPM, etc.).
   *
   * **Note:** NPM proxy configuration will be used to configure the HTTP request.
   *
   * @param {String} targetUrl URL of the file to download.
   * @param {String} dst Directory where the file will be saved.
   * @return {Promise} The promise.
   */
  fetch: function(targetUrl, dst) {
    var deferred = Q.defer();

    // Get NPM proxy settings before making the request.
    npmUtils.proxy()
      .then(function(config) {
        var uri = url.parse(targetUrl, false, true);
        var pathname = uri.pathname;
        var parts = pathname.split('/');
        var fname = parts[parts.length - 1];
        var tmpFile = path.join(dst, fname);
        var writeStream = fs.createWriteStream(tmpFile);

        var options = {
          method: 'GET',
          url: targetUrl
        };

        // Add NPM proxy settings.
        options.proxy = uri.protocol === 'http:' ?
          config.proxy :
          config['https-proxy'];

        var readStream = request(options);

        readStream
          .on('response', function(res) {
            var statusCode = res.statusCode;
            if (statusCode >= 400) {
              return deferred.reject(
                'Unable to download the tarball at ' + targetUrl
              );
            }
          })
          .on('error', function(err) {
            deferred.reject(err);
          });

        // Pipe to target file.
        readStream.pipe(writeStream);

        writeStream
          .on('close', function() {
            deferred.resolve(tmpFile);
          })
          .on('error', function(err) {
            deferred.reject(err);
          });
      })
      .catch(deferred.reject);

    return deferred.promise;
  }
};
