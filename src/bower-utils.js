/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2019 Mickael Jeanroy
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

const path = require('path');
const fs = require('fs');
const Q = require('q');
const _ = require('lodash');

/**
 * Check that a given path is a valid file and returns a promise
 * that is resolved if the path is a file and rejected if not.
 *
 * @param {string} path The path to check.
 * @return {Promise} The promise.
 */
function isFile(path) {
  const deferred = Q.defer();

  fs.stat(path, (err, stat) => {
    if (err || !stat.isFile()) {
      deferred.reject();
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
}

module.exports = {
  patchConfiguration(pkg) {
    const deferred = Q.defer();
    const bowerJson = path.join(pkg, 'bower.json');

    isFile(bowerJson)
        .then(deferred.resolve)
        .catch(() => {
          fs.readFile(path.join(pkg, 'package.json'), 'utf8', (err, data) => {
            if (err) {
              deferred.reject(`Could not read package.json from ${pkg}`);
            } else {
              const config = JSON.parse(data);
              const newConfig = _.pick(config, [
                'name',
                'description',
                'main',
                'moduleType',
                'keywords',
                'authors',
                'license',
                'ignore',
                'private',
                'homepage',
                'bugs',
                'repository',
              ]);

              // scoped packages get special treatment
              // See https://github.com/npm/npm/blob/v3.9.1/lib/pack.js#L53
              if (newConfig.name[0] === '@') {
                newConfig.name = newConfig.name.substr(1).replace(/\//g, '-');
              }

              // Do not try to translate dependencies.
              // Maybe be can try to deduce the dependencies ?
              newConfig.dependencies = {};
              newConfig.devDependencies = {};

              fs.writeFile(bowerJson, JSON.stringify(newConfig, null, 2), 'utf-8', (err) => {
                if (err) {
                  deferred.reject(`Could not write bower.json file to ${pkg}`);
                } else {
                  deferred.resolve();
                }
              });
            }
          });
        });

    return deferred.promise;
  },
};
