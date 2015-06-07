# gcr

[![Build Status](https://travis-ci.org/evanlucas/gcr.svg?branch=master)](https://travis-ci.org/evanlucas/gcr)


*A node [gitlab-ci-runner](https://github.com/gitlabhq/gitlab-ci-runner)*

## Install

```bash
$ npm install -g gcr
```

## Usage

The first time you run `gcr`, just run `gcr` without a token.  It will prompt your for your registration token and will then generate your CI token.

```bash
$ gcr --help

gcr - a gitlab ci runner

    Usage:

      gcr [options]

    Options:

      -h, --help                  show help and usage
      -l, --loglevel <level>      set log level
      -v, --version               show version
      -u, --url <url>             set ci server url
      -t, --token <token>         set registration token
      -T, --timeout <number>      set global test timeout in seconds
      -b, --buildDir <dir>        set the build directory
      -s, --strictSSL             enable/disable strict ssl
      -n, --npm                   run npm install/test if no commands are present
      -k, --keypath <path>        specify path to rsa key
```

## Why?

I wanted something that was really easy to install (`npm install -g gcr`)

## License

MIT (See `LICENSE` for more info)

## Thanks

Thanks to the [GitLab](http://gitlab.org) team for all of their effort on GitLab/GitLab CI.

## Notes

On launch, if a rsa key does not exist (named `gcr.pub`), then one will automatically be created.  `gcr` will then ask for your GitLab CI Coordinator URL as well as your Registration Token.  The directory in which projects are built defaults to `/tmp/builds`.  If you would like to change that, then simply run `gcr --buildDir <dir>` and that will be saved.

gcr remembers your config by adding a json file to `~/.config/gcr.js`
