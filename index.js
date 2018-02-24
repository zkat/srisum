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
  .usage('Usage: $0 [OPTION]... [FILE]...')
  .option('algorithms', {
    alias: 'a',
    type: 'array',
    describe: 'hash algorithms to generate for the FILEs',
    default: ['sha512']
  })
  .option('digest-only', {
    alias: 'd',
    type: 'boolean',
    describe: 'print digests only, without the filename'
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

function compute (argv) {
  const files = argv._.length ? argv._ : ['-']
  const results = Promise.all(files.map(f => hashFile(f, argv)))
  results.then(results => {
    let exit = 0
    results.forEach(res => {
      if (res.integrity && argv.digestOnly) {
        console.log(res.integrity.toString())
      } else if (res.integrity) {
        console.log(`${res.integrity} ${res.file}`)
      } else {
        exit = 1
        res.error && console.error(res.error.message)
      }
    })
    process.exit(exit)
  }).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}

function hashFile (f, argv) {
  return ssri.fromStream(fileStream(f), {
    algorithms: argv.algorithms,
    options: argv.options,
    strict: argv.strict
  }).then(
    integrity => integrity.toString().split(/\s+/).length
    ? {integrity, file: f}
    : {error: new Error(`Valid SRI digest could not be generated for ${f}`)}
  ).catch(error => ({error}))
}

function check (argv) {
  const files = argv._.length ? argv._ : ['-']
  const stats = {
    badLines: 0,
    badChecksums: 0,
    missingFiles: 0
  }
  const results = Promise.all(
    files.map(f => processDigestLines(argv, stats, f))
  )
  results.catch(err => {
    outputWarnings(argv, stats)
    console.error(`${argv.$0}: ERROR: ${err.message}`)
    process.exit(1)
  }).then(results => {
    !argv.status && results.forEach(lines => {
      lines.forEach(l => {
        if (!l.err && !argv.quiet) {
          console.log(`${l.file}: OK (${l.hash.algorithm})`)
        } else if (l.err) {
          if (l.err.code === 'EINTEGRITY') {
            stats.badChecksums++
            console.error(`${l.file}: FAILED`)
          } else if (l.err.code === 'ENOENT' && !argv.ignoreMissing) {
            stats.missingFiles++
            console.error(`${argv.$0}: ${l.file}: No such file or directory`)
            console.log(`${l.file}: FAILED open or read`)
          } else if (l.err.code !== 'ENOENT' && !argv.ignoreMissing) {
            console.error(`${argv.$0}: ${l.file}: ${l.err.message}`)
            console.log(`${l.file}: FAILED ${l.err.code}`)
          }
        }
      })
    })
    outputWarnings(argv, stats)
    if (
      stats.badLines ||
      stats.badChecksums ||
      (!argv.ignoreMissing && stats.missingFiles)) {
      process.exit(1)
    } else {
      process.exit(0)
    }
  })
}

function processDigestLines (argv, stats, digestFile) {
  return new Promise((resolve, reject) => {
    const promises = []
    const stream = fileStream(digestFile).on('error', reject).pipe(
      split(/\r?\n/, null).on('error', reject)
    )
    stream.on('data', line => {
      if (!line) {
        // Ignore empty lines
        return
      }
      const match = line.match(/^(.*)\s+(\S+)$/)
      const integrity = match && ssri.parse(match[1], {
        strict: argv.strict
      })
      if (digestFile === '-' && match[2] === '-') {
        return promises.push(
          Promise.resolve({file: '-', err: {code: 'EINTEGRITY'}})
        )
      } else if (integrity && integrity.toString().length) {
        const checkFile = fileStream(match[2])
        promises.push(
          ssri.checkStream(checkFile, integrity).then(hash => {
            return {file: match[2], hash}
          }).catch(err => {
            return {file: match[2], err}
          })
        )
      } else {
        stats.badLines++
      }
    }).on('end', () => resolve(Promise.all(promises)))
  })
}

function outputWarnings (argv, stats) {
  if (argv.status) {
    // silence
    return
  }
  if (argv.warn && stats.badLines) {
    console.error(`${argv.$0}: WARNING: ${
      stats.badLines
    } line${
      stats.badLines > 1 ? 's are' : ' is'
    } improperly formatted or invalid`)
  }
  if (!argv.ignoreMissing && stats.missingFiles) {
    console.error(`${argv.$0}: WARNING: ${
      stats.missingFiles
    } listed file${
      stats.missingFiles > 1 ? 's' : ''
    } could not be read`)
  }
  if (stats.badChecksums) {
    console.error(`${argv.$0}: WARNING: ${
      stats.badChecksums
    } computed checksum${
      stats.badChecksums > 1 ? 's' : ''
    } did NOT match`)
  }
}

function fileStream (f) {
  return f === '-' ? process.stdin : fs.createReadStream(f)
}
