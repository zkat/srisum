'use strict'

const BB = require('bluebird')

const execAsync = BB.promisify(require('child_process').exec, {
  multiArgs: true
})
const ssri = require('ssri')
const Tacks = require('tacks')
const tap = require('tap')
const test = tap.test

const CACHE = require('./util/test-dir')(__filename)
const Dir = Tacks.Dir
const File = Tacks.File

const srisumPath = require.resolve('..')
function srisum () {
  return execAsync(`node ${srisumPath} ${[].join.call(arguments, ' ')}`, {
    cwd: CACHE
  })
}

test('basic checking', t => {
  const sri = ssri.fromData('foo')
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo'),
    'foo.txt.sri': File(`${sri} foo.txt\n`)
  }))
  fixture.create(CACHE)
  return srisum('-c', 'foo.txt.sri').spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      'foo.txt: OK (sha512)\n',
      'verification success reported to stdout'
    )
  })
})

test('checks multiple files from a checksum file', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo'),
    'bar.txt': File('bar'),
    'foo.txt.sri': File([
      `${ssri.fromData('foo')} foo.txt`,
      `${ssri.fromData('bar')} bar.txt`,
      ''
    ].join('\n'))
  }))
  fixture.create(CACHE)
  return srisum('-c', 'foo.txt.sri').spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      'foo.txt: OK (sha512)\nbar.txt: OK (sha512)\n',
      'verification success reported to stdout'
    )
  })
})

test('handles checksum file from stdin')
test('checks stdin')
test('--strict')

test('errors on checksum failure', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo'),
    'bar.txt': File('bar!'),
    'foo.txt.sri': File([
      `${ssri.fromData('foo')} foo.txt`,
      `${ssri.fromData('bar')} bar.txt`,
      ''
    ].join('\n'))
  }))
  fixture.create(CACHE)
  return srisum('-c', 'foo.txt.sri').spread(() => {
    throw new Error('unexpected success')
  }).catch(err => {
    t.equal(err.code, 1, 'non-zero exit code')
    t.match(err.message, /bar.txt: FAILED/, 'failure reported')
  })
})

test('handles multiple checksum files', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo'),
    'bar.txt': File('bar'),
    'foo.txt.sri': File(`${ssri.fromData('foo')} foo.txt`),
    'bar.txt.sri': File(`${ssri.fromData('bar')} bar.txt`)
  }))
  fixture.create(CACHE)
  return srisum('-c', 'foo.txt.sri', 'bar.txt.sri').spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      'foo.txt: OK (sha512)\nbar.txt: OK (sha512)\n',
      'verification success reported to stdout'
    )
  })
})

test('errors on missing files', t => {
  const fixture = new Tacks(Dir({
    'bar.txt': File('bar'),
    'foo.txt.sri': File([
      `${ssri.fromData('foo')} foo.txt`,
      `${ssri.fromData('bar')} bar.txt`,
      ''
    ].join('\n'))
  }))
  fixture.create(CACHE)
  return srisum('-c', 'foo.txt.sri').spread((stdout, stderr) => {
    throw new Error('unexpected success')
  }).catch(err => {
    t.equal(err.code, 1, 'non-zero exit code')
    t.match(
      err.message,
      /foo\.txt: No such file or directory/,
      'missing file reported'
    )
    t.match(
      err.message,
      /WARNING: 1 listed file could not be read/,
      'warning written to stderr'
    )
  })
})

test('--ignore-missing', t => {
  const fixture = new Tacks(Dir({
    'bar.txt': File('bar'),
    'foo.txt.sri': File([
      `${ssri.fromData('foo')} foo.txt`,
      `${ssri.fromData('bar')} bar.txt`,
      ''
    ].join('\n'))
  }))
  fixture.create(CACHE)
  return srisum(
    '-c', 'foo.txt.sri', '--ignore-missing'
  ).spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      'bar.txt: OK (sha512)\n',
      'verification success reported to stdout'
    )
  })
})

test('--warn')
