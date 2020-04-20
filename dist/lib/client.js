"use strict";

require("core-js/modules/es.object.assign");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.includes");

require("core-js/modules/es.string.replace");

require("core-js/modules/web.dom-collections.iterator");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.PERMISSIONS_DENY = exports.PERMISSIONS_READONLY = exports.PERMISSIONS_READWRITE = exports.AUTHENTICATION_REQUEST = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _connection = _interopRequireDefault(require("./connection"));

var _request = _interopRequireDefault(require("./request"));

var _api = _interopRequireDefault(require("./api"));

var _debug = _interopRequireDefault(require("debug"));

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = (0, _debug.default)('signalk-js-sdk/Client'); // Constants

const AUTHENTICATION_REQUEST = '__AUTHENTICATION_REQUEST__'; // Permissions for access requests

exports.AUTHENTICATION_REQUEST = AUTHENTICATION_REQUEST;
const PERMISSIONS_READWRITE = 'readwrite';
exports.PERMISSIONS_READWRITE = PERMISSIONS_READWRITE;
const PERMISSIONS_READONLY = 'readonly';
exports.PERMISSIONS_READONLY = PERMISSIONS_READONLY;
const PERMISSIONS_DENY = 'denied';
exports.PERMISSIONS_DENY = PERMISSIONS_DENY;

class Client extends _eventemitter.default {
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    super();
    this.options = _objectSpread({
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
      deltaStreamBehaviour: 'self',
      subscription: null
    }, options);
    this.api = null;
    this.connection = null;
    this.services = [];
    this.notifications = {};
    this.requests = {};
    this.fetchReady = null;
    this.subscribeCommands = this.options.notifications === false ? [] : [{
      context: 'vessels.self',
      subscribe: [{
        path: 'notifications.*',
        policy: 'instant'
      }]
    }];

    if (this.options.deltaStreamBehaviour === 'subscription' && !isValidSubscribeCommand(this.options.subscription)) {
      throw new Error('No subscription command was provided');
    }

    if (this.options.deltaStreamBehaviour === 'subscription' && isValidSubscribeCommand(this.options.subscription)) {
      this.subscribeCommands.push(this.options.subscription);
    }

    if (this.options.autoConnect === true) {
      this.connect().catch(err => this.emit('error', err));
    }
  }

  get self() {
    if (this.connection === null) {
      return null;
    }

    return this.connection.self;
  }

  set(key, value) {
    this.options[key] = value;
    return this;
  }

  get(key) {
    return this.options[key] || null;
  } // @TODO requesting access should be expanded into a small class to manage the entire flow (including polling)


  requestDeviceAccess(description, _clientId) {
    const clientId = typeof _clientId === 'string' ? _clientId : (0, _uuid.v4)();
    return this.connection.fetch('/access/requests', {
      method: 'POST',
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId,
        description
      })
    }).then(response => {
      return {
        clientId,
        response
      };
    });
  }

  respondToAccessRequest(uuid, permissions) {
    let expiration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1y';
    return this.connection.fetch("/security/access/requests/".concat(uuid, "/").concat(permissions === 'denied' ? 'denied' : 'approved'), {
      method: 'PUT',
      mode: 'cors',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expiration,
        permissions
      })
    });
  }

  authenticate(username, password) {
    const request = this.request(AUTHENTICATION_REQUEST, {
      login: {
        username,
        password
      }
    });
    request.on('response', response => {
      if (response.statusCode === 200 && response.hasOwnProperty('login') && typeof response.login === 'object' && response.login.hasOwnProperty('token')) {
        this.connection.setAuthenticated(response.login.token); // We are now authenticated

        return this.emit('authenticated', {
          token: response.login.token
        });
      }

      this.emit('error', new Error("Error authenticating: status ".concat(response.statusCode)));
    });
    request.send();
  }

  request(name) {
    let body = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!this.requests.hasOwnProperty(name)) {
      this.requests[name] = new _request.default(this.connection, name, body);
      debug("Registered request \"".concat(name, "\" with ID ").concat(this.requests[name].getRequestId()));
    }

    return this.requests[name];
  }

  connect() {
    if (this.connection !== null) {
      this.connection.reconnect(true);
      return Promise.resolve(this.connection);
    }

    return new Promise((resolve, reject) => {
      this.connection = new _connection.default(this.options, this.subscribeCommands);
      this.connection.on('disconnect', data => this.emit('disconnect', data));
      this.connection.on('message', data => this.processWSMessage(data));
      this.connection.on('connectionInfo', data => this.emit('connectionInfo', data));
      this.connection.on('self', data => this.emit('self', data));
      this.connection.on('hitMaxRetries', () => this.emit('hitMaxRetries'));
      this.connection.on('connect', () => {
        this.getInitialNotifications();
        this.emit('connect');
        resolve(this.connection);
      });
      this.connection.on('fetchReady', () => {
        this.fetchReady = true;
      });
      this.connection.on('error', err => {
        this.emit('error', err);
        reject(err);
      });
    });
  }

  disconnect() {
    let returnPromise = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    if (this.connection !== null) {
      this.connection.on('disconnect', () => {
        this.cleanupListeners();
        this.connection = null;
      });
      this.connection.disconnect();
    } else {
      this.cleanupListeners();
    }

    if (this.api !== null) {
      this.api = null;
    }

    if (returnPromise === true) {
      return Promise.resolve(this);
    }

    return this;
  }

  cleanupListeners() {
    this.removeAllListeners('self');
    this.removeAllListeners('connectionInfo');
    this.removeAllListeners('message');
    this.removeAllListeners('delta');
    this.removeAllListeners('connect');
    this.removeAllListeners('error');
    this.removeAllListeners('hitMaxRetries');
    this.removeAllListeners('disconnect');
    this.removeAllListeners('unsubscribe');
    this.removeAllListeners('subscribe');
  }

  API() {
    // Returning a Promise, so this method can be used as the start of a promise chain.
    // I.e., all API methods return Promises, so it makes sense to start the Promise
    // chain at the top.
    if (this.connection === null) {
      return Promise.reject(new Error('There are no available connections. Please connect before you use the REST API.'));
    }

    if (this.api !== null) {
      return Promise.resolve(this.api);
    }

    return new Promise(resolve => {
      this.api = new _api.default(this.connection);

      if (this.fetchReady === true || this.options.useAuthentication === false) {
        return resolve(this.api);
      }

      this.connection.on('fetchReady', () => {
        resolve(this.api);
      });
    });
  }

  processWSMessage(data) {
    this.emit('message', data); // Check if message is SK delta, then emit.

    if (data && typeof data === 'object' && data.hasOwnProperty('updates')) {
      this.checkAndEmitNotificationsInDelta(data);
      this.emit('delta', data);
    }
  }

  checkAndEmitNotificationsInDelta(delta) {
    if (this.options.notifications === false || !delta || typeof delta !== 'object' || !Array.isArray(delta.updates)) {
      return;
    }

    const notifications = {};
    delta.updates.forEach(update => {
      update.values.forEach(mut => {
        if (typeof mut.path === 'string' && mut.path.includes('notifications.')) {
          notifications[mut.path.replace('notifications.', '')] = _objectSpread({}, mut.value);
        }
      });
    });
    Object.keys(notifications).forEach(path => {
      if (!this.notifications.hasOwnProperty(path) || this.notifications[path].timestamp !== notifications[path].timestamp) {
        this.notifications[path] = _objectSpread({}, notifications[path]);

        const notification = _objectSpread({
          path
        }, this.notifications[path]);

        debug("[checkAndEmitNotificationsInDelta] emitting notification: ".concat(JSON.stringify(notification, null, 2)));
        this.emit('notification', notification);
      }
    });
  }

  getInitialNotifications() {
    if (this.options.notifications === false) {
      return;
    }

    if (this.connection === null) {
      return;
    }

    if (this.api === null) {
      this.api = new _api.default(this.connection);
    }

    this.api.notifications().then(result => {
      this.notifications = _objectSpread({}, this.notifications, {}, flattenTree(result));
      Object.keys(this.notifications).forEach(path => {
        const notification = _objectSpread({
          path
        }, this.notifications[path]);

        debug("[getInitialNotifications] emitting notification: ".concat(JSON.stringify(notification, null, 2)));
        this.emit('notification', notification);
      });
      return this.notifications;
    }).catch(err => {
      console.error("[getInitialNotifications] error getting notifications: ".concat(err.message));
    });
  }

}

exports.default = Client;

const flattenTree = tree => {
  const flattened = {};
  let cursor = tree;
  let currentPath = '';

  const evaluateLeaf = key => {
    currentPath += "".concat(currentPath === '' ? '' : '.').concat(key);
    cursor = cursor[key];

    if (!cursor || typeof cursor !== 'object') {
      return;
    }

    if (cursor && typeof cursor === 'object' && cursor.hasOwnProperty('value')) {
      flattened[currentPath] = Object.assign({}, cursor.value);
    } else {
      Object.keys(cursor).forEach(evaluateLeaf);
    }
  };

  Object.keys(cursor).forEach(key => evaluateLeaf(key));
  return flattened;
};

const isValidSubscribeCommand = command => {
  if (!command || typeof command !== 'object') {
    return false;
  }

  if (!command.hasOwnProperty('context') || !Array.isArray(command.subscribe)) {
    return false;
  }

  return true;
};