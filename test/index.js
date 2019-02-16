/**
 * @description   Tests for signalk-js-sdk. Also useful for spec-testing a SK server.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import mdns from 'mdns'
import Client, {
  Discovery,
  Client as NamedClient,
  PERMISSIONS_READONLY
} from '../src'
import { assert } from 'chai'
import { v4 as uuid } from 'uuid'

const isObject = (mixed, prop, propIsObject) => {
  const _isObj = mixed && typeof mixed === 'object'

  if (!_isObj) {
    return false
  }

  if (typeof prop === 'string' && typeof propIsObject === 'boolean') {
    const _propIsObj = mixed[prop] && typeof mixed[prop] === 'object'
    return _isObj && mixed.hasOwnProperty(prop) && _propIsObj === propIsObject
  }

  if (typeof prop === 'string') {
    return _isObj && mixed.hasOwnProperty(prop)
  }

  return _isObj
}

const TEST_SERVER_HOSTNAME =
  isObject(process, 'env', true) &&
  isObject(process.env, 'TEST_SERVER_HOSTNAME')
    ? process.env.TEST_SERVER_HOSTNAME
    : 'hq.decipher.digital'
const TEST_SERVER_PORT =
  isObject(process, 'env', true) && isObject(process.env, 'TEST_SERVER_PORT')
    ? process.env.TEST_SERVER_PORT
    : 3000

describe('Signal K SDK', () => {
  // @TODO requesting access should be expanded into a small class to manage the entire flow (including polling)
  describe('Device access requests', () => {
    it('... successfully requests device access', done => {
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client
          .requestDeviceAccess('Top Secret Client', clientId)
          .then(result => {
            client.disconnect()
            assert(
              isObject(result, 'response', true) &&
                result.response.hasOwnProperty('state') &&
                result.response.hasOwnProperty('requestId') &&
                result.response.hasOwnProperty('href')
            )
            done()
          })
          .catch(err => done(err))
      })

      client.connect()
    }).timeout(30000)

    it('... receives an access request sent by some device', done => {
      let isDone = false
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: 'JWT'
      })

      client.on('notification', notification => {
        if (isDone === false) {
          isDone = true
          assert(
            notification.path.includes('security.accessRequest') &&
              notification.path.includes(clientId)
          )
          client.disconnect()
          done()
        }
      })

      client.on('connect', () => {
        client
          .requestDeviceAccess('Top Secret Client', clientId)
          .catch(err => done(err))
      })

      client.connect()
    }).timeout(30000)

    it('... can respond to the access request notification sent by server', done => {
      let sent = false
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: 'JWT'
      })

      client.on('notification', notification => {
        if (
          sent === false &&
          notification.path.includes('security.accessRequest') &&
          notification.path.includes(clientId)
        ) {
          sent = true
          client
            .respondToAccessRequest(clientId, PERMISSIONS_READONLY)
            .then(result => {
              assert(
                String(result)
                  .toLowerCase()
                  .includes('request updated')
              ) // @FIXME node server returns incorrect response type
              done()
            })
            .catch(err => done(err))
        }
      })

      client.on('connect', () => {
        client
          .requestDeviceAccess('Top Secret Client', clientId)
          .catch(err => done(err))
      })

      client.connect()
    }).timeout(30000)
  })

  describe('On-demand authentication using request/response dynamics', () => {
    it('... sends an authentication request with incorrect password, and receives the proper error code', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client.authenticate('sdk@decipher.industries', 'wrong!')
        client.once('error', err => {
          assert(err.message.includes('401'))
          done()
        })
      })

      client.connect()
    }).timeout(15000)

    it('... sends an authentication request and receives a well-formed response including token', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client.authenticate('sdk@decipher.industries', 'signalk')
        client.once('authenticated', data => {
          assert(
            data && typeof data === 'object' && data.hasOwnProperty('token')
          )
          done()
        })
      })

      client.connect()
    }).timeout(15000)

    it('... successfully authenticates, and then can access resources via the REST API', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client.authenticate('sdk@decipher.industries', 'signalk')
        client.once('authenticated', data => {
          client
            .API()
            .then(api => api.self())
            .then(result => {
              assert(result && typeof result === 'object')
              done()
            })
            .catch(err => done(err))
        })
      })

      client.connect()
    }).timeout(15000)
  })

  describe('Request/response mechanics', () => {
    it('... sends a request and receives a well-formed response', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        const request = client.request('PUT', {
          put: {
            path: 'electrical.switches.anchorLight.state',
            value: 1
          }
        })

        request.once('response', response => {
          assert(
            response &&
              typeof response === 'object' &&
              response.hasOwnProperty('requestId') &&
              response.hasOwnProperty('state') &&
              response.hasOwnProperty('statusCode') &&
              (response.state === 'PENDING' ||
                response.state === 'COMPLETED') &&
              response.requestId === request.getRequestId()
          )
          done()
        })

        request.send()
      })

      client.connect()
    }).timeout(15000)

    it('... @FIXME sends a query for a request and receives a well-formed response', done => {
      done()
      /* @TODO this is not yet implemented by server, so this test will always fail
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      let received = 0

      client.on('connect', () => {
        const request = client.request('LOGIN', {
          login: {
            username: 'sdk@decipher.industries',
            password: 'signalk'
          }
        })

        request.on('response', response => {
          received += 1

          if (received === 1) {
            // Send query after initial response...
            request.query()
          }

          if (received > 1) {
            assert(
              response &&
              typeof response === 'object' &&
              response.hasOwnProperty('requestId') &&
              response.hasOwnProperty('state') &&
              response.hasOwnProperty('statusCode') &&
              (response.state === 'PENDING' || response.state === 'COMPLETED') &&
              response.requestId === request.getRequestId()
            )
            done()
          }
        })

        request.send()
      })

      client.connect()
      // */
    }).timeout(15000)
  })

  describe('mDNS server discovery', () => {
    it('... Emits an event when a Signal K host is found', done => {
      let found = 0
      const discovery = new Discovery(mdns, 10000)

      discovery.once('found', server => {
        found += 1
        assert(
          typeof server.hostname === 'string' &&
            server.hostname !== '' &&
            typeof server.port === 'number' &&
            typeof server.createClient === 'function' &&
            Array.isArray(server.roles) &&
            server.createClient() instanceof Client
        )
        done()
      })

      discovery.on('timeout', () => {
        if (found === 0) {
          done()
        }
      })
    }).timeout(15000)
  })

  describe('Subscriptions', () => {
    it('... Creates a subscription for navigation data', done => {
      const client = new Client({
        hostname: 'demo.signalk.org',
        port: 80,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      const opts = {
        context: 'vessels.self',
        subscribe: [{ path: 'navigation.position' }]
      }

      let isDone = false

      client.on('delta', data => {
        assert(
          data && typeof data === 'object' && data.hasOwnProperty('updates')
        )
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      let isDone = false

      client.on('delta', data => {
        assert(
          data && typeof data === 'object' && data.hasOwnProperty('updates')
        )
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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

  describe('Notifications', () => {
    it('... Connects and receives notifications', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        autoConnect: false,
        notifications: true,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        bearerTokenPrefix: 'JWT'
      })

      client.once('notification', notification => {
        assert(
          notification &&
            typeof notification === 'object' &&
            notification.hasOwnProperty('path')
        )
        done()
      })

      client.connect()
    }).timeout(60000)
  })

  describe('REST API', () => {
    const client = new Client({
      hostname: TEST_SERVER_HOSTNAME,
      port: TEST_SERVER_PORT,
      useAuthentication: true,
      username: 'sdk@decipher.industries',
      password: 'signalk',
      useTLS: false,
      reconnect: false,
      autoConnect: true,
      notifications: false,
      bearerTokenPrefix: 'JWT'
    })

    const groups = [
      'communication',
      'design',
      'electrical',
      'environment',
      'navigation',
      'notifications',
      'performance',
      'propulsion',
      'sails',
      'sensors',
      'steering',
      'tanks'
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

    it('... @FIXME Successfully completes a PUT request for a given path', done => {
      done()
      /*
      client
        .API()
        .then(api => api.put('/vessels/self/environment/depth/belowTransducer', { value: 100 }))
        .then(result => {
          console.log(result)
          done()
        })
        .catch(err => done(err))
      // */
    })

    it('... @FIXME Fails to complete a PUT request for an unknown path', done => {
      done()
      /*
      client
        .API()
        .then(api => api.put('/vessels/self/environment/depth/belowTransducer', { value: 100 }))
        .then(result => {
          console.log(result)
          done()
        })
        .catch(err => done(err))
      // */
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
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        autoConnect: true,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        maxRetries: 10,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
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
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('self', self => {
        assert(
          self ===
            'vessels.urn:mrn:signalk:uuid:c0d79334-4e25-4245-8892-54e8ccc8021d'
        )
        done()
      })

      client.connect()
    }).timeout(15000)

    it('... Fails to get vessel in case of unauthenticated connection', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client
          .API()
          .then(api => api.self())
          .then(result => {
            assert(
              result &&
                typeof result === 'object' &&
                result.hasOwnProperty('uuid')
            )
            done(new Error("Got data when we shouldn't be authenticated"))
          })
          .catch(err => {
            assert(
              err &&
                typeof err === 'object' &&
                typeof err.message === 'string' &&
                err.message.includes('401')
            )
            done()
          })
      })

      client.connect()
    }).timeout(15000)

    it('... Successfully authenticates with correct username/password', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: 'sdk@decipher.industries',
        password: 'signalk',
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: 'JWT'
      })

      client.on('connect', () => {
        client
          .API()
          .then(api => api.self())
          .then(result => {
            assert(
              result &&
                typeof result === 'object' &&
                result.hasOwnProperty('uuid')
            )
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
