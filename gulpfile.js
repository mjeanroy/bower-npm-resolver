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

var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var jasmine = require('gulp-jasmine');
var bump = require('gulp-bump');
var gutil = require('gulp-util');
var git = require('gulp-git');
var runSequence = require('run-sequence');
var eslint = require('gulp-eslint');

gulp.task('lint', function() {
  var srcFiles = path.join(__dirname, 'src/**/*.js');
  var testFiles = path.join(__dirname, 'test/**/*.js');
  return gulp.src([srcFiles, testFiles])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', function() {
  return gulp.src(path.join(__dirname, 'test/*.js'))
    .pipe(jasmine());
});

gulp.task('bump', ['bump:patch'], function() {
  return gulp.src(path.join(__dirname, 'package.json'))
    .pipe(bump({type: 'patch'}).on('error', gutil.log))
    .pipe(gulp.dest('./'));
});

gulp.task('commit', function() {
  return gulp.src('.')
    .pipe(git.add())
    .pipe(git.commit('release: bumped version number'));
});

gulp.task('tag', function(done) {
  var pkg = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8');
  var version = JSON.parse(pkg).version;
  git.tag('v' + version, 'release: tag version ' + version, done);
});

['major', 'minor', 'patch'].forEach(function(level) {
  gulp.task('bump:' + level, function() {
    return gulp.src(path.join(__dirname, 'package.json'))
      .pipe(bump({type: level})
      .on('error', gutil.log))
      .pipe(gulp.dest('.'));
  });

  gulp.task('release:' + level, function() {
    runSequence('bump:' + level, 'commit', 'tag');
  });
});

// Default release task.
gulp.task('release', ['release:patch']);

