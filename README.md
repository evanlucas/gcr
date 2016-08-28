# gcr

[![Build Status](https://travis-ci.org/evanlucas/gcr.svg?branch=master)](https://travis-ci.org/evanlucas/gcr)


*A node [gitlab-ci-runner](https://github.com/gitlabhq/gitlab-ci-runner)*

`gcr` v4.x will only support node v4.x+. To use `gcr` with an older version
of node, please use `gcr` v3.x

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
      -C, --sslcert <path>        enable/disable strict ssl
      -K, --sslkey <path>         run npm install/test if no commands are present
      -A, --cacert <path>         specify path to rsa key
```

## Execution Notes

On launch, if a rsa key does not exist (named `gcr.pub`), then one will automatically be created.  `gcr` will then ask for your GitLab CI Coordinator URL as well as your Registration Token.  The directory in which projects are built defaults to `/tmp/builds`.  If you would like to change that, then simply run `gcr --buildDir <dir>` and that will be saved.

gcr remembers your config by adding a json file to `~/.config/gcr.js`

## Why?

I wanted something that was really easy to install (`npm install -g gcr`)

## License

MIT (See `LICENSE` for more info)

## Thanks

Thanks to the [GitLab](http://gitlab.org) team for all of their effort on GitLab/GitLab CI.

# gcr is an [OPEN Open Source Project](http://openopensource.org/)

-----------------------------------------

## What?

Individuals making significant and valuable contributions are given
commit-access to the project to contribute as they see fit. This project
is more like an open wiki than a standard guarded open source project.

## Rules

There are a few basic ground-rules for contributors:

1. **No `--force` pushes** or modifying the Git history in any way.
1. **Non-master branches** ought to be used for ongoing work.
1. **External API changes and significant modifications** ought to be subject to an **internal pull-request** to solicit feedback from other contributors.
1. Internal pull-requests to solicit feedback are *encouraged* for any other non-trivial contribution but left to the discretion of the contributor.
1. Contributors should attempt to adhere to the prevailing code-style.

## Releases

Declaring formal releases remains the prerogative of the project maintainer.
