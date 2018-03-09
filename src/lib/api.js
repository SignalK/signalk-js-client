/**
 * @description   An API wraps the REST API for a Signal K server
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        signalk-js-client
 */

export default class API {
  constructor (connection) {
    this.connection = connection
    this.selfMRN = this.connection.self
  }

  get (path) {
    if (path.includes('.')) {
      path = path.replace(/\./g, '/')
    }

    if (typeof path !== 'string' || path.trim() === '') {
      path = '/'
    }

    if (path.charAt(0) !== '/') {
      path = `/${path}`
    }

    return this.connection.fetch(path)
  }

  /**
   * Shortcut methods.
   * @TODO: investigate if we can generate these using a Proxy and signalk-schema, using this.options.version.
   */

  getMeta (path) {
    return this
      .get(path)
      .then(result => {
        if (!result || typeof result !== 'object') {
          return null
        }

        if (!result.hasOwnProperty('meta')) {
          return null
        }

        return result.meta
      })
  }

  sources () {
    return this.get('/sources')
  }

  resources () {
    return this.get('/resources')
  }

  mrn () {
    return this.get('/self')
  }

  vessels () {
    return this.get('/vessels')
  }

  aircraft () {
    return this.get('/aircraft')
  }

  aton () {
    return this.get('/aton')
  }

  sar () {
    return this.get('/sar')
  }

  version () {
    return this.get('/version')
  }

  self (path) {
    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = ''
    }

    return this.connection.fetch(`/vessels/self${path}`)
  }

  vessel (mrn, path) {
    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = ''
    }

    return this.connection.fetch(`/vessels/${mrn}${path}`)
  }

  name () {
    return this.self('/name')
  }

  getGroup (group, path, vessel = 'self') {
    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = ''
    }

    if (vessel === 'self') {
      return this.self(`/${group}${path}`)
    }

    return this.vessel(vessel, `/${group}${path}`)
  }

  communication (path = '', vessel = 'self') {
    return this.getGroup('communication', path, vessel)
  }

  design (path = '', vessel = 'self') {
    return this.getGroup('design', path, vessel)
  }

  electrical (path = '', vessel = 'self') {
    return this.getGroup('electrical', path, vessel)
  }

  environment (path = '', vessel = 'self') {
    return this.getGroup('environment', path, vessel)
  }

  navigation (path = '', vessel = 'self') {
    return this.getGroup('navigation', path, vessel)
  }

  notifications (path = '', vessel = 'self') {
    return this.getGroup('notifications', path, vessel)
  }

  performance (path = '', vessel = 'self') {
    return this.getGroup('performance', path, vessel)
  }

  propulsion (path = '', vessel = 'self') {
    return this.getGroup('propulsion', path, vessel)
  }

  sails (path = '', vessel = 'self') {
    return this.getGroup('sails', path, vessel)
  }

  sensors (path = '', vessel = 'self') {
    return this.getGroup('sensors', path, vessel)
  }

  steering (path = '', vessel = 'self') {
    return this.getGroup('steering', path, vessel)
  }

  tanks (path = '', vessel = 'self') {
    return this.getGroup('tanks', path, vessel)
  }
}
