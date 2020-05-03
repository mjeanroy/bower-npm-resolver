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

/**
 * This module is used as a wrapper for NPM commands.
 * Each functions will returned a promise:
 *  - Resolved with the desired result.
 *  - Rejected with the error returned from NPM.
 */

const requireg = require('requireg');
const npm = requireg('npm');
const Q = require('q');
const load = require('./_load');

/**
 * Executes `npm view` command with passed arguments.
 * Arguments is an array of `npm view` arguments.
 * So if cmd command was `npm view bower@1.7.7`, then argument
 * would be 'bower@1.7.7'.
 *
 * The returned promise will be resolved with the result of the cache command (i.e
 * object with all informations about the package).
 *
 * @param {Array} args The `view` command arguments, for example `['bower@1.7.7', 'versions']`.
 * @return {Promise} The promise object
 */
function view(args) {
  return load().then(() => (
    runView(args))
  );
}

/**
 * Run `npm view` command.
 *
 * @param {Array} args View command arguments.
 * @return {Promise} A promise resolved with npm view result.
 */
function runView(args) {
  return Q.Promise((resolve, reject) => {
    npm.commands.view(args, false, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

view(process.argv.slice(2))
    .then((result) => {
      process.send({result});
      process.exit(0);
    })
    .catch((err) => {
      process.send({err});
      process.exit(1);
    });
