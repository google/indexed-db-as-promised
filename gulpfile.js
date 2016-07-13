const gulp = require('gulp');
const babel = require('rollup-plugin-babel');
const buffer = require('vinyl-buffer');
const eslint = require('gulp-eslint');
const mocha = require('gulp-mocha');
const rollup = require('rollup-stream');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('rollup-plugin-uglify');

// For Mocha testing
require('babel-register')({
  babelrc: false,
  presets: ['es2015'],
});

function watch(tasks) {
  return function watcher() {
    gulp.watch('src/**/*.js', Array.isArray(tasks) ? tasks : [tasks]);
  };
}

gulp.task('build', function build() {
  return rollup({
    entry: 'src/index.js',
    exports: 'named',
    format: 'umd',
    moduleName: 'IndexedDBP',
    sourceMap: true,
    plugins: [
      babel({
        exclude: 'node_modules/**',
      }),
      uglify({
        mangle: false,
        compress: { keep_fargs: false },
      }),
    ],
  }).pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('lib'));
});

gulp.task('test', function test() {
  return gulp.src('test/**/*.js', { read: false })
    .pipe(mocha({
      reporter: 'spec',
    }));
});

gulp.task('lint', function lint() {
  return gulp.src(['*.js', 'src/*.js', 'test/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('test-watch', ['test'], watch('test'));
gulp.task('lint-watch', ['lint'], watch('lint'));
gulp.task('default', ['test', 'lint', 'build']);
