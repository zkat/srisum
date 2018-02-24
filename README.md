[![npm](https://img.shields.io/npm/v/srisum.svg)](https://npm.im/srisum) [![license](https://img.shields.io/npm/l/srisum.svg)](https://npm.im/srisum) [![Travis](https://img.shields.io/travis/zkat/srisum.svg)](https://travis-ci.org/zkat/srisum) [![AppVeyor](https://ci.appveyor.com/api/projects/status/github/zkat/srisum?svg=true)](https://ci.appveyor.com/project/zkat/srisum) [![Coverage Status](https://coveralls.io/repos/github/zkat/srisum/badge.svg?branch=latest)](https://coveralls.io/github/zkat/srisum?branch=latest)

# srisum(1) -- compute and check subresource integrity digests

## SYNOPSIS

`srisum [OPTION]... [FILE]...`

## INSTALL

`npm install --save [-g] srisum`

## DESCRIPTION

Print or check Subresource Integrity digests.

Spec: https://w3c.github.io/webappsec/specs/subresourceintegrity/

`srisum`'s API is based on the `SHA[N]SUM(1)` family of unix utilities.

With no `FILE` or when `FILE` is `-`, read standard input.

`-a, --algorithms [ALGO]...` - hash algorithms to generate for the `FILE`s

`-s, --strict` - follow a strict interpretation of the SRI spec

`-o, --options [OPT]...` - append given `OPT` strings to generated digests

`-c, --check` - read SRI sums from the `FILE`s and check them

`-d, --digest-only` - only output the digest for each `FILE`, without filenames

`--help` - display help and exit

`--version` - output version information and exit

## The following options are useful only when verifying integrity:

`--ignore-missing` - don't fail or report status for missing files

`--quiet` - don't print OK for each successfully verified file

`--status` - don't output anything, status code shows success

`--strict` - exit non-zero for lines that fail strict SRI format

`-w, --warn` - warn about improperly formatted SRI lines

When checking, the input should be a former output of this program. The default mode is to print line with space-separated SRI digests, one more space, and a name for each FILE.

Strict mode, enabled with `--strict`, will entirely ignore digests (in input and output) that fail all of the following conditions:

* `algorithms` must be one or more of: `sha256`, `sha384`, `sha512`
* `options` must be visual characters except for `?`.
* digest strings must be valid `RFC4648` `Base64` strings.

## EXAMPLES

### Computing SRI Digests

For a single file:
```
$ srisum styles.css > styles.css.sri
```

For multiple different files:
```
$ srisum styles.css index.js package.json bundle.js > app.sri
```

From `stdin`:
```
$ cat styles.css | srisum -a sha1
sha1-hmkHOZdrfLUVOqpAgryfC8XNGtE -
```

Specify algorithms to generate:
```
$ srisum styles.css index.js --algorithms sha512 sha256 sha1 > styles.css.sri
```

Add options:
```
$ srisum styles.css -a sha1 --options releaser=Kat date=2017-01-01
sha1-hmkHOZdrfLUVOqpAgryfC8XNGtE=?releaser=kat?date=2017-01-01 styles.css
```

### Checking Integrity

Passing checksum file as an argument:
```
$ srisum -c styles.css.sri
styles.css: OK (sha512)
```

Passing multiple checksum files:
```
$ srisum -c styles.css.sri js-files.sri
styles.css: OK (sha512)
index.js: OK (sha512)
lib/util.js: OK (sha512)
```

Checksum file from `stdin`:
```
$ cat styles.css.sri | srisum -c
styles.css: OK (sha512)
```

Checksum `stdin` itself:
```
$ echo "hello" | srisum > stdin.sri
$ echo "hello" | srisum -c stdin.sri
-: OK (sha512)
```

## AUTHOR

Written by [Kat Marchan](https://github.com/zkat)

## REPORTING BUGS

Please file any relevant issues [on Github.](https://github.com/zkat/srisum)

## LICENSE

This work is released under the terms of the MIT license. For more details, see
the LICENSE file included with this distribution.

## SEE ALSO

* `shasum(1)`
* `sha1sum(1)`
