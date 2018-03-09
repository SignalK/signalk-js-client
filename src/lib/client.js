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

export const SUBSCRIPTION_NAME = 'default'

export default class Client extends EventEmitter {
  constructor (options = {}) {
    super()
    this.options = {
      hostname: 'localhost',
      port: 3000,
      useTLS: true,
      version: 'v1',
      autoConnect: false,
      reconnect: true,
      maxRetries: 100,
      ...options
    }

    this.api = null
    this.connection = null
    this.subscriptions = {}

    if (this.options.autoConnect === true) {
      this.connect().catch(err => this.emit('error', err))
    }
  }

  connect () {
    if (this.connection !== null) {
      this.connection.reconnect()
      return Promise.resolve(this.connection)
    }

    return new Promise((resolve, reject) => {
      this.connection = new Connection(this.options)

      this.connection.on('disconnect', () => this.emit('disconnect'))
      this.connection.on('message', data => this.emit('message', data))
      this.connection.on('connectionInfo', data => this.emit('connectionInfo', data))
      this.connection.on('self', data => this.emit('self', data))
      this.connection.on('hitMaxRetries', () => this.emit('hitMaxRetries'))

      this.connection.on('connect', () => {
        this.emit('connect')
        resolve()
      })

      this.connection.on('error', err => {
        this.emit('error', err)
        reject(err)
      })
    })
  }

  disconnect (returnPromise = false) {
    // Clean-up
    this.removeAllListeners('self')
    this.removeAllListeners('connectionInfo')
    this.removeAllListeners('message')
    this.removeAllListeners('delta')
    this.removeAllListeners('connect')
    this.removeAllListeners('error')
    this.removeAllListeners('hitMaxRetries')

    if (this.connection !== null) {
      this.connection.disconnect()
      this.connection = null
    }

    if (Object.keys(this.subscriptions).length > 0) {
      Object.keys(this.subscriptions).forEach(name => {
        const subscription = this.subscriptions[name]
        subscription.unsubscribe()
        delete this.subscriptions[name]
      })
    }

    if (this.api !== null) {
      this.api = null
    }

    if (returnPromise === true) {
      return Promise.resolve(this)
    }

    this.removeAllListeners('disconnect')
    this.removeAllListeners('unsubscribe')
    this.removeAllListeners('subscribe')
    return this
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

  subscribe (options) {
    const name = SUBSCRIPTION_NAME

    if (this.connection === null) {
      return Promise.reject(new Error('There are no available connections. Please connect before subscribe.'))
    }

    if (this.api === null) {
      this.api = new API(this.connection)
    }

    if (this.subscriptions.hasOwnProperty(name) && this.subscriptions[name]) {
      return Promise.resolve(this.subscriptions[name])
    }

    this.subscriptions[name] = new Subscription(this.connection, this.api, options)
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
}
