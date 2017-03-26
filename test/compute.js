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

test('basic compute', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo')
  }))
  fixture.create(CACHE)
  return srisum('foo.txt').spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      ssri.fromData('foo') + ' foo.txt\n',
      'stdout received correct sri digest line'
    )
  })
})

test('compute errors if file is missing', t => {
  return srisum('foo.txt').spread(() => {
    throw new Error('this should not have happened')
  }).catch(err => {
    t.equal(err.code, 1, 'non-zero exit code')
    t.match(err.message, /no such file or directory/, 'error message useful')
  })
})

test('compute multiple algorithms', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo')
  }))
  fixture.create(CACHE)
  return srisum(
    'foo.txt -a sha256 sha384 sha512'
  ).spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(
      stdout,
      ssri.fromData('foo', {
        algorithms: ['sha256', 'sha384', 'sha512']
      }) + ' foo.txt\n',
      'stdout received correct sri digest line'
    )
  })
})

test('compute multiple files', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo'),
    'bar.js': File('bar\n'),
    'baz.css': File('baz')
  }))
  fixture.create(CACHE)
  return srisum('foo.txt bar.js baz.css').spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.equal(stdout, [
      ssri.fromData('foo') + ' foo.txt',
      ssri.fromData('bar\n') + ' bar.js',
      ssri.fromData('baz') + ' baz.css',
      ''
    ].join('\n'),
    'stdout received one line per entry')
  })
})

test('compute adds options', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo')
  }))
  fixture.create(CACHE)
  return srisum(
    'foo.txt --options foo bar baz'
  ).spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.match(stdout, /\?foo\?bar\?baz foo.txt/, 'options are there')
    t.equal(
      stdout,
      ssri.fromData('foo', {
        options: ['foo', 'bar', 'baz']
      }) + ' foo.txt\n',
      'generated line matched expected'
    )
  })
})

test('compute from stdin', t => {
  return BB.fromNode(cb => {
    const child = require('child_process').exec(`node ${srisumPath}`, {
      cwd: CACHE
    }, cb)
    child.stdin.write('foo', () => child.stdin.end())
  }).then(stdout => {
    t.equal(
      stdout,
      ssri.fromData('foo') + ' -\n',
      'generated digest from stdin'
    )
  }).then(() => {
    const fixture = new Tacks(Dir({
      'foo.txt': File('foo')
    }))
    fixture.create(CACHE)
    return BB.fromNode(cb => {
      const child = require(
        'child_process'
      ).exec(`node ${srisumPath} - foo.txt`, {
        cwd: CACHE
      }, cb)
      child.stdin.write('bar', () => child.stdin.end())
    }).then(stdout => {
      t.equal(stdout, [
        ssri.fromData('bar') + ' -',
        ssri.fromData('foo') + ' foo.txt',
        ''
      ].join('\n'), '- interpreted as stdin for input files')
    })
  })
})

test('compute using strict rules', t => {
  const fixture = new Tacks(Dir({
    'foo.txt': File('foo')
  }))
  fixture.create(CACHE)
  return srisum(
    'foo.txt --strict -a md5 sha1 sha256 sha384 sha512 whirlpool'
  ).spread((stdout, stderr) => {
    t.equal(stderr, '', 'no output on stderr')
    t.match(stdout, /sha256.*sha384.*sha512/, 'standard hashes present')
    t.equal(
      stdout,
      ssri.fromData('foo', {
        algorithms: ['sha256', 'sha384', 'sha512']
      }) + ' foo.txt\n',
      'output restricted to specced algorithms'
    )
  })
})
