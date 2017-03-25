#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const split = require('split')
const ssri = require('ssri')
const yargs = require('yargs')

main(parseArgs())

function parseArgs () {
  return yargs
  .usage('Usage: $0 [OPTION]... [FILE...]')
  .normalize('_')
  .option('algorithms', {
    alias: 'a',
    type: 'array',
    describe: 'hash algorithms to generate for the FILEs',
    default: ['sha512']
  })
  .option('strict', {
    alias: 's',
    type: 'boolean',
    describe: 'limit digests to a strict interpretation of the SRI spec'
  })
  .option('options', {
    alias: 'o',
    type: 'array',
    describe: 'option strings to include with generated digests',
    default: []
  })
  .option('check', {
    alias: 'c',
    type: 'boolean',
    describe: 'read SRI checksums from the FILEs and check them'
  })
  .option('ignore-missing', {
    type: 'boolean',
    describe: 'don\'t fail or report status for missing files'
  })
  .option('quiet', {
    type: 'boolean',
    describe: 'don\'t print OK for each successfully verified file'
  })
  .option('status', {
    type: 'boolean',
    describe: 'don\'t output anything, status code shows success'
  })
  .option('warn', {
    alias: 'w',
    type: 'boolean',
    describe: 'warn about improperly formatted checksum lines'
  })
  .help('h')
  .alias('h', 'help')
  .version(() => require('./package.json').version)
  .alias('version', 'v')
  .argv
}

function main (argv) {
  argv._ = argv._.map(path.normalize)
  if (argv.check) {
    return check(argv)
  } else {
    return compute(argv)
  }
}

function check (argv) {
  const files = argv._.length ? argv._ : [null]
  let badLines = 0
  let badChecksums = 0
  let missingFiles = 0
  function outputWarnings () {
    if (argv.status) {
      // silence
      return
    }
    if (argv.warn && badLines) {
      console.error(`${argv.$0}: WARNING: ${badLines} line${badLines > 1 ? 's are' : ' is'} improperly formatted or invalid`)
    }
    if (!argv.ignoreMissing && missingFiles) {
      console.error(`${argv.$0}: WARNING: ${missingFiles} listed file${missingFiles > 1 ? 's' : ''} could not be read`)
    }
    if (badChecksums) {
      console.error(`${argv.$0}: WARNING: ${badChecksums} computed checksum${badChecksums > 1 ? 's' : ''} did NOT match`)
    }
  }
  Promise.all(
    files.map(f => {
      return new Promise((resolve, reject) => {
        const stream = f == null ? process.stdin : fs.createReadStream(f)
        stream.on('error', reject)
        const promises = []
        stream.pipe(split(/\r?\n/, null, {trailing: false})).on('error', reject).on('data', line => {
          const match = line.match(/^(.*)\s+(\S+)$/)
          const integrity = match && ssri.parse(match[1], {
            strict: argv.strict
          })
          if (f == null && match && match[2] === '-') {
            promises.push(Promise.resolve(`-: FAILED`))
          }
          if (match && integrity.toString().length) {
            const fileStream = match[2] === '-'
            ? process.stdin
            : fs.createReadStream(match[2])
            promises.push(
              ssri.checkStream(fileStream, integrity).then(algo => {
                return {file: match[2], algorithm: algo}
              }).catch(err => {
                return {file: match[2], err}
              })
            )
          } else {
            badLines++
          }
        }).on('end', () => resolve(Promise.all(promises)))
      })
    })
  ).catch(err => {
    outputWarnings()
    console.error(`${argv.$0}: ERROR: ${err.message}`)
    process.exit(1)
  }).then(results => {
    !argv.status && results.forEach(lines => {
      lines.forEach(l => {
        if (!l.err && !argv.quiet) {
          console.log(`${l.file}: OK (${l.algorithm})`)
        } else if (l.err) {
          if (l.err.code === 'EBADCHECKSUM') {
            badChecksums++
            console.error(`${l.file}: FAILED`)
          } else if (l.err.code === 'ENOENT' && !argv.ignoreMissing) {
            missingFiles++
            console.error(`${argv.$0}: ${l.file}: No such file or directory`)
            console.log(`${l.file}: FAILED open or read`)
          } else {
            console.error(`${argv.$0}: ${l.file}: ${l.err.message}`)
            console.log(`${l.file}: FAILED ${l.err.code}`)
          }
        }
      })
    })
    outputWarnings()
    if (badLines || badChecksums) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  })
}

function compute (argv) {
  const files = argv._.length ? argv._ : [null]
  Promise.all(
    files.map(f => {
      const stream = f == null ? process.stdin : fs.createReadStream(f)
      return ssri.fromStream(stream, {
        algorithms: argv.algorithms,
        options: argv.options,
        strict: argv.strict
      }).then(
        integrity => integrity.toString().split(/\s+/).length
        ? `${integrity} ${f || '-'}`
        : new Error(`Valid SRI digest could not be generated for ${f}`)
      ).catch(err => err)
    })
  ).then(lines => {
    let exit = 0
    lines.forEach(l => {
      if (typeof l === 'string') {
        console.log(l)
      } else {
        exit = 1
        console.error(l.message)
      }
    })
    process.exit(exit)
  })
}
