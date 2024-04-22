if (typeof require != 'undefined') {

const _ = require('lodash');
const gulp = require('gulp');
const rimraf = require('gulp-rimraf');
const shell = require('gulp-shell');
const path = require('path');
const fs = require('fs');

gulp.task('clean', function () {
  return gulp.src(['./api-docs/*', '!./api-docs/overview.mdx'], { read: false })
    .pipe(rimraf());
});

gulp.task('generate', shell.task('npx @mintlify/scraping@latest openapi-file openapi.json -o api-docs'));

gulp.task('fix_json', function (cb) {
  // Function to read directory and build array
  function buildArray(directoryPath) {
    let result = [];

    // Read directory
    const directories = fs.readdirSync(directoryPath);

    // Loop through each directory
    directories.forEach((dir) => {
        const group = _.startCase(dir).replace(/oauth/gi, 'OAuth');

        if (fs.statSync(path.join(directoryPath, dir)).isFile()) {
          return;
        }

        // Read files within the directory
        const files = fs.readdirSync(path.join(directoryPath, dir));

        // Filter out non-directories and build pages array
        const pages = files
          .filter((file) => fs.statSync(path.join(directoryPath, dir, file)).isFile())
          .map((file) => path.join('api-docs', dir, path.parse(file).name));

        // Add group and pages to result array
        result.push({ group, pages });
      });

    return result;
  }

  // read the mint.json file
  const mint_json = fs.readFileSync(path.join(__dirname, 'mint.json'));
  const mint = JSON.parse(mint_json);

  // Build the array
  const array_by_files = buildArray(path.join(__dirname, 'api-docs'));
  mint.navigation = mint.navigation.filter((nav) => {
    var has_pages = nav.pages.filter(p => !p.match(/^api-docs\//gi));
    return !nav.pages || (nav?.pages && Array.isArray(nav.pages) && has_pages.length > 0);
  });

  mint.navigation = mint.navigation.concat(array_by_files);

  fs.writeFileSync(path.join(__dirname, 'mint.json'), JSON.stringify(mint, null, 2));

  cb();
});

gulp.task('watch', function () {
  gulp.watch(['openapi.json'], gulp.series('clean', 'generate', 'fix_json'));
});

gulp.task('default', gulp.series('clean', 'generate', 'fix_json'));

}