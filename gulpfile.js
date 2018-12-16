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

/* eslint-disable require-jsdoc */

const fs = require('fs');
const path = require('path');
const log = require('fancy-log');
const gulp = require('gulp');
const babel = require('gulp-babel');
const jasmine = require('gulp-jasmine');
const bump = require('gulp-bump');
const git = require('gulp-git');
const del = require('del');
const eslint = require('gulp-eslint');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const TEST = path.join(ROOT, 'test');
const DIST = path.join(ROOT, 'dist');
const PKG = path.join(ROOT, 'package.json');

function clean() {
  return del(DIST);
}

function lint() {
  const src = [
    path.join(SRC, '**', '*.js'),
    path.join(TEST, '**', '*.js'),
    path.join(ROOT, '*.js'),
  ];

  return gulp.src(src)
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
}

function compile() {
  return gulp.src(path.join(SRC, '**', '*.js'))
      .pipe(babel())
      .pipe(gulp.dest(DIST));
}

function testUnit() {
  return gulp.src(path.join(TEST, '*.js')).pipe(jasmine());
}

const build = gulp.series(
    gulp.parallel(clean, lint),
    compile
);

const test = gulp.series(
    build,
    testUnit
);

function tdd() {
  const sources = [
    path.join(SRC, '**', '*.js'),
    path.join(TEST, '**', '*.js'),
  ];

  gulp.watch(sources, test);
}

function bumpVersion(type) {
  return gulp.src(PKG)
      .pipe(bump({type}))
      .on('error', (e) => log.error(e))
      .pipe(gulp.dest(ROOT));
}

function performRelease() {
  return gulp.src([PKG, DIST])
      .pipe(git.add({args: '-f'}))
      .pipe(git.commit('release: release version'));
}

function tagRelease(done) {
  fs.readFile(PKG, 'utf8', (err, data) => {
    if (err) {
      done(err);
      return;
    }

    const version = JSON.parse(data).version;
    git.tag(`v${version}`, `release: tag version ${version}`, done);
  });
}

function prepareNextRelease() {
  return gulp.src(DIST)
      .pipe(git.rm({args: '-r'}))
      .pipe(git.commit('release: prepare next release'));
}

module.exports.clean = clean;
module.exports.lint = lint;
module.exports.build = build;
module.exports.test = test;
module.exports.tdd = tdd;

['major', 'minor', 'patch'].forEach((level) => {
  function prepareRelease() {
    return bumpVersion(level);
  }

  const release = gulp.series(
      prepareRelease,
      performRelease,
      tagRelease,
      prepareNextRelease
  );

  module.exports[`release:${level}`] = gulp.series(
      test,
      release
  );
});
