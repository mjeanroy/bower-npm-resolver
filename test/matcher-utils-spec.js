/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2018 Mathieu Hofman, Mickael Jeanroy
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

const matcherUtils = require('../dist/matcher-utils');

/**
 * Iterate over object keys and trigger callback for each entry.
 * @param {object} obj Object to iterate.
 * @param {function} callback Iteration callback.
 */
function forEachObjectAsMap(obj, callback) {
  Object.keys(obj).forEach((key) => {
    callback(obj[key], key, obj);
  });
}

describe('matcher-utils', () => {
  it('should match npm source by default', () => {
    const matchers = matcherUtils.getFromConfig();

    expect(matchers.test('npm+test')).toBe(true);
    expect(matchers.test('npm:test')).toBe(true);
    expect(matchers.test('npm:test#~1.0.0')).toBe(true);
    expect(matchers.test('npm:@scope/test#~1.0.0')).toBe(true);
    expect(matchers.test('test')).toBe(false);
  });

  describe('should match only valid variations of npm scheme.', () => {
    const matchers = matcherUtils.getFromConfig();

    it('accepts valid URIs', () => {
      // a urn type URI (no authority) where package name is the whole path
      expect(matchers.test('npm:test')).toBe(true);

      // a urn type URI (no authority) where package name is prefixed by a / (i.e. absolute path)
      expect(matchers.test('npm:/test')).toBe(true);

      // URI with empty authority (package name is prefixed by a /)
      expect(matchers.test('npm:///test')).toBe(true);

      // URI with empty authority (full package name is prefixed by a /, @scope is considered a directory)
      expect(matchers.test('npm:///@scope/test')).toBe(true);

      // URIs are case insensitive
      expect(matchers.test('NPM:test')).toBe(true);
    });

    it('accepts invalid, yet common URIs', () => {
      // URI where the package name is the authority
      expect(matchers.test('npm://test')).toBe(true);

      // URI where the scope is the authority and scoped name is the path
      expect(matchers.test('npm://@scope/test')).toBe(true);
    });

    it('rejects invalid URIs', () => {
      // Path has too many slashes
      expect(matchers.test('npm:////test')).toBe(false);
    });
  });

  forEachObjectAsMap({
    'string': {
      match: '^mycompany',
    },
    'RegExp': {
      match: /^mycompany/,
    },
    'object': {
      match: {
        pattern: '^mycompany',
      },
    },
    'object with prefix': {
      match: {
        prefix: 'mycompany',
      },
    },
    'object with replace=false': {
      match: {
        pattern: '^mycompany',
        replace: false,
      },
    },
    'array': {
      match: [
        '^myothercompany',
        '^mycompany',
      ],
    },
    'matchPrefix': {
      matchPrefix: 'mycompany',
      stripPrefix: false,
    },
  }, (config, type) => {
    let matchers;

    it(`should parse config when pattern passed as a ${type}`, () => {
      matchers = matcherUtils.getFromConfig(config);
      expect(matchers).toBeDefined();
    });

    it(`should match a custom pattern passed as a ${type}`, () => {
      expect(matchers.test('mycompany-test')).toBe(true);
      expect(matchers.test('test')).toBe(false);
    });

    if (type !== 'matchPrefix') {
      it(`should keep matching defaults when custom pattern passed as a ${type}`, () => {
        expect(matchers.test('npm:test')).toBe(true);
        expect(matchers.test('npm+test')).toBe(true);
      });
    }

    it(`should not replace from custom pattern passed as a ${type}`, () => {
      expect(matchers.exec('mycompany-test')).toEqual('mycompany-test');
    });
  });

  forEachObjectAsMap({
    'replace=true': {
      match: {
        prefix: 'mycompany-',
        replace: true,
      },
    },
    'replace with empty string': {
      match: {
        pattern: '^mycompany-',
        replace: '',
      },
    },
    'replace with string': {
      match: {
        pattern: '^mycompany-te',
        replace: 'te',
      },
    },
    'replace with regexp result': {
      match: {
        pattern: '^mycompany-(test)',
        replace: '$1',
      },
    },
    'matchPrefix': {
      matchPrefix: 'mycompany-',
    },
    'matchPrefix with stripPrefix=true': {
      matchPrefix: 'mycompany-',
      stripPrefix: true,
    },
  }, (config, type) => {
    it(`should strip/replace when ${type}`, () => {
      const matchers = matcherUtils.getFromConfig(config);

      expect(matchers.exec('mycompany-test')).toEqual('test');
    });
  });

  forEachObjectAsMap({
    'ignoreMatchDefaults=true': {
      match: '^mycompany',
      ignoreMatchDefaults: true,
    },
    'matchPrefix': {
      matchPrefix: 'mycompany',
    },
  }, (config, type) => {
    it(`should ignore the defaults when ${type}`, () => {
      const matchers = matcherUtils.getFromConfig(config);

      expect(matchers.test('npm:test')).toBe(false);
      expect(matchers.test('npm+test')).toBe(false);
    });
  });

  it('should not match anything with an empty match list', () => {
    const matchers = matcherUtils.getFromConfig({
      match: [],
      ignoreMatchDefaults: true,
    });

    expect(matchers.test('test')).toBe(false);
    expect(matchers.test('')).toBe(false);
  });
});
