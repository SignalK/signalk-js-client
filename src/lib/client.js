/**
 * @description   Client implements functionality to discover, connect to,
 *                retrieve data and receive data from a Signal K server.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        signalk-js-client
 */

import Promise from 'bluebird'
import EventEmitter from 'eventemitter3'
import Connection from './connection'
import Subscription from './subscription'
import API from './api'
import Debug from 'debug'

const debug = Debug('signalk-js-sdk/Client')

export const SUBSCRIPTION_NAME = 'default'
export const NOTIFICATIONS_SUBSCRIPTION = '__NOTIFICATIONS__'

export default class Client extends EventEmitter {
  constructor (options = {}) {
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
      ...options
    }

    this.api = null
    this.connection = null
    this.subscriptions = {}
    this.services = []
    this.notifications = {}

    if (this.options.autoConnect === true) {
      this.connect().catch(err => this.emit('error', err))
    }
  }

  set (key, value) {
    this.options[key] = value
    return this
  }

  get (key) {
    return this.options[key] || null
  }

  discover () {
    if (this.options.mdns === null) {
      return
    }

    const browser = this.options.mdns.browseThemAll()

    browser.on('serviceUp', service => {
      if (!service || typeof service !== 'object') {
        return
      }

      if (service.type.name.includes('signalk-ws')) {
        this.emit('foundHost', service)
      }
    })

    browser.start()
  }

  connect () {
    if (this.connection !== null) {
      this.connection.reconnect(true)
      return Promise.resolve(this.connection)
    }

    return new Promise((resolve, reject) => {
      this.connection = new Connection(this.options)

      this.connection.on('disconnect', data => this.emit('disconnect', data))
      this.connection.on('message', data => this.emit('message', data))
      this.connection.on('connectionInfo', data => this.emit('connectionInfo', data))
      this.connection.on('self', data => this.emit('self', data))
      this.connection.on('hitMaxRetries', () => this.emit('hitMaxRetries'))

      this.connection.on('connect', () => {
        if (this.options.notifications === true) {
          this.subscribeToNotifications()
        }
        this.emit('connect')
        resolve(this.connection)
      })

      this.connection.on('error', err => {
        this.emit('error', err)
        reject(err)
      })
    })
  }

  disconnect (returnPromise = false) {
    if (Object.keys(this.subscriptions).length > 0) {
      Object.keys(this.subscriptions).forEach(name => {
        const subscription = this.subscriptions[name]
        subscription.unsubscribe()
        delete this.subscriptions[name]
      })
    }

    if (this.connection !== null) {
      this.connection.on('disconnect', () => {
        this.cleanupListeners()
        this.connection = null
      })

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

  cleanupListeners () {
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

  API () {
    // Returning a Promise, so this method can be used as the start of a promise chain.
    // I.e., all API methods return Promises, so it makes sense to start the Promise
    // chain at the top.
    if (this.connection === null) {
      return Promise.reject(new Error('There are no available connections. Please connect before you use the REST API.'))
    }

    if (this.api === null && this.connection !== null) {
      this.api = new API(this.connection)
    }

    return Promise.resolve(this.api)
  }

  subscription () {
    const name = SUBSCRIPTION_NAME

    if (this.subscriptions.hasOwnProperty(name)) {
      return this.subscriptions[name]
    }

    return null
  }

  subscribe (options, identifier) {
    const name = (typeof identifier === 'string' && identifier.trim() !== '') ? identifier : SUBSCRIPTION_NAME

    if (this.connection === null) {
      return Promise.reject(new Error('There are no available connections. Please connect before subscribe.'))
    }

    if (this.api === null) {
      this.api = new API(this.connection)
    }

    if (this.subscriptions.hasOwnProperty(name) && this.subscriptions[name]) {
      return Promise.resolve(this.subscriptions[name])
    }

    this.subscriptions[name] = new Subscription(this.connection, this.api, options, identifier)
    this.subscriptions[name].on('unsubscribe', () => this.emit('unsubscribe'))
    this.subscriptions[name].on('subscribe', () => this.emit('subscribe', this.subscriptions[name]))
    this.subscriptions[name].on('delta', (delta) => this.emit('delta', delta))
    this.subscriptions[name].on('error', err => this.emit('error', err))

    return this.subscriptions[name].subscribe()
  }

  unsubscribe () {
    if (this.subscriptions.hasOwnProperty(SUBSCRIPTION_NAME) && this.subscriptions[SUBSCRIPTION_NAME]) {
      this.subscriptions[SUBSCRIPTION_NAME].unsubscribe()
      this.subscriptions[SUBSCRIPTION_NAME] = null
      delete this.subscriptions[SUBSCRIPTION_NAME]
      this.removeAllListeners('subscribe')
      this.removeAllListeners('unsubscribe')
      this.removeAllListeners('delta')
    }
  }

  subscribeToNotifications () {
    if (this.subscriptions.hasOwnProperty(NOTIFICATIONS_SUBSCRIPTION)) {
      return Promise.resolve(this.subscriptions[NOTIFICATIONS_SUBSCRIPTION])
    }

    if (this.connection === null) {
      return Promise.reject(new Error('There are no available connections. Please connect before subscribe.'))
    }

    if (this.api === null) {
      this.api = new API(this.connection)
    }

    const options = {
      context: 'vessels.self',
      subscribe: [{
        path: 'notifications.*',
        policy: 'instant'
      }]
    }

    const flattenTree = (tree) => {
      const flattened = {}
      let cursor = tree
      let currentPath = ''

      const evaluateLeaf = (key) => {
        currentPath += `${currentPath === '' ? '' : '.'}${key}`
        cursor = cursor[key]

        if (cursor && typeof cursor === 'object' && cursor.hasOwnProperty('value')) {
          flattened[currentPath] = Object.assign({}, cursor.value)
        } else {
          Object.keys(cursor).forEach(evaluateLeaf)
        }
      }

      Object.keys(cursor).forEach(key => evaluateLeaf(key))
      return flattened
    }

    this.api
      .notifications()
      .then(result => {
        this.notifications = {
          ...this.notifications,
          ...flattenTree(result)
        }

        Object.keys(this.notifications).forEach(path => {
          const notification = {
            path,
            ...this.notifications[path]
          }
          debug(`[subscribeToNotifications] emitting initial notification: ${JSON.stringify(notification, null, 2)}`)
          this.emit('notification', notification)
        })
      })
      .catch(err => {
        console.log(`[subscribeToNotifications] error getting initial notifications: ${err.message}`)
      })

    this.subscriptions[NOTIFICATIONS_SUBSCRIPTION] = new Subscription(this.connection, this.api, options, NOTIFICATIONS_SUBSCRIPTION)
    this.subscriptions[NOTIFICATIONS_SUBSCRIPTION].on('unsubscribe', () => this.emit('unsubscribe'))
    this.subscriptions[NOTIFICATIONS_SUBSCRIPTION].on('subscribe', () => this.emit('subscribe', this.subscriptions[NOTIFICATIONS_SUBSCRIPTION]))
    this.subscriptions[NOTIFICATIONS_SUBSCRIPTION].on('error', err => this.emit('error', err))

    this.subscriptions[NOTIFICATIONS_SUBSCRIPTION].on('delta', delta => {
      if (!delta || typeof delta !== 'object') {
        return
      }

      if (!Array.isArray(delta.updates)) {
        return
      }

      const notifications = {}
      delta.updates.forEach(update => {
        if (!Array.isArray(update.values)) {
          return
        }

        update.values.forEach(notification => {
          if (typeof notification.path !== 'string' || !notification.path.includes('notifications.')) {
            return
          }

          notifications[notification.path.replace('notifications.', '')] = {
            ...notification.value
          }
        })
      })

      Object.keys(notifications).forEach(path => {
        if (!this.notifications.hasOwnProperty(path) || this.notifications[path].timestamp !== notifications[path].timestamp) {
          this.notifications[path] = {
            ...notifications[path]
          }

          const notification = {
            path,
            ...this.notifications[path]
          }
          
          debug(`[subscribeToNotifications] emitting notification: ${JSON.stringify(notification, null, 2)}`)
          this.emit('notification', notification)
        }
      })
    })

    return this.subscriptions[NOTIFICATIONS_SUBSCRIPTION].subscribe()
  }
}
