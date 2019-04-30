/**
 * @description   A Subscription provides an observable API that a client can use
 *                to listen to all or certain deltas on a Signal K server.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import EventEmitter from 'eventemitter3'

export default class Subscription extends EventEmitter {
  constructor (connection, api, options = {}) {
    super()
    this.connection = connection
    this.api = api
    this.active = false
    this._listener = (data) => this.message(data)

    this.options = {
      context: '*',
      subscribe: [{ path: '*' }],
      ...options
    }
  }

  subscribe () {
    const subscription = {
      context: this.options.context,
      subscribe: this.options.subscribe,
      format: 'delta',
      policy: 'instant'
    }

    this.connection.on('message', this._listener.bind(this))
    this.connection.send(JSON.stringify(subscription))

    this.active = true
    this.emit('subscribe')
    return Promise.resolve(this)
  }

  unsubscribe () {
    this.active = false
    this.connection.removeListener('message', this._listener)
    this.connection.send(JSON.stringify({
      context: 'vessels.dont_send_me_anything',
      subscribe: [{ path: 'dont_send_me_anything.dont_send_me_anything' }],
      format: 'delta',
      policy: 'instant'
    }))

    this.emit('unsubscribe')
    return Promise.resolve(this)
  }

  message (data) {
    if (this.active === false) {
      return
    }

    if (typeof data === 'string' && data.trim() !== '') {
      try {
        data = JSON.parse(data)
      } catch (e) {
        this.emit('error', e)
      }
    }

    if (data && typeof data === 'object' && data.hasOwnProperty('updates')) {
      this.emit('delta', data)
    }
  }
}
