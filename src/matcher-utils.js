/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 Mathieu Hofman
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
 * This module is used to parse the config and generate matchers.
 */

const escapeStringRegexp = require('escape-string-regexp');

/**
 * Matcher that tests a source against a regexp
 * and replaces the match to produce a clean source
 * @constructor
 */
class Matcher {
  /**
   * Create the matcher.
   * @param {RegExp} regexp A regular expression to match against
   * @param {string?} replace A string to replace the match with if necessary
   * @constructor
   */
  constructor(regexp, replace) {
    this.regexp = regexp;
    this.replace = replace;
  }

  /**
   * Test the matcher against the source
   * @param {string} source Source
   * @return {boolean} Match result
   */
  test(source) {
    return this.regexp.test(source);
  }

  /**
   * Executes the matcher against the source
   * @param {string} source Source
   * @return {string} Cleaned up result
   */
  exec(source) {
    return this.replace === undefined ? source : source.replace(this.regexp, this.replace);
  }
}

/**
 * Test if any matcher in the list matches against the source
 * @this {Array}
 * @param {string} source Source
 * @return {boolean} Match result
 */
function matchersTest(source) {
  return this.some((matcher) => matcher.test(source));
}

/**
 * Executes the first macther in the list that matches against the source
 * @this {Array}
 * @param {string} source Source
 * @return {string} Cleaned up result
 */
function matchersExec(source) {
  const matcher = this.reduce((matcher, newMatcher) => matcher || (newMatcher.test(source) ? newMatcher : null), null);
  return matcher.exec(source);
}

const NPM_SCHEME_PATTERN = '^npm:/{0,3}(?!/)';
// const NPM_SCHEME_PATTERN_VALID_ONLY = '^npm:(?:/?|///)(?!\\/)';
const NPM_PREFIX = 'npm+';

/**
 * Creates a list of matchers from the config, providing default matchers if necessary
 *
 * @param {object} config The user config from the `.bowerrc` file.
 * @return {Array.<Matcher>} List of matchers.
 */
exports.getFromConfig = function getFromConfig(config) {
  config = config || {};

  let patterns = config.match || [];

  if (typeof patterns !== 'object' || !Array.isArray(patterns)) {
    patterns = [patterns];
  }

  // Handle v0.2.0 style config
  if (config.matchPrefix) {
    if (typeof config.ignoreMatchDefaults === 'undefined') {
      config.ignoreMatchDefaults = true;
    }
    patterns.unshift({
      pattern: `^${escapeStringRegexp(config.matchPrefix)}`,
      replace: ('stripPrefix' in config) ? Boolean(config.stripPrefix) : true,
    });
  }

  if (!config.ignoreMatchDefaults) {
    patterns.push({
      pattern: NPM_SCHEME_PATTERN,
      flags: 'i',
      replace: true,
    });
    patterns.push({
      prefix: NPM_PREFIX,
      replace: true,
    });
  }

  const matchers = patterns.map((pattern) => {
    if (typeof pattern === 'string') {
      pattern = {
        pattern,
      };
    }

    if (pattern instanceof RegExp) {
      pattern = {
        regexp: pattern,
      };
    }

    if (typeof pattern !== 'object' || !pattern) {
      throw new Error('Invalid match value: ' + pattern);
    }

    const patternString = pattern.pattern || (pattern.prefix ? `^${escapeStringRegexp(pattern.prefix)}` : null);

    const regexp = pattern.regexp || new RegExp(patternString, pattern.flags);
    let replace;

    if (pattern.replace === true) {
      replace = '';
    } else if (pattern.replace === false || pattern.replace === undefined) {
      replace = undefined;
    } else {
      replace = pattern.replace;
    }

    return new Matcher(regexp, replace);
  });

  matchers.test = matchersTest;
  matchers.exec = matchersExec;

  return matchers;
};
