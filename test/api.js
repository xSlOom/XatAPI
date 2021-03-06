'use strict'

const API_PATH = '../source/xat'

const assert = require('assert')
const url = require('url')

const proxyquire = require('proxyquire')

const { makeRequestStub, getFile } = require('../source/test-helpers')

const xatapi = require(API_PATH)

const users = [
{
  id: 42,
  reg: 'Xat',
},
{
  id: 110110,
  reg: 'SlOom',
}]

describe('getRegname', () => {
  for (const user of users) {
    it(`should return regname of ${user.id}`, (done) => {
      xatapi.getRegname(user.id, (err, res) => {
        assert.equal(user.reg.toLowerCase(), res.toLowerCase())
        done()
      })
    })
  }

  it('should fail on non-number arg', (done) => {
    xatapi.getRegname('foo', (err, res) => {
      assert(err.message.indexOf('numeric') >= 0)
      done()
    })
  })

  it("should fail when id doesn't exists", (done) => {
    xatapi.getRegname(2000000000, (err, res) => {
      assert(err.message.indexOf('found') >= 0)
      done()
    })
  })

  it("shouldn't be synchronous", (done) => {
    let state = 1
    xatapi.getRegname('foo', (err, res) => {
      assert.equal(2, state)
      done()
    })

    state = 2
  })
})

describe('getID', () => {
  for (const user of users) {
    it(`should return id of ${user.reg}`, (done) => {
      xatapi.getID(user.reg, (err, res) => {
        assert.equal(user.id, res)
        done()
      })
    })
  }

  it("should fail when regname doesn't exists", (done) => {
    xatapi.getID('xx', (err, res) => {
      const message = err.message
      assert(message.indexOf('found') >= 0)
      done()
    })
  })

  for (const user of users) {
    it(`should be case insensitive for ${user.reg}`, (done) => {
      xatapi.getID(user.reg.toLowerCase(), (err, res) => {
        assert.equal(user.id, res)
        done()
      })
    })
  }
})

describe('getChatInfo', () => {
  const chats = [{
    name: 'chat',
    id: 123,
  }, {
    name: 'xat123',
    id: 123,
  }, {
    name: '123',
    id: 2582056,
  }]

  const persistentChat = {
    id: 218938818,
    name: '13372281',
    desc: 'nothing special, just numerical',
    background: 'http://xat.com/web_gear/background/xat_stars.jpg',
    language: null,
    radio: null,
    buttons: null,
  }

  for (const chat of chats) {
    it(`should return info about group ${chat.name}`, (done) => {
      xatapi.getChatInfo(chat.name, (err, res) => {
        assert.equal(chat.id, res.id)
        done()
      })
    })
  }

  it('should fetch appropriate info about just created group', (done) => {
    xatapi.getChatInfo(persistentChat.name, (err, res) => {
      assert.equal(persistentChat.id, res.id)
      assert.equal(persistentChat.desc, res.Desc)
      assert.equal(persistentChat.name, res.Name)
      assert.equal(persistentChat.background, res.Cinfo.Background)
      assert.equal(persistentChat.language, res.Cinfo.Language)
      assert.equal(persistentChat.radio, res.Cinfo.Radio)
      assert.equal(persistentChat.buttons, res.Cinfo.Buttons)
      done()
    })
  })
})

describe('getNewInfo', () => {
  it('should return correct result when last power is lovetest', (done) => {
    const request = makeRequestStub(({ uri }, cb) => {
      getFile('./getNewInfo.json', (res) => {
        cb(null, res.toString('utf8'))
      })
    })

    const xatapi = proxyquire(API_PATH, { request })

    xatapi.getNewInfo((err, res) => {
      assert.equal(null, err)
      assert.equal(427, res.id)
      assert.equal('lovetest', res.name)
      assert.equal('LIMITED', res.status)
      assert.deepEqual(['lovetest'], res.topsh)
      assert.deepEqual(['ht'], res.pawns)

      done()
    })
  })

  it('should pass this error to caller when request returns error', (done) => {

    const error = new Error('')
    const request = makeRequestStub((options, cb) => cb(error))

    const xatapi = proxyquire(API_PATH, { request })

    xatapi.getNewInfo((err, res) => {
      assert.equal(error, err)
      done()
    })
  })
})

describe('getChatConnection', () => {
  it('should return correct result when getting '
    + 'connection info of chat 123', (done) => {
    getFile('./illuxat-chatconnexion-123.json', (res) => {
      const json = JSON.parse(res)

      const request = makeRequestStub(({ uri }, cb) => {
        assert.equal(json.id, url.parse(uri, true).query.roomid)

        cb(null, JSON.stringify(json))
      })

      const xatapi = proxyquire(API_PATH, { request })

      xatapi.getChatConnection(123, (err, res) => {
        assert.equal(null, err)

        assert.equal(json.ip, res.ip)
        assert.equal(json.port, res.port)
        assert.equal(json.ctout, res.timeout)

        done()
      })
    })
  })

  // Only we can do is to test some expectations
  it('should return result when interacting with remote API', (done) => {
    xatapi.getChatConnection(123, (err, res) => {
      assert.equal(null, err)

      assert.equal('object', typeof(res))

      assert.equal('string', typeof(res.ip))

      const port = res.port
      assert.equal('number', typeof(port))
      assert(port >= 0 && port <= 65535)

      assert.equal('number', typeof(res.timeout))

      done()
    })
  })

  const shouldError = [
    2e10, // api returns info about chat 2^31 - 1 instead
    2e12, // api returns empty array instead
    2e20, // OK!
  ]

  for (const chat of shouldError) {
    it(`should return error when getting info about chat ${chat}`, (done) => {
      xatapi.getChatConnection(chat, (err, res) => {
        assert.notEqual(null, err)

        done()
      })
    })
  }
})

describe('getNewUser', () => {
  it('should return result when server returns valid user', (done) => {
    const auser3 = '&UserId=1521378774&k1=invalidated&k2=123456'
    const parsed = url.parse('?' + auser3, true).query

    const request = makeRequestStub((_, cb) => cb(null, auser3))

    const xatapi = proxyquire(API_PATH, { request })

    xatapi.getNewUser((err, res) => {
      assert.equal(null, err)

      assert.equal(parsed.UserId, res.id)
      assert.equal(parsed.k1, res.k1)
      assert.equal(parsed.k2, res.k2)

      done()
    })
  })

  it('should return error when server returns invalid user', (done) => {
    const request = makeRequestStub((_, cb) =>
      cb(null, '&UserId=2123456789&k1=xxxxxxxx&k2=0'))

    const xatapi = proxyquire(API_PATH, { request })

    xatapi.getNewUser((err) => {
      assert.notEqual(null, err)

      assert(/refused/i.test(err.message))

      done()
    })
  })

  it('should return error when server returns invalid response', (done) => {
    const request = makeRequestStub((_, cb) =>
      cb(null, '<html><body>Hello!</body></html>'))

    const xatapi = proxyquire(API_PATH, { request })

    xatapi.getNewUser((err) => {
      assert.notEqual(null, err)
      assert(/service/i.test(err.message))

      done()
    })
  })
})
