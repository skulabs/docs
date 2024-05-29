# SKULabs Docs powered by Mintlify

### Warning 🚨

Once you push the changes in this repo to the ```main``` branch, it will go live to production at https://skulabs.com/api ... so be careful!

### Pushing latest OpenAPI SKULabs Updates

To get the latest changes you have a few options... There is a quick build process that must take place after you update the OpenAPI spec on a given environment. The build process automatically generates mdx files and updates the mint.json file accordingly.

#### npm run build

This builds against https://api.skulabs.com/openapi

#### npm run build_next

This builds against https://api-next.skulabs.com/openapi

#### npm run build_local

This builds against http://localhost:3001/s/api/openapi

### Previewing Changes Locally

Once you run the build, you can preview the changes. ```mintlify dev``` is the easiest way to view your changes.

Here's how to get started with the mintlify CLI...

#### Install the CLI

Install the [Mintlify CLI](https://www.npmjs.com/package/mintlify) to preview the documentation changes locally. To install, use the following command

```
npm i -g mintlify
```

#### Run the command

Run the following command at the root of your documentation (where mint.json is). It will give you the URL that you can view the changes locally

```
mintlify dev
```

### Publishing Changes to Production

_From Mintlify_

Install the Mintlify GitHub App to autopropagate changes from youre repo to your deployment. Changes will be deployed to production automatically after pushing to the default branch. Find the link to install on your dashboard.

(Note: this is already done, but right now only @DevBrent can push changes.)

#### Troubleshooting

- Mintlify dev isn't running - Run `mintlify install` it'll re-install dependencies.
- Page loads as a 404 - Make sure you are running in a folder with `mint.json`