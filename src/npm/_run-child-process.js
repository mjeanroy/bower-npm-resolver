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

const childProcess = require('child_process');
const path = require('path');
const Q = require('q');

module.exports = function runChildProcess(script, args) {
  return Q.Promise((resolve, reject) => {
    const processArgs = Array.isArray(args) ? args : [args];
    const cmd = childProcess.fork(path.join(__dirname, script), processArgs, {
      silent: true,
      detached: false,
    });

    cmd.on('exit', (code) => {
      if (code !== 0) {
        reject(`Child process exited with code: ${code}`);
      } else {
        resolve();
      }
    });

    cmd.on('error', (err) => {
      reject(err);
    });

    cmd.on('message', (result) => {
      if (result.err) {
        reject(result.err);
      } else {
        resolve(result.result);
      }
    });
  });
};
