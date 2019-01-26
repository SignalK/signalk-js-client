import mdns from 'mdns'
import Client, { Client as NamedClient } from '../src'
import { assert } from 'chai'

describe('Signal K SDK', () => {
  describe.skip('mDNS server discovery', () => {
    it('... Emits an event when a Signal K host is found', done => {
      const client = new Client({
        reconnect: false,
        mdns
      })

      let isDone = false

      client.on('foundHost', host => {
        if (isDone === false) {
          done()
          isDone = true
        }
      })

      client.discover()
    }).timeout(15000)
  })

  describe('Subscriptions', () => {
    it('... Creates a subscription for navigation data', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      const opts = {
        context: 'vessels.self',
        subscribe: [{ path: 'navigation.position' }]
      }

      let isDone = false

      client.on('delta', data => {
        assert(data && typeof data === 'object' && data.hasOwnProperty('updates'))
        if (isDone === false) {
          done()
          isDone = true
        }
      })

      client
        .connect()
        .then(() => {
          return client.subscribe(opts)
        })
        .catch(err => done(err))
    }).timeout(30000)

    it('... Creates a subscription for all data', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      let isDone = false

      client.on('delta', data => {
        assert(data && typeof data === 'object' && data.hasOwnProperty('updates'))
        if (isDone === false) {
          done()
          isDone = true
        }
      })

      client
        .connect()
        .then(() => {
          return client.subscribe()
        })
        .catch(err => done(err))
    }).timeout(30000)

    it('... Stops receiving data after unsubscription', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      let isDone = false
      let receive = true

      client.on('delta', data => {
        if (isDone === true) {
          return
        }

        if (receive === false) {
          isDone = true
          done(new Error('Received delta after unsubscription'))
        }
      })

      client
        .connect()
        .then(() => {
          return client.subscribe()
        })
        .then(() => {
          receive = false
          return client.unsubscribe()
        })
        .then(() => {
          setTimeout(() => {
            if (isDone === false) {
              done()
            }
          }, 2000)
        })
        .catch(err => done(err))
    }).timeout(30000)
  })

  describe('REST API', () => {
    const client = new Client({
      hostname: 'demo.signalk.org',
      port: 80,
      useTLS: false,
      reconnect: false,
      autoConnect: true
    })

    const groups = [
      'communication', 'design', 'electrical',
      'environment', 'navigation', 'notifications',
      'performance', 'propulsion', 'sails', 'sensors',
      'steering', 'tanks'
    ]

    groups.forEach(group => {
      it(`... Fetches "self/${group}" successfully`, done => {
        client
          .API()
          .then(api => api[group]())
          .then(result => {
            assert(result && typeof result === 'object')
            done()
          })
          .catch(err => {
            // 404 means successful request, but the data isn't present on the vessel
            if (err.message.includes('404')) {
              return done()
            }

            done(err)
          })
      })
    })

    it('... Fetches meta data by path successfully', done => {
      client
        .API()
        .then(api => api.getMeta('vessels.self.navigation.position'))
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches position data by path successfully, using dot notation', done => {
      client
        .API()
        .then(api => api.get('vessels.self.navigation.position'))
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches position data by path successfully, using forward slashes', done => {
      client
        .API()
        .then(api => api.get('/vessels/self/navigation/position'))
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches server version successfully', done => {
      client
        .API()
        .then(api => api.version())
        .then(result => {
          assert(typeof result === 'string')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches the vessels\' "name" successfully', done => {
      client
        .API()
        .then(api => api.name())
        .then(result => {
          assert(typeof result === 'string')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "self" successfully', done => {
      client
        .API()
        .then(api => api.self())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "vessels" successfully', done => {
      client
        .API()
        .then(api => api.vessels())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "aircraft" successfully', done => {
      client
        .API()
        .then(api => api.aircraft())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "aton" successfully', done => {
      client
        .API()
        .then(api => api.aton())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "sar" successfully', done => {
      client
        .API()
        .then(api => api.sar())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches the vessel MRN successfully', done => {
      client
        .API()
        .then(api => api.mrn())
        .then(result => {
          assert(typeof result === 'string')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "sources" successfully', done => {
      client
        .API()
        .then(api => api.sources())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })

    it('... Fetches "resources" successfully', done => {
      client
        .API()
        .then(api => api.resources())
        .then(result => {
          assert(result && typeof result === 'object')
          done()
        })
        .catch(err => {
          // 404 means successful request, but the data isn't present on the vessel
          if (err.message.includes('404')) {
            return done()
          }

          done(err)
        })
    })
  })

  describe('Connection', () => {
    it('... Successfully closes the connection and any connection attempts when "disconnect" is called', done => {
      let client = new Client({
        hostname: 'hq.decipher.digital',
        port: 3000,
        useTLS: false,
        autoConnect: true
      })

      client.on('connect', () => {
        client.disconnect()
      })

      client.on('disconnect', () => {
        client = null
        done()
      })
    })

    it('... Reconnects after a fail or close until maxRetries is reached, at which point an event is emitted', done => {
      const client = new Client({
        hostname: 'poo.signalk.org',
        port: 80,
        useTLS: false,
        maxRetries: 10
      })

      client.on('hitMaxRetries', () => {
        assert(true)
        done()
      })

      client.connect().catch(() => {})
    }).timeout(60000)

    it('... Emits an "error" event after a failed connection attempt', done => {
      const client = new Client({
        hostname: 'poo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.on('error', () => {
        assert(true)
        done()
      })

      client.connect().catch(() => {})
    }).timeout(30000)

    it('... Emits a "connect" event after successful connection to demo.signalk.org', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.on('connect', () => {
        assert(true)
        done()
      })

      client.connect()
    }).timeout(30000)

    it('... Rejects the connect Promise after a failed connection attempt', done => {
      const client = new Client({
        hostname: 'poo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.connect().catch(() => {
        assert(true)
        done()
      })
    }).timeout(30000)

    it('... Resolves the connect Promise after successful connection to demo.signalk.org', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.connect().then(() => {
        assert(true)
        done()
      })
    }).timeout(30000)

    it('... Gets server connection info after successful connection to demo.signalk.org', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.on('connectionInfo', () => {
        assert(true)
        done()
      })

      client.connect()
    }).timeout(15000)

    it('... Gets vessel "self" MRN after successful connection to demo.signalk.org', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false
      })

      client.on('self', self => {
        assert(self === 'vessels.urn:mrn:signalk:uuid:c0d79334-4e25-4245-8892-54e8ccc8021d')
        done()
      })

      client.connect()
    }).timeout(15000)

    it('... Fails to get vessel in case of unauthenticated connection', done => {
      const client = new Client({
        hostname: 'hq.decipher.digital',
        port: 3000,
        useTLS: false,
        reconnect: false
      })

      client.on('connect', () => {
        client
          .API()
          .then(api => api.self())
          .then(result => {
            assert(result && typeof result === 'object' && result.hasOwnProperty('uuid'))
            done(new Error('Got data when we shouldn\'t be authenticated'))
          })
          .catch(err => {
            assert(err && typeof err === 'object' && typeof err.message === 'string' && err.message.includes('401'))
            done()
          })
      })

      client.connect()
    }).timeout(15000)
    
    it('... Successfully authenticates with correct username/password', done => {
      const client = new Client({
        hostname: 'hq.decipher.digital',
        port: 3000,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false
      })

      client.on('connect', () => {
        client
          .API()
          .then(api => api.self())
          .then(result => {
            assert(result && typeof result === 'object' && result.hasOwnProperty('uuid'))
            done()
          })
          .catch(err => done(err))
      })

      client.connect()
    }).timeout(15000)
    // */
  })

  describe('Module API', () => {
    it('... exports a Signal K Client as a named constant and the default export', done => {
      assert(Client === NamedClient)
      done()
    })

    it('... successfully instantiates a Client with default options', done => {
      const client = new Client()
      assert(client.options.hostname === 'localhost')
      assert(client.options.port === 3000)
      assert(client.options.useTLS === true)
      assert(client.options.version === 'v1')
      assert(client.options.autoConnect === false)
      done()
    })

    it('... instantiates a Client with custom options', done => {
      const client = new Client({ hostname: 'signalk.org' })
      assert(client.options.hostname === 'signalk.org')
      done()
    })

    it('... Client is an EventEmitter', done => {
      const client = new Client()
      assert(typeof client.on === 'function')
      done()
    })
  })
})
