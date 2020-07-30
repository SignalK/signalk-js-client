"use strict";

require("core-js/modules/es.string.includes");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SKServer = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _client = _interopRequireDefault(require("./client"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class SKServer {
  constructor(service) {
    this._roles = service.roles || ['master', 'main'];
    this._self = service.self || '';
    this._version = service.version || '0.0.0';
    this._hostname = service.hostname;
    this._port = service.port;
  }

  get roles() {
    return this._roles;
  }

  get self() {
    return this._self;
  }

  get version() {
    return this._version;
  }

  get hostname() {
    return this._hostname;
  }

  get port() {
    return this._port;
  }

  isMain() {
    return this._roles.includes('main');
  }

  isMaster() {
    return this._roles.includes('master');
  }

  createClient() {
    let opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return new _client.default(_objectSpread(_objectSpread({}, opts), {}, {
      hostname: this._hostname,
      port: this._port
    }));
  }

}

exports.SKServer = SKServer;

class Discovery extends _eventemitter.default {
  constructor(bonjour) {
    let timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 60000;
    super();
    const props = ['_server', '_registry'].join(',');

    if (!bonjour || typeof bonjour !== 'object' || Object.keys(bonjour).join(',') !== props) {
      throw new Error('Invalid mDNS provider');
    }

    this.found = [];
    const browser = bonjour.find({
      type: 'signalk-http'
    });
    browser.on('up', ad => {
      const service = _objectSpread(_objectSpread({}, ad.txt), {}, {
        name: ad.name || '',
        hostname: ad.host || '',
        port: parseInt(ad.port, 10)
      });

      if (service.hasOwnProperty('roles') && typeof service.roles === 'string' && service.roles.includes(',')) {
        service.roles = service.roles.split(',').map(role => role.trim().toLowerCase());
      }

      if (service.hasOwnProperty('roles') && typeof service.roles === 'string' && !service.roles.includes(',')) {
        service.roles = [service.roles].map(role => role.trim().toLowerCase());
      }

      let ipv4 = service.hostname;

      if (Array.isArray(ad.addresses)) {
        ipv4 = ad.addresses.reduce((found, address) => {
          if (address && typeof address === 'string' && address.includes('.')) {
            found = address;
          }

          return found;
        }, service.hostname);
      }

      if (ipv4.trim() !== '') {
        service.hostname = ipv4;
      }

      const server = new SKServer(service);
      this.found.push(server);
      this.emit('found', server);
    });
    browser.start();
    setTimeout(() => {
      if (this.found.length === 0) {
        this.emit('timeout');
      }

      browser.stop();
    }, timeout);
  }

}

exports.default = Discovery;