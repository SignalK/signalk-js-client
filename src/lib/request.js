/**
 * @description   A Request represents an asynchronous request to a Signal K server.
 *                This class manages a single request and it's responses.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import EventEmitter from 'eventemitter3'
import Debug from 'debug'
import { v4 as uuid } from 'uuid'
const debug = Debug('signalk-js-sdk/Request')

export default class Request extends EventEmitter {
  constructor (connection, name, body) {
    super()

    this.connection = connection
    this.requestId = uuid()
    this.name = name
    this.body = body
    this.responses = []
    this.sent = false

    this.connection.on('message', message => {
      if (message && typeof message === 'object' && message.hasOwnProperty('requestId') && message.requestId === this.requestId) {
        this.addResponse(message)
      }
    })
  }

  query () {
    const request = {
      requestId: this.requestId,
      query: true
    }

    debug(`Sending query: ${JSON.stringify(request, null, 2)}`)
    this.connection.send(request)
  }

  send () {
    if (this.sent === true) {
      return
    }

    const request = {
      requestId: this.requestId,
      ...this.body
    }

    debug(`Sending request: ${JSON.stringify(request, null, 2)}`)
    this.connection.send(request)
  }

  addResponse (response) {
    debug(`Got response for request "${this.name}": ${JSON.stringify(response, null, 2)}`)
    const receivedAt = new Date().toISOString()

    this.responses.push({
      response,
      receivedAt
    })

    this.emit('response', {
      ...response,
      request: {
        receivedAt,
        name: this.name,
        requestId: this.requestId
      }
    })
  }

  getRequestId () {
    return this.requestId
  }
}
