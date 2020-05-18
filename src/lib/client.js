/**
 * @description   Client implements functionality to discover, connect to,
 *                retrieve data and receive data from a Signal K server.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import EventEmitter from 'eventemitter3'
import Connection from './connection'
import Request from './request'
import API from './api'
import Debug from 'debug'
import { v4 as uuid } from 'uuid'

const debug = Debug('signalk-js-sdk/Client')

// Constants
export const AUTHENTICATION_REQUEST = '__AUTHENTICATION_REQUEST__'
// Permissions for access requests
export const PERMISSIONS_READWRITE = 'readwrite'
export const PERMISSIONS_READONLY = 'readonly'
export const PERMISSIONS_DENY = 'denied'

export default class Client extends EventEmitter {
  constructor(options = {}) {
    super()
    this.options = {
      hostname: 'localhost',
      port: 3000,
      useTLS: true,
      useAuthentication: false,
      notifications: true,
      version: 'v1',
      autoConnect: false,
      reconnect: true,
      maxRetries: 100,
      mdns: null,
      username: null,
      password: null,
      deltaStreamBehaviour: 'none',
      subscriptions: [],
      ...options,
    }

    this.api = null
    this.connection = null
    this.services = []
    this.notifications = {}
    this.requests = {}
    this.fetchReady = null

    if (Array.isArray(this.options.subscriptions)) {
      this.subscribeCommands = this.options.subscriptions.filter((command) =>
        isValidSubscribeCommand(command)
      )
    }

    if (this.options.notifications === true) {
      this.subscribeCommands.push({
        context: 'vessels.self',
        subscribe: [
          {
            path: 'notifications.*',
            policy: 'instant',
          },
        ],
      })
    }

    if (this.options.autoConnect === true) {
      this.connect().catch((err) => this.emit('error', err))
    }
  }

  get self() {
    if (this.connection === null) {
      return null
    }

    return this.connection.self
  }

  set(key, value) {
    this.options[key] = value
    return this
  }

  get(key) {
    return this.options[key] || null
  }

  get retries() {
    if (this.connection === null) {
      return 0
    }

    return this.connection.retries
  }

  // @TODO requesting access should be expanded into a small class to manage the entire flow (including polling)
  requestDeviceAccess(description, _clientId) {
    const clientId = typeof _clientId === 'string' ? _clientId : uuid()
    return this.connection
      .fetch('/access/requests', {
        method: 'POST',
        mode: 'cors',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          description,
        }),
      })
      .then((response) => {
        return {
          clientId,
          response,
        }
      })
  }

  respondToAccessRequest(uuid, permissions, expiration = '1y') {
    return this.connection.fetch(
      `/security/access/requests/${uuid}/${permissions === 'denied' ? 'denied' : 'approved'}`,
      {
        method: 'PUT',
        mode: 'cors',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiration,
          permissions,
        }),
      }
    )
  }

  authenticate(username, password) {
    const request = this.request(AUTHENTICATION_REQUEST, {
      login: {
        username,
        password,
      },
    })

    request.on('response', (response) => {
      if (
        response.statusCode === 200 &&
        response.hasOwnProperty('login') &&
        typeof response.login === 'object' &&
        response.login.hasOwnProperty('token')
      ) {
        this.connection.setAuthenticated(response.login.token)

        // We are now authenticated
        return this.emit('authenticated', {
          token: response.login.token,
        })
      }

      this.emit('error', new Error(`Error authenticating: status ${response.statusCode}`))
    })

    request.send()
  }

  request(name, body = {}) {
    if (!this.requests.hasOwnProperty(name)) {
      this.requests[name] = new Request(this.connection, name, body)
      debug(`Registered request "${name}" with ID ${this.requests[name].getRequestId()}`)
    }

    return this.requests[name]
  }

  subscribe(subscriptions = []) {
    if (this.connection === null) {
      throw new Error('Not connected')
    }

    if (
      subscriptions &&
      !Array.isArray(subscriptions) &&
      typeof subscriptions === 'object' &&
      subscriptions.hasOwnProperty('subscribe')
    ) {
      subscriptions = [subscriptions]
    }

    subscriptions = subscriptions.filter((command) => isValidSubscribeCommand(command))
    subscriptions.forEach((command) => {
      this.subscribeCommands.push(command)
    })

    this.connection.subscribe(subscriptions)
  }

  unsubscribe() {
    if (this.connection === null) {
      throw new Error('Not connected')
    }

    const { notifications } = this.options

    // Reset subscribeCommands
    this.subscribeCommands =
      notifications === true
        ? [
            {
              context: 'vessels.self',
              subscribe: [
                {
                  path: 'notifications.*',
                  policy: 'instant',
                },
              ],
            },
          ]
        : []

    // Unsubscribe
    this.connection.unsubscribe()

    if (this.subscribeCommands.length > 0) {
      this.connection.subscribe(this.subscribeCommands)
    }
  }

  connect() {
    if (this.connection !== null) {
      this.connection.reconnect(true)
      return Promise.resolve(this.connection)
    }

    return new Promise((resolve, reject) => {
      this.connection = new Connection(this.options, this.subscribeCommands)

      this.connection.on('disconnect', (data) => this.emit('disconnect', data))
      this.connection.on('message', (data) => this.processWSMessage(data))
      this.connection.on('connectionInfo', (data) => this.emit('connectionInfo', data))
      this.connection.on('self', (data) => this.emit('self', data))
      this.connection.on('hitMaxRetries', () => this.emit('hitMaxRetries'))

      this.connection.on('connect', () => {
        this.getInitialNotifications()
        this.emit('connect')
        resolve(this.connection)
      })

      this.connection.on('fetchReady', () => {
        this.fetchReady = true
      })

      this.connection.on('error', (err) => {
        this.emit('error', err)
        reject(err)
      })
    })
  }

  disconnect(returnPromise = false) {
    if (this.connection !== null) {
      this.connection.on('disconnect', () => {
        this.cleanupListeners()
        this.connection = null
      })

      this.connection.unsubscribe()
      this.connection.disconnect()
    } else {
      this.cleanupListeners()
    }

    if (this.api !== null) {
      this.api = null
    }

    if (returnPromise === true) {
      return Promise.resolve(this)
    }

    return this
  }

  cleanupListeners() {
    this.removeAllListeners('self')
    this.removeAllListeners('connectionInfo')
    this.removeAllListeners('message')
    this.removeAllListeners('delta')
    this.removeAllListeners('connect')
    this.removeAllListeners('error')
    this.removeAllListeners('hitMaxRetries')
    this.removeAllListeners('disconnect')
    this.removeAllListeners('unsubscribe')
    this.removeAllListeners('subscribe')
  }

  API() {
    // Returning a Promise, so this method can be used as the start of a promise chain.
    // I.e., all API methods return Promises, so it makes sense to start the Promise
    // chain at the top.
    if (this.connection === null) {
      return Promise.reject(
        new Error('There are no available connections. Please connect before you use the REST API.')
      )
    }

    if (this.api !== null) {
      return Promise.resolve(this.api)
    }

    return new Promise((resolve) => {
      this.api = new API(this.connection)

      if (this.fetchReady === true || this.options.useAuthentication === false) {
        return resolve(this.api)
      }

      this.connection.on('fetchReady', () => {
        resolve(this.api)
      })
    })
  }

  processWSMessage(data) {
    this.emit('message', data)

    // Check if message is SK delta, then emit.
    if (data && typeof data === 'object' && data.hasOwnProperty('updates')) {
      this.checkAndEmitNotificationsInDelta(data)
      this.emit('delta', data)
    }
  }

  checkAndEmitNotificationsInDelta(delta) {
    if (
      this.options.notifications === false ||
      !delta ||
      typeof delta !== 'object' ||
      !Array.isArray(delta.updates)
    ) {
      return
    }

    const notifications = {}

    delta.updates.forEach((update) => {
      update.values.forEach((mut) => {
        if (typeof mut.path === 'string' && mut.path.includes('notifications.')) {
          notifications[mut.path.replace('notifications.', '')] = {
            ...mut.value,
          }
        }
      })
    })

    Object.keys(notifications).forEach((path) => {
      if (
        !this.notifications.hasOwnProperty(path) ||
        this.notifications[path].timestamp !== notifications[path].timestamp
      ) {
        this.notifications[path] = {
          ...notifications[path],
        }

        const notification = {
          path,
          ...this.notifications[path],
        }

        debug(
          `[checkAndEmitNotificationsInDelta] emitting notification: ${JSON.stringify(
            notification,
            null,
            2
          )}`
        )
        this.emit('notification', notification)
      }
    })
  }

  getInitialNotifications() {
    if (this.options.notifications === false) {
      return
    }

    if (this.connection === null) {
      return
    }

    if (this.api === null) {
      this.api = new API(this.connection)
    }

    this.api
      .notifications()
      .then((result) => {
        this.notifications = {
          ...this.notifications,
          ...flattenTree(result),
        }

        Object.keys(this.notifications).forEach((path) => {
          const notification = {
            path,
            ...this.notifications[path],
          }
          debug(
            `[getInitialNotifications] emitting notification: ${JSON.stringify(
              notification,
              null,
              2
            )}`
          )
          this.emit('notification', notification)
        })

        return this.notifications
      })
      .catch((err) => {
        console.error(`[getInitialNotifications] error getting notifications: ${err.message}`)
      })
  }
}

const flattenTree = (tree) => {
  const flattened = {}
  let cursor = tree
  let currentPath = ''

  const evaluateLeaf = (key) => {
    currentPath += `${currentPath === '' ? '' : '.'}${key}`
    cursor = cursor[key]

    if (!cursor || typeof cursor !== 'object') {
      return
    }

    if (cursor && typeof cursor === 'object' && cursor.hasOwnProperty('value')) {
      flattened[currentPath] = Object.assign({}, cursor.value)
    } else {
      Object.keys(cursor).forEach(evaluateLeaf)
    }
  }

  Object.keys(cursor).forEach((key) => evaluateLeaf(key))
  return flattened
}

const isValidSubscribeCommand = (command) => {
  if (!command || typeof command !== 'object') {
    return false
  }

  if (!command.hasOwnProperty('context') || !Array.isArray(command.subscribe)) {
    return false
  }

  return true
}
