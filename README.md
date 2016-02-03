# bower-npm-resolver

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

## Configuration

### .bowerrc

Add the resolver in your `.bowerrc` file:

```json
{
  "resolvers": [
    "bower-npm-resolver"
  ]
}
```

## Usage

Once configured, your bower.json files may reference packages using `npm/` prefix:

```json
{
  "dependencies": {
    "npm/package-name": "1.0.0"
  }
}
```

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
