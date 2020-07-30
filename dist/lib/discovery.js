"use strict";

require("core-js/modules/es.string.includes");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.starts-with");

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
  constructor(bonjourOrMdns) {
    let timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 60000;
    super();
    this.found = [];

    if (!bonjourOrMdns || typeof bonjourOrMdns !== 'object') {
      throw new Error('No mDNS provider given');
    }

    const bonjourProps = ['_server', '_registry'].join(',');
    const mdnsProps = ['dns_sd', 'Advertisement', 'createAdvertisement', 'Browser'].join(',');

    if (Object.keys(bonjourOrMdns).join(',').startsWith(bonjourProps)) {
      return this.discoverWithBonjour(bonjourOrMdns, timeout);
    }

    if (Object.keys(bonjourOrMdns).join(',').startsWith(mdnsProps)) {
      return this.discoverWithMdns(bonjourOrMdns, timeout);
    }

    throw new Error('Unrecognized mDNS provider given');
  }

  discoverWithBonjour(bonjour, timeout) {
    const browser = bonjour.find({
      type: 'signalk-http'
    });
    browser.on('up', ad => this.handleDiscoveredService(ad, _objectSpread(_objectSpread({}, ad.txt), {}, {
      name: ad.name || '',
      hostname: ad.host || '',
      port: parseInt(ad.port, 10),
      provider: 'bonjour'
    })));
    setTimeout(() => {
      if (this.found.length === 0) {
        this.emit('timeout');
      }

      browser.stop();
    }, timeout);
    browser.start();
  }

  discoverWithMdns(mDNS, timeout) {
    const browser = mDNS.createBrowser(mDNS.tcp('_signalk-http'));
    browser.on('serviceUp', ad => this.handleDiscoveredService(ad, _objectSpread(_objectSpread({}, ad.txtRecord), {}, {
      hostname: ad.host || '',
      port: parseInt(ad.port, 10),
      provider: 'mdns'
    })));
    browser.on('error', err => this.handleDiscoveryError(err));
    setTimeout(() => {
      if (this.found.length === 0) {
        this.emit('timeout');
      }

      browser.stop();
    }, timeout);
    browser.start();
  }

  handleDiscoveryError(err) {
    console.error("Error during discovery: ".concat(err.message));
  }

  handleDiscoveredService(ad, service) {
    if (typeof service.roles === 'string') {
      service.roles = service.roles.split(',').map(role => role.trim().toLowerCase());
    }

    service.roles = Array.isArray(service.roles) ? service.roles : [];
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
  }

}

exports.default = Discovery;