/**
 * @description   A Discovery takes an mDNS instance and discovers Signal K
 *                servers on the local network.
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */

import EventEmitter from 'eventemitter3'
import Client from './client'

export class SKServer {
  constructor(service) {
    this._roles = service.roles || ['master', 'main']
    this._self = service.self || ''
    this._version = service.version || '0.0.0'
    this._hostname = service.hostname
    this._port = service.port
  }

  get roles() {
    return this._roles
  }

  get self() {
    return this._self
  }

  get version() {
    return this._version
  }

  get hostname() {
    return this._hostname
  }

  get port() {
    return this._port
  }

  isMain() {
    return this._roles.includes('main')
  }

  isMaster() {
    return this._roles.includes('master')
  }

  createClient(opts = {}) {
    return new Client({
      ...opts,
      hostname: this._hostname,
      port: this._port,
    })
  }
}

export default class Discovery extends EventEmitter {
  constructor(bonjourOrMdns, timeout = 60000) {
    super()

    this.found = []

    if (!bonjourOrMdns || typeof bonjourOrMdns !== 'object') {
      throw new Error('No mDNS provider given')
    }

    const bonjourProps = ['_server', '_registry'].join(',')
    const mdnsProps = ['dns_sd', 'Advertisement', 'createAdvertisement', 'Browser'].join(',')

    if (Object.keys(bonjourOrMdns).join(',').startsWith(bonjourProps)) {
      return this.discoverWithBonjour(bonjourOrMdns, timeout)
    }

    if (Object.keys(bonjourOrMdns).join(',').startsWith(mdnsProps)) {
      return this.discoverWithMdns(bonjourOrMdns, timeout)
    }

    throw new Error('Unrecognized mDNS provider given')
  }

  discoverWithBonjour(bonjour, timeout) {
    const browser = bonjour.find({ type: 'signalk-http' })

    browser.on('up', (ad) => {
      const service = {
        ...ad.txt,
        name: ad.name || '',
        hostname: ad.host || '',
        port: parseInt(ad.port, 10),
        provider: 'bonjour',
      }

      if (
        service.hasOwnProperty('roles') &&
        typeof service.roles === 'string' &&
        service.roles.includes(',')
      ) {
        service.roles = service.roles.split(',').map((role) => role.trim().toLowerCase())
      }

      if (
        service.hasOwnProperty('roles') &&
        typeof service.roles === 'string' &&
        !service.roles.includes(',')
      ) {
        service.roles = [service.roles].map((role) => role.trim().toLowerCase())
      }

      let ipv4 = service.hostname

      if (Array.isArray(ad.addresses)) {
        ipv4 = ad.addresses.reduce((found, address) => {
          if (address && typeof address === 'string' && address.includes('.')) {
            found = address
          }
          return found
        }, service.hostname)
      }

      if (ipv4.trim() !== '') {
        service.hostname = ipv4
      }

      const server = new SKServer(service)
      this.found.push(server)
      this.emit('found', server)
    })

    browser.start()

    setTimeout(() => {
      if (this.found.length === 0) {
        this.emit('timeout')
      }

      browser.stop()
    }, timeout)
  }

  discoverWithMdns(mDNS, timeout) {
    const browser = mDNS.createBrowser(mDNS.tcp('_signalk-http'))

    browser.on('serviceUp', (ad) => {
      const service = {
        ...ad.txtRecord,
        hostname: ad.host || '',
        port: parseInt(ad.port, 10),
        provider: 'mdns',
      }

      if (
        service.hasOwnProperty('roles') &&
        typeof service.roles === 'string' &&
        service.roles.includes(',')
      ) {
        service.roles = service.roles.split(',').map((role) => role.trim().toLowerCase())
      }

      if (
        service.hasOwnProperty('roles') &&
        typeof service.roles === 'string' &&
        !service.roles.includes(',')
      ) {
        service.roles = [service.roles].map((role) => role.trim().toLowerCase())
      }

      let ipv4 = service.hostname

      if (Array.isArray(ad.addresses)) {
        ipv4 = ad.addresses.reduce((found, address) => {
          if (address && typeof address === 'string' && address.includes('.')) {
            found = address
          }
          return found
        }, service.hostname)
      }

      if (ipv4.trim() !== '') {
        service.hostname = ipv4
      }

      const server = new SKServer(service)
      this.found.push(server)
      this.emit('found', server)
    })

    browser.start()

    setTimeout(() => {
      if (this.found.length === 0) {
        this.emit('timeout')
      }

      browser.stop()
    }, timeout)
  }
}
