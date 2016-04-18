# bower-npm-resolver

[![Build Status](https://travis-ci.org/mjeanroy/bower-npm-resolver.svg?branch=master)](https://travis-ci.org/mjeanroy/bower-npm-resolver)

A [custom Bower resolver](http://bower.io/docs/pluggable-resolvers/) supporting installation of NPM packages.
This resolver should be used if the package (or the version of the package you want to use) is not available on default
resolvers (bower registry, github, etc.).

## Installation

```bash
npm install -g bower-npm-resolver
```

Or, if you use bower locally:

```bash
npm install bower-npm-resolver
```

## Configuration and usage

### .bowerrc

Add the resolver in your `.bowerrc` file:

```json
{
  "resolvers": [
    "bower-npm-resolver"
  ]
}
```

Once configured, your bower.json files may reference packages using `npm+` prefix:

```json
{
  "dependencies": {
    "npm+foobar": "1.0.0",
    "other": "1.0.0"
  }
}
```

The resolver will match packages with `npm+` prefix, and strip the prefix prior to fetching from npm repo.
In the example above, `foobar` will be fetched from npm. `other` will not be matched by this resolver.

If this is not what you want, you can pass configuration parameters in `.bowerrc`.

If you use a private npm repository for all your company's packages, and they all start with a shared prefix,
you can change the prefix:

```json
{
  "resolvers": [
    "bower-npm-resolver"
  ],
  "bowerNpmResolver": {
    "matchPrefix": "mycompanynpmpackages-",
    "stripPrefix": false
  }
}
```

Then in your `bower.json`:

```json
{
  "dependencies": {
    "mycompanynpmpackages-foobar": "1.0.0",
    "other": "1.0.0"
  }
}
```

In the example above, `mycompanynpmpackages-foobar` will be fetched from npm. `other` will not be matched by this resolver.


## Features

This resolver will:
- Use NPM commands to get the version (and the list of available versions) to download.
- Download the tarball associated with the package and the version (you can see the tarball URL that will be used by typing: `npm view pkg@version dist.tarball`).
- Use NPM proxy configuration to download the tarball.
- Extract the tarball, this directory will be used by bower.

## Notes

If the package you download on NPM does not contains `bower.json`, you will not get the
transitive dependencies (and you will have to explicitly add then to your `bower.json` file).

## License

MIT License (MIT)

## Contributing

If you find a bug or think about enhancement, feel free to contribute and submit an issue or a pull request.

To work in TDD mode:

    npm install -g jasmine-node@2
    jasmine-node test --autoTest --watchFolders src
