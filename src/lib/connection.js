/**
 * @description   A Connection represents a single connection to a Signal K server.
 *                It manages both the HTTP connection (REST API) and the WS connection.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        signalk-js-client
 */

import EventEmitter from 'eventemitter3'
import WebSocket from 'isomorphic-ws'
import fetch from 'cross-fetch'

export default class Connection extends EventEmitter {
  constructor (options) {
    super()
    this.options = options
    this.httpURI = this.buildURI('http')
    this.wsURI = this.buildURI('ws')
    this.shouldDisconnect = false
    this.connected = false
    this.socket = null
    this.lastMessage = -1
    this._retries = 0
    this._connection = null
    this._self = ''
    this.isConnecting = false

    this.onWSMessage = this._onWSMessage.bind(this)
    this.onWSOpen = this._onWSOpen.bind(this)
    this.onWSClose = this._onWSClose.bind(this)
    this.onWSError = this._onWSError.bind(this)

    this.reconnect(true)
  }

  set self (data) {
    if (data !== null) {
      this.emit('self', data)
    }

    this._self = data
  }

  get self () {
    return this._self
  }

  set connectionInfo (data) {
    if (data !== null) {
      this.emit('connectionInfo', data)
    }

    this._connection = data
    this.self = data.self
  }

  get connectionInfo () {
    return this._connection
  }

  buildURI (protocol) {
    let uri = this.options.useTLS === true ? `${protocol}s://` : `${protocol}://`
    uri += this.options.hostname
    uri += this.options.port === 80 ? '' : `:${this.options.port}`

    uri += '/signalk/'
    uri += this.options.version

    if (protocol === 'ws') {
      uri += '/stream?subscribe=none'
    }

    if (protocol === 'http') {
      uri += '/api'
    }

    return uri
  }

  disconnect () {
    // console.log('Connection#disconnect')
    this.shouldDisconnect = true
    this.reconnect()
  }

  reconnect (initial = false) {
    if (this.isConnecting === true) {
      return
    }

    if (this.socket !== null) {
      // console.log('Connection#reconnect - closing socket')
      this.socket.close()
      return
    }

    if (initial !== true && this._retries === this.options.maxRetries) {
      this.emit('hitMaxRetries')
      this.cleanupListeners()
      return
    }

    if (initial !== true && this.options.reconnect === false) {
      // console.log('Not reconnecting, for reconnect is false')
      this.cleanupListeners()
      return
    }

    if (initial !== true && this.shouldDisconnect === true) {
      // console.log('Connection#reconnect - not reconnecting, shouldDisconnect is true')
      this.cleanupListeners()
      return
    }

    // console.log(`Socket is ${this.socket === null ? '' : 'not '}NULL`)

    this.shouldDisconnect = false
    this.isConnecting = true

    this.socket = new WebSocket(this.wsURI)
    this.socket.addEventListener('message', this.onWSMessage)
    this.socket.addEventListener('open', this.onWSOpen)
    this.socket.addEventListener('error', this.onWSError)
    this.socket.addEventListener('close', this.onWSClose)
  }

  cleanupListeners () {
    this.removeAllListeners()
  }

  _onWSMessage (evt) {
    this.lastMessage = Date.now()
    let data = evt.data

    try {
      if (typeof data === 'string') {
        data = JSON.parse(data)
      }
    } catch (e) {
      console.log(`[Connection: ${this.options.hostname}] Error parsing data: ${e.message}`)
    }

    if (data && typeof data === 'object' && data.hasOwnProperty('name') && data.hasOwnProperty('version') && data.hasOwnProperty('roles')) {
      this.connectionInfo = data
    }

    this.emit('message', evt.data)
  }

  _onWSOpen () {
    this.connected = true
    this.isConnecting = false
    this.emit('connect')
  }

  _onWSError (err) {
    // console.log('WS error', err.message || '')
    this._retries += 1
    this.emit('error', err)
    this.reconnect()
  }

  _onWSClose (evt) {
    // console.log('Connection#_onWSClose - called with wsURI:', this.wsURI)
    this.socket.removeEventListener('message', this.onWSMessage)
    this.socket.removeEventListener('open', this.onWSOpen)
    this.socket.removeEventListener('error', this.onWSError)
    this.socket.removeEventListener('close', this.onWSClose)

    this.connected = false
    this.isConnecting = false
    this.socket = null
    this._retries += 1

    this.emit('disconnect', evt)
    this.reconnect()
  }

  send (data) {
    if (this.connected !== true || this.socket === null) {
      return Promise.reject(new Error('Not connected to WebSocket'))
    }

    try {
      if (typeof data === 'object' && data !== null) {
        data = JSON.stringify(data)
      }
    } catch (e) {
      return Promise.reject(e)
    }

    this.socket.send(data)
  }

  fetch (path, opts) {
    // @TODO for now this is just a simple proxy. Enrich opts.headers with security data when implemented.
    if (path.charAt(0) !== '/') {
      path = `/${path}`
    }

    return fetch(`${this.httpURI}${path}`, opts)
      .then(response => {
        if (response.ok) {
          return response.json()
        }

        throw new Error(`Error fetching ${this.httpURI}${path}: ${response.status} ${response.statusText}`)
      })
  }
}
