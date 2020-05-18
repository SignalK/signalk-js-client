"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.PERMISSIONS_DENY = exports.PERMISSIONS_READONLY = exports.PERMISSIONS_READWRITE = exports.AUTHENTICATION_REQUEST = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _connection = _interopRequireDefault(require("./connection"));

var _request = _interopRequireDefault(require("./request"));

var _api = _interopRequireDefault(require("./api"));

var _debug = _interopRequireDefault(require("debug"));

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var debug = (0, _debug["default"])('signalk-js-sdk/Client'); // Constants

var AUTHENTICATION_REQUEST = '__AUTHENTICATION_REQUEST__'; // Permissions for access requests

exports.AUTHENTICATION_REQUEST = AUTHENTICATION_REQUEST;
var PERMISSIONS_READWRITE = 'readwrite';
exports.PERMISSIONS_READWRITE = PERMISSIONS_READWRITE;
var PERMISSIONS_READONLY = 'readonly';
exports.PERMISSIONS_READONLY = PERMISSIONS_READONLY;
var PERMISSIONS_DENY = 'denied';
exports.PERMISSIONS_DENY = PERMISSIONS_DENY;

var Client = /*#__PURE__*/function (_EventEmitter) {
  _inherits(Client, _EventEmitter);

  var _super = _createSuper(Client);

  function Client() {
    var _this;

    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Client);

    _this = _super.call(this);
    _this.options = _objectSpread({
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
      deltaStreamBehaviour: 'none',
      subscriptions: []
    }, options);
    _this.api = null;
    _this.connection = null;
    _this.services = [];
    _this.notifications = {};
    _this.requests = {};
    _this.fetchReady = null;

    if (Array.isArray(_this.options.subscriptions)) {
      _this.subscribeCommands = _this.options.subscriptions.filter(function (command) {
        return isValidSubscribeCommand(command);
      });
    }

    if (_this.options.notifications === true) {
      _this.subscribeCommands.push({
        context: 'vessels.self',
        subscribe: [{
          path: 'notifications.*',
          policy: 'instant'
        }]
      });
    }

    if (_this.options.autoConnect === true) {
      _this.connect()["catch"](function (err) {
        return _this.emit('error', err);
      });
    }

    return _this;
  }

  _createClass(Client, [{
    key: "set",
    value: function set(key, value) {
      this.options[key] = value;
      return this;
    }
  }, {
    key: "get",
    value: function get(key) {
      return this.options[key] || null;
    }
  }, {
    key: "requestDeviceAccess",
    // @TODO requesting access should be expanded into a small class to manage the entire flow (including polling)
    value: function requestDeviceAccess(description, _clientId) {
      var clientId = typeof _clientId === 'string' ? _clientId : (0, _uuid.v4)();
      return this.connection.fetch('/access/requests', {
        method: 'POST',
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: clientId,
          description: description
        })
      }).then(function (response) {
        return {
          clientId: clientId,
          response: response
        };
      });
    }
  }, {
    key: "respondToAccessRequest",
    value: function respondToAccessRequest(uuid, permissions) {
      var expiration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '1y';
      return this.connection.fetch("/security/access/requests/".concat(uuid, "/").concat(permissions === 'denied' ? 'denied' : 'approved'), {
        method: 'PUT',
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiration: expiration,
          permissions: permissions
        })
      });
    }
  }, {
    key: "authenticate",
    value: function authenticate(username, password) {
      var _this2 = this;

      var request = this.request(AUTHENTICATION_REQUEST, {
        login: {
          username: username,
          password: password
        }
      });
      request.on('response', function (response) {
        if (response.statusCode === 200 && response.hasOwnProperty('login') && _typeof(response.login) === 'object' && response.login.hasOwnProperty('token')) {
          _this2.connection.setAuthenticated(response.login.token); // We are now authenticated


          return _this2.emit('authenticated', {
            token: response.login.token
          });
        }

        _this2.emit('error', new Error("Error authenticating: status ".concat(response.statusCode)));
      });
      request.send();
    }
  }, {
    key: "request",
    value: function request(name) {
      var body = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (!this.requests.hasOwnProperty(name)) {
        this.requests[name] = new _request["default"](this.connection, name, body);
        debug("Registered request \"".concat(name, "\" with ID ").concat(this.requests[name].getRequestId()));
      }

      return this.requests[name];
    }
  }, {
    key: "subscribe",
    value: function subscribe() {
      var _this3 = this;

      var subscriptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      if (this.connection === null) {
        throw new Error('Not connected');
      }

      if (subscriptions && !Array.isArray(subscriptions) && _typeof(subscriptions) === 'object' && subscriptions.hasOwnProperty('subscribe')) {
        subscriptions = [subscriptions];
      }

      subscriptions = subscriptions.filter(function (command) {
        return isValidSubscribeCommand(command);
      });
      subscriptions.forEach(function (command) {
        _this3.subscribeCommands.push(command);
      });
      this.connection.subscribe(subscriptions);
    }
  }, {
    key: "unsubscribe",
    value: function unsubscribe() {
      if (this.connection === null) {
        throw new Error('Not connected');
      }

      var notifications = this.options.notifications; // Reset subscribeCommands

      this.subscribeCommands = notifications === true ? [{
        context: 'vessels.self',
        subscribe: [{
          path: 'notifications.*',
          policy: 'instant'
        }]
      }] : []; // Unsubscribe

      this.connection.unsubscribe();

      if (this.subscribeCommands.length > 0) {
        this.connection.subscribe(this.subscribeCommands);
      }
    }
  }, {
    key: "connect",
    value: function connect() {
      var _this4 = this;

      if (this.connection !== null) {
        this.connection.reconnect(true);
        return Promise.resolve(this.connection);
      }

      return new Promise(function (resolve, reject) {
        _this4.connection = new _connection["default"](_this4.options, _this4.subscribeCommands);

        _this4.connection.on('disconnect', function (data) {
          return _this4.emit('disconnect', data);
        });

        _this4.connection.on('message', function (data) {
          return _this4.processWSMessage(data);
        });

        _this4.connection.on('connectionInfo', function (data) {
          return _this4.emit('connectionInfo', data);
        });

        _this4.connection.on('self', function (data) {
          return _this4.emit('self', data);
        });

        _this4.connection.on('hitMaxRetries', function () {
          return _this4.emit('hitMaxRetries');
        });

        _this4.connection.on('connect', function () {
          _this4.getInitialNotifications();

          _this4.emit('connect');

          resolve(_this4.connection);
        });

        _this4.connection.on('fetchReady', function () {
          _this4.fetchReady = true;
        });

        _this4.connection.on('error', function (err) {
          _this4.emit('error', err);

          reject(err);
        });
      });
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      var _this5 = this;

      var returnPromise = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (this.connection !== null) {
        this.connection.on('disconnect', function () {
          _this5.cleanupListeners();

          _this5.connection = null;
        });
        this.connection.unsubscribe();
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
  }, {
    key: "cleanupListeners",
    value: function cleanupListeners() {
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
  }, {
    key: "API",
    value: function API() {
      var _this6 = this;

      // Returning a Promise, so this method can be used as the start of a promise chain.
      // I.e., all API methods return Promises, so it makes sense to start the Promise
      // chain at the top.
      if (this.connection === null) {
        return Promise.reject(new Error('There are no available connections. Please connect before you use the REST API.'));
      }

      if (this.api !== null) {
        return Promise.resolve(this.api);
      }

      return new Promise(function (resolve) {
        _this6.api = new _api["default"](_this6.connection);

        if (_this6.fetchReady === true || _this6.options.useAuthentication === false) {
          return resolve(_this6.api);
        }

        _this6.connection.on('fetchReady', function () {
          resolve(_this6.api);
        });
      });
    }
  }, {
    key: "processWSMessage",
    value: function processWSMessage(data) {
      this.emit('message', data); // Check if message is SK delta, then emit.

      if (data && _typeof(data) === 'object' && data.hasOwnProperty('updates')) {
        this.checkAndEmitNotificationsInDelta(data);
        this.emit('delta', data);
      }
    }
  }, {
    key: "checkAndEmitNotificationsInDelta",
    value: function checkAndEmitNotificationsInDelta(delta) {
      var _this7 = this;

      if (this.options.notifications === false || !delta || _typeof(delta) !== 'object' || !Array.isArray(delta.updates)) {
        return;
      }

      var notifications = {};
      delta.updates.forEach(function (update) {
        update.values.forEach(function (mut) {
          if (typeof mut.path === 'string' && mut.path.includes('notifications.')) {
            notifications[mut.path.replace('notifications.', '')] = _objectSpread({}, mut.value);
          }
        });
      });
      Object.keys(notifications).forEach(function (path) {
        if (!_this7.notifications.hasOwnProperty(path) || _this7.notifications[path].timestamp !== notifications[path].timestamp) {
          _this7.notifications[path] = _objectSpread({}, notifications[path]);

          var notification = _objectSpread({
            path: path
          }, _this7.notifications[path]);

          debug("[checkAndEmitNotificationsInDelta] emitting notification: ".concat(JSON.stringify(notification, null, 2)));

          _this7.emit('notification', notification);
        }
      });
    }
  }, {
    key: "getInitialNotifications",
    value: function getInitialNotifications() {
      var _this8 = this;

      if (this.options.notifications === false) {
        return;
      }

      if (this.connection === null) {
        return;
      }

      if (this.api === null) {
        this.api = new _api["default"](this.connection);
      }

      this.api.notifications().then(function (result) {
        _this8.notifications = _objectSpread(_objectSpread({}, _this8.notifications), flattenTree(result));
        Object.keys(_this8.notifications).forEach(function (path) {
          var notification = _objectSpread({
            path: path
          }, _this8.notifications[path]);

          debug("[getInitialNotifications] emitting notification: ".concat(JSON.stringify(notification, null, 2)));

          _this8.emit('notification', notification);
        });
        return _this8.notifications;
      })["catch"](function (err) {
        console.error("[getInitialNotifications] error getting notifications: ".concat(err.message));
      });
    }
  }, {
    key: "self",
    get: function get() {
      if (this.connection === null) {
        return null;
      }

      return this.connection.self;
    }
  }, {
    key: "retries",
    get: function get() {
      if (this.connection === null) {
        return 0;
      }

      return this.connection.retries;
    }
  }]);

  return Client;
}(_eventemitter["default"]);

exports["default"] = Client;

var flattenTree = function flattenTree(tree) {
  var flattened = {};
  var cursor = tree;
  var currentPath = '';

  var evaluateLeaf = function evaluateLeaf(key) {
    currentPath += "".concat(currentPath === '' ? '' : '.').concat(key);
    cursor = cursor[key];

    if (!cursor || _typeof(cursor) !== 'object') {
      return;
    }

    if (cursor && _typeof(cursor) === 'object' && cursor.hasOwnProperty('value')) {
      flattened[currentPath] = Object.assign({}, cursor.value);
    } else {
      Object.keys(cursor).forEach(evaluateLeaf);
    }
  };

  Object.keys(cursor).forEach(function (key) {
    return evaluateLeaf(key);
  });
  return flattened;
};

var isValidSubscribeCommand = function isValidSubscribeCommand(command) {
  if (!command || _typeof(command) !== 'object') {
    return false;
  }

  if (!command.hasOwnProperty('context') || !Array.isArray(command.subscribe)) {
    return false;
  }

  return true;
};