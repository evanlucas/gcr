# gcr

*A node [gitlab-ci-runner](https://github.com/gitlabhq/gitlab-ci-runner)*

## Install

```bash
$ npm install -g gcr
```

## Usage

The first time you run `gcr`, just run `gcr` without a token.  It will prompt your for your registration token and will then generate your CI token.

```bash
$ gcr --help

gcr

   Usage:

     gcr [options]

   Options:

     -h, --help                  Show help and usage
     -l, --loglevel <level>      Set log level
     -v, --version               Show version
     -u, --url <url>             Set CI Server URL
     -t, --token <token>         Set Registration Token
     -T, --timeout <number>      Set the timeout in seconds
     -b, --buildDir <dir>        Set the builds directory
     -s, --strictSSL             Strict SSL
     -n, --npm                   Run npm install/test if no commands are present
```

## Why?

I wanted something that was really easy to install (`npm install -g gcr`)

## License

MIT

## Thanks

Thanks to the [GitLab](http://gitlab.org) team for all of their effort on GitLab/GitLab CI.

## Notes

On launch, if a rsa key does not exist (named `gcr.pub`), then one will automatically be created.  `gcr` will then ask for your GitLab CI Coordinator URL as well as your Registration Token.  The directory in which projects are built defaults to `/tmp/builds`.  If you would like to change that, then simply run `gcr --buildDir <dir>` and that will be saved.
