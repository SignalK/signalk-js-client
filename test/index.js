/**
 * @description   Tests for signalk-js-sdk. Also useful for spec-testing a SK server.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import Client, {
  Discovery,
  Client as NamedClient,
  PERMISSIONS_READONLY
} from '../src'

import Bonjour from 'bonjour'
import { assert } from 'chai'
import { v4 as uuid } from 'uuid'
import Server from 'signalk-server'
import freeport from 'freeport-promise'

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

const USER = 'sdk'
const PASSWORD = 'signalk'
const BEARER_TOKEN_PREFIX = 'JWT'

let TEST_SERVER_HOSTNAME = process.env.TEST_SERVER_HOSTNAME
let TEST_SERVER_PORT = process.env.TEST_SERVER_PORT
let serverApp

const securityConfig = {
  allow_readonly: false,
  expiration: '1d',
  secretKey: '3c2eddf95ece9080518eb777b26c0fa6285f107cccb5ff9d5bdd7776eeb82c8afaf0dffa7d9312936882351ec6b1d5535203b4a2b806ab130cdbcd917f46f2a69e7ff4548ca3644c97a98185284041de46518cdb026f85430532fa4482882e4cfd08cc0256dca88d0ca2577b91d6a435a832e6c600b2db13f794d087e5e3a181d9566c1e61a14f984dbc643a7f6ab6a60cafafff34c93475d442475136cf7f0bfb62c59b050a9be572bc26993c46ef05fa748dc8395277eaa07519d79a7bc12502a2429b2f89b78796f6dcf3f474a5c5e276ecbb59dcdceaa8df8f1b1f98ec23a4c36cc1334e07e06a8c8cd6671fee599e578d24aabd187d1a2903ae6facb090',
  users: [{
    username: 'sdk',
    type: 'admin',
    password: '$2a$10$JyzSM5PMD3PCyivdtSN61OfwmjfgdISVtJ1l5KIC8/R1sUHPseMU2'
  }],
  devices: [],
  immutableConfig: false,
  acls: [],
  allowDeviceAccessRequests: true,
  allowNewUserRegistration: true
}

function startServer (done = () => {}) {
  TEST_SERVER_HOSTNAME = 'localhost'

  let promise

  if (!TEST_SERVER_PORT) {
    promise = freeport()
  } else {
    promise = Promise.resolve(TEST_SERVER_PORT)
  }

  promise.then(port => {
    TEST_SERVER_PORT = port
    serverApp = new Server({
      config: {
        settings: {
          port,
          interfaces: {
            plugins: false
          },
          security: {
            strategy: './tokensecurity'
          }
        }
      },
      securityConfig: securityConfig
    })
    serverApp.start().then(() => done())
  })
}

function killServer (done = () => {}) {
  if (!serverApp) {
    return done()
  }

  serverApp.stop().then(() => done())
}

describe('Signal K SDK', () => {
  before(done => {
    if (TEST_SERVER_HOSTNAME) {
      done()
    } else {
      startServer(() => {
        console.log('STARTED SERVER')
        done()
      })
    }
  })

  // @TODO requesting access should be expanded into a small class to manage the entire flow (including polling)
  describe('Device access requests', () => {
    it('... successfully requests device access', done => {
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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

    /*
    it('... receives an access request sent by some device', done => {
      let isDone = false
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
    // */

    it('... can respond to the access request notification sent by server', done => {
      let sent = false
      const clientId = uuid()
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        reconnect: false,
        notifications: true,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
  
  describe('Authentication over WebSockets, using seperate mechanism', () => {
    it('... sends an authentication request with incorrect password, and receives the proper error code', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
      })

      client.on('connect', () => {
        client.authenticate(USER, 'wrong!')
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
      })

      client.on('connect', () => {
        client.authenticate(USER, PASSWORD)
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
      })

      client.on('connect', () => {
        client.authenticate(USER, PASSWORD)
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
        username: USER,
        password: PASSWORD,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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

    // @TODO: not yet implemented by Signal K node.js server, so this this would always fail
    it.skip('... sends a query for a request and receives a well-formed response', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
      })

      let received = 0

      client.on('connect', () => {
        const request = client.request('LOGIN', {
          login: {
            username: USER,
            password: PASSWORD
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
    }).timeout(15000)
  })

  describe('mDNS server discovery', () => {
    it('... Emits an event when a Signal K host is found', done => {
      let found = 0
      const bonjour = Bonjour()
      const discovery = new Discovery(bonjour, 10000)

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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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

  // @TODO: embedded test server doesn't support notifications, so this test will always fail
  describe.skip('Notifications', () => {
    it('... Connects and receives notifications', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        autoConnect: false,
        notifications: true,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
    let client

    before(() => {
      client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        useTLS: false,
        reconnect: false,
        autoConnect: true,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
      })
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

  describe('Connection', () => {
    it('... Successfully closes the connection and any connection attempts when "disconnect" is called', done => {
      let client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        autoConnect: true,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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
        username: USER,
        password: PASSWORD,
        reconnect: false,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX
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

    it('... Successfully re-connects after the remote server is restarted', done => {
      const client = new Client({
        hostname: TEST_SERVER_HOSTNAME,
        port: TEST_SERVER_PORT,
        useTLS: false,
        useAuthentication: true,
        username: USER,
        password: PASSWORD,
        reconnect: true,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX,
        maxRetries: Infinity
      })

      let connectionCount = 0

      client.on('connect', () => {
        connectionCount += 1
        if (connectionCount === 1) {
          killServer(() => setTimeout(() => {
            startServer()
          }, 100))
        }

        if (connectionCount === 2) {
          done()
        }
      })

      client.connect()
    }).timeout(15000)
    
    /*
    // @NOTE:
    // this test requires a manual restart of the test server, 
    // as the included server doesn't emit deltas

    it('... Successfully re-subscribes to all data after the remote server is restarted', done => {
      const client = new Client({
        hostname: 'hq.decipher.digital',
        port: 3000,
        useTLS: false,
        useAuthentication: false,
        reconnect: true,
        notifications: false,
        bearerTokenPrefix: BEARER_TOKEN_PREFIX,
        maxRetries: Infinity
      })

      let connectionCount = 0
      let serverKilled = false
      let deltas = 0
      let doneCalled = false

      client.on('delta', data => {
        if (!data || typeof data !== 'object' || !data.hasOwnProperty('updates') || serverKilled === true) {
          return
        }

        deltas += 1
        if (connectionCount > 1 && doneCalled === false) {
          doneCalled = true
          assert(deltas >= 1000)
          done(deltas >= 1000 ? null : new Error('Didn\'t get deltas after reconnection'))
        }
      })

      client.on('connect', () => {
        connectionCount += 1

        if (connectionCount === 1) {
          client.subscribe()
        }

        if (connectionCount > 1) {
          deltas = 1000
        }
      })

      client.connect()
    }).timeout(150000)
    // */
  })
})
