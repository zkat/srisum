# srisum(1) - compute and check subresource integrity digests


## SYNOPSIS

`srisum [OPTION]... [FILE]...`

## INSTALL

`npm install --save [-g] srisum`

## DESCRIPTION

Print or check [Subresource Integrity digests](https://w3c.github.io/webappsec/specs/subresourceintegrity/)

`srisum`'s API is based on the `SHA[N]SUM(1)` family of unix utilities.

With no `FILE` or when `FILE` is `-`, read standard input.

`-c, --check` - read SRI sums from the FILEs and check them

`--help` - display help and exit

`--version` - output version information and exit

## The following options are useful only when verifying integrity:

`--ignore-missing` - don't fail or report status for missing files

`--quiet` - don't print OK for each successfully verified file

`--status` - don't output anything, status code shows success

`--strict` - exit non-zero for lines that fail strict SRI format

`-w, --warn` - warn about improperly formatted SRI lines

When checking, the input should be a former output of this program. The default mode is to print line with space-separated SRI digests, one more space, and a name for each FILE.

## AUTHOR

Written by [Kat Marchan](https://github.com/zkat)

## REPORTING BUGS

Please file any relevant issues [on Github.](https://github.com/zkat/srisum)

## LICENSE

This work is released by its authors into the public domain under CC0-1.0. See `LICENSE.md` for details.

## SEE ALSO

* `shasum(1)`
* `sha1sum(1)`
