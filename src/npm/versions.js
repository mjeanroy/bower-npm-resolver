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

const Q = require('q');
const packument = require('packument');
const npmLoad = require('./_load');
const npmConfig = require('./_config');

module.exports = function versions(pkg) {
  return npmLoad().then(() => (
    getVersions(pkg)
  ));
};

/**
 * Get all versions available for given package.
 *
 * @param {string} pkg The package.
 * @return {Promise<Array<string>>} An array containing all versions for given package.
 */
function getVersions(pkg) {
  return Q.promise((resolve, reject) => {
    packument(pkg, npmConfig(), (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(Object.keys(result.versions));
      }
    });
  });
}
