const gulp = require('gulp');
const babel = require('rollup-plugin-babel');
const buffer = require('vinyl-buffer');
const eslint = require('gulp-eslint');
const mocha = require('gulp-mocha');
const rollup = require('rollup-stream');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const touch = require('touch');
const uglify = require('rollup-plugin-uglify');

// For Mocha testing
require('babel-register')({
  babelrc: false,
  presets: ['es2015'],
});

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
    plugins: [
      babel({
        exclude: 'node_modules/**',
      }),
      options.min ? uglify({
        mangle: false,
        compress: { keep_fargs: false },
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
    minify: true,
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

gulp.task('test-watch', watch('test'));
gulp.task('lint-watch', watch('lint'));

gulp.task('compile', ['build', 'build-cjs', 'minify']);

gulp.task('default', ['test', 'lint', 'compile']);
