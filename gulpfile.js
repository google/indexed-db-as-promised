/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const gulp = require('gulp');
const alias = require('rollup-plugin-alias');
const babel = require('rollup-plugin-babel');
const buffer = require('vinyl-buffer');
const escapeRegExp = require('lodash.escaperegexp');
const eslint = require('gulp-eslint');
const license = require('./conf/license-check');
const mocha = require('gulp-mocha');
const replace = require('rollup-plugin-replace');
const rollup = require('rollup-stream');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const touch = require('touch');
const uglify = require('rollup-plugin-uglify');

const licenseHeader = require('fs')
  .readFileSync('./conf/license_header.txt', 'utf8');

// For Mocha testing
require('babel-register')({
  babelrc: false,
  presets: ['es2015-loose'],
  plugins: ['external-helpers'],
});
global.babelHelpers = require('./src/babel-helpers');

function watch(tasks) {
  return function watcher() {
    const watcher = gulp.watch([
      'src/**/*.js',
      'test/**/*.js',
    ], Array.isArray(tasks) ? tasks : [tasks]);

    watcher.on('ready', () => {
      touch('src/index.js');
    });
  };
}

function bundle(options) {
  return rollup({
    entry: 'src/index.js',
    exports: 'named',
    format: options.format,
    moduleName: 'IndexedDBP',
    sourceMap: true,
    banner: licenseHeader,
    plugins: [
      alias({
        '\0babelHelpers': `${__dirname}/src/babel-helpers`,
      }),
      babel({
        exclude: 'node_modules/**',
      }),
      replace({
        [escapeRegExp(licenseHeader)]: '',
      }),
      options.minify ? uglify({
        compress: {
          keep_fargs: false,
        },
        output: {
          comments: /Copyright/,
        },
        mangleProperties: {
          regex: /^_/,
        },
      }) : {},
    ],
  }).pipe(source(options.output))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib'));
}

gulp.task('build', () => {
  bundle({
    format: 'umd',
    minify: false,
    output: 'indexed-db.js',
  });
});

gulp.task('build-cjs', () => {
  bundle({
    format: 'cjs',
    minify: false,
    output: 'index.js',
  });
});

gulp.task('minify', () => {
  bundle({
    format: 'umd',
    minify: true,
    output: 'indexed-db.min.js',
  });
});

gulp.task('test', () => {
  return gulp.src('test/**/*.js', { read: false })
    .pipe(mocha({
      reporter: 'spec',
    }));
});

gulp.task('lint', () => {
  return gulp.src(['*.js', 'src/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('license', function () {
  return gulp.src(['**/*.js', '!node_modules/**'])
    .pipe(license());
});

gulp.task('test-watch', watch('test'));
gulp.task('lint-watch', watch('lint'));

gulp.task('compile', ['build', 'build-cjs', 'minify']);

gulp.task('default', ['test', 'lint', 'license', 'compile']);
