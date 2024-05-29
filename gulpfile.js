if (typeof require != 'undefined') {

const _ = require('lodash');
const gulp = require('gulp');
const rimraf = require('gulp-rimraf');
const shell = require('gulp-shell');
const path = require('path');
const axios = require('axios');
const yargs = require('yargs').argv;
const fs = require('fs');

function sortObjectsByGroup(objects) {
  const order = [
    "Webhook",
    "Shipments",
    "Item",
    "Kit",
    "Warehouse",
    "Location",
    "Purchase Order",
    "Transfer Order",
    "Order",
    "Customer"
  ];

  return objects.sort((a, b) => {
    const indexA = order.indexOf(a.group);
    const indexB = order.indexOf(b.group);

    // If both groups are in the order array, sort them accordingly
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one group is in the order array, it should come first
    if (indexA !== -1) {
      return -1;
    }
    if (indexB !== -1) {
      return 1;
    }

    // If neither group is in the order array, keep their original order
    return 0;
  });
}

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

        // make the directory names pretty
        // prefer dashes over underscores
        if (dir.match(/_/g)) {
          fs.renameSync(path.join(directoryPath, dir), path.join(directoryPath, dir.replace(/_/g, '-')));
          dir = dir.replace(/_/g, '-');
        }

        // Read files within the directory
        const files = fs.readdirSync(path.join(directoryPath, dir));

        // Filter out non-directories and build pages array
        const pages = files
          .filter((file) => fs.statSync(path.join(directoryPath, dir, file)).isFile())
          .map((file) => {

            // if mintlify cli gave us an ugly filename
            // try and make it pretty
            let filename = file;
            let split_filename = filename.split('--');

            // this is definitely not pretty but it gets the job done
            // just really covers the "Page - Route Name" case
            if (split_filename.length > 1) {
              fs.renameSync(path.join('api-docs', dir, file), path.join(directoryPath, dir, split_filename[1]));
              filename = split_filename[1];
            }

            return path.join('api-docs', dir, path.parse(filename).name);
          });

        // Add group and pages to result array
        result.push({ group, pages });
      });

    return result;
  }

  // read the mint.json file
  const mint_json = fs.readFileSync(path.join(__dirname, 'mint.json'));
  const mint = JSON.parse(mint_json);

  // Build the array
  let array_by_files = buildArray(path.join(__dirname, 'api-docs'));

  // sort the array
  array_by_files = sortObjectsByGroup(array_by_files);

  mint.navigation = mint.navigation.filter((nav) => {
    var has_pages = nav.pages.filter(p => !p.match(/^api-docs\//gi));
    return !nav.pages || (nav?.pages && Array.isArray(nav.pages) && has_pages.length > 0);
  });

  mint.navigation = mint.navigation.concat(array_by_files);

  fs.writeFileSync(path.join(__dirname, 'mint.json'), JSON.stringify(mint, null, 2));

  cb();
});

gulp.task('change-last-updated', async function (cb) {

  const currentDate = new Date();

  const options = { month: 'long', day: 'numeric', year: 'numeric' };
  const formattedDate = currentDate.toLocaleString('en-US', options);

  const component_code = `export const LastUpdated = ({}) => (
      <div>Our API docs were last updated on ${formattedDate}.</div>
  );`;

  fs.writeFileSync(path.join(__dirname, './snippets/LastUpdated.mdx'), component_code);

  cb();
});

gulp.task('fetch', async function (cb) {
  let url = ''; // default to production

  switch (yargs.env) {
    case 'next':
      url = 'https://api-next.skulabs.com/openapi';
      break;

    case 'dev':
      url = 'http://localhost:3001/s/api/openapi';
      break;

    case 'production':
    default:
      url = 'https://api.skulabs.com/openapi';
      break;
  }

  console.log(`🔗 Fetching OpenAPI from: ${url}`);

  const response = await axios.get(url);

  if (response.data?.openapi) {
    console.log('✅ Valid OpenAPI response received');
  } else {
    console.error('❌ Invalid OpenAPI response received');
    throw Error('Validate that the OpenAPI response is correct.');
  }

  fs.writeFileSync(path.join(__dirname, './openapi.json'), JSON.stringify(response.data, null, 2));
  cb();
});

gulp.task('watch', function () {
  gulp.watch(['openapi.json'], gulp.series('clean', 'generate', 'fix_json'));
});

gulp.task('default', gulp.series('fetch', 'clean', 'generate', 'change-last-updated', 'fix_json'));

}