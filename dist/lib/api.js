"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es6.regexp.replace");

/**
 * @description   An API wraps the REST API for a Signal K server
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */
class API {
  constructor(connection) {
    this.connection = connection;
    this.selfMRN = this.connection.self;
  }

  get(path) {
    if (path.includes('.')) {
      path = path.replace(/\./g, '/');
    }

    if (typeof path !== 'string' || path.trim() === '') {
      path = '/';
    }

    if (path.charAt(0) !== '/') {
      path = `/${path}`;
    }

    return this.connection.fetch(path);
  }

  put(path, body) {
    if (path.includes('.')) {
      path = path.replace(/\./g, '/');
    }

    if (typeof path !== 'string' || path.trim() === '') {
      path = '/';
    }

    if (path.charAt(0) !== '/') {
      path = `/${path}`;
    }

    return this.connection.fetch(path, {
      method: 'PUT',
      mode: 'cors',
      body: body && typeof body === 'object' ? JSON.stringify(body) : body
    });
  }
  /**
   * Shortcut methods.
   * @TODO: investigate if we can generate these using a Proxy and signalk-schema, using this.options.version.
   */


  getMeta(path) {
    return this.get(path).then(result => {
      if (!result || typeof result !== 'object') {
        return null;
      }

      if (!result.hasOwnProperty('meta')) {
        return null;
      }

      return result.meta;
    });
  }

  sources() {
    return this.get('/sources');
  }

  resources() {
    return this.get('/resources');
  }

  mrn() {
    return this.get('/self');
  }

  vessels() {
    return this.get('/vessels');
  }

  aircraft() {
    return this.get('/aircraft');
  }

  aton() {
    return this.get('/aton');
  }

  sar() {
    return this.get('/sar');
  }

  version() {
    return this.get('/version');
  }

  self(path) {
    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = '';
    }

    return this.connection.fetch(`/vessels/self${path}`);
  }

  vessel(mrn, path) {
    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = '';
    }

    return this.connection.fetch(`/vessels/${mrn}${path}`);
  }

  name() {
    return this.self('/name');
  }

  getGroup(group, path) {
    let vessel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'self';

    if (typeof path !== 'string' || path.charAt(0) !== '/') {
      path = '';
    }

    if (vessel === 'self') {
      return this.self(`/${group}${path}`);
    }

    return this.vessel(vessel, `/${group}${path}`);
  }

  communication() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('communication', path, vessel);
  }

  design() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('design', path, vessel);
  }

  electrical() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('electrical', path, vessel);
  }

  environment() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('environment', path, vessel);
  }

  navigation() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('navigation', path, vessel);
  }

  notifications() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('notifications', path, vessel);
  }

  performance() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('performance', path, vessel);
  }

  propulsion() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('propulsion', path, vessel);
  }

  sails() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('sails', path, vessel);
  }

  sensors() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('sensors', path, vessel);
  }

  steering() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('steering', path, vessel);
  }

  tanks() {
    let path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    let vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
    return this.getGroup('tanks', path, vessel);
  }

}

exports.default = API;