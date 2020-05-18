"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.SUPPORTED_STREAM_BEHAVIOUR = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _isomorphicWs = _interopRequireDefault(require("isomorphic-ws"));

var _crossFetch = _interopRequireDefault(require("cross-fetch"));

var _debug = _interopRequireDefault(require("debug"));

var _https = _interopRequireDefault(require("https"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

var debug = (0, _debug["default"])('signalk-js-sdk/Connection');
var isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
var SUPPORTED_STREAM_BEHAVIOUR = {
  self: 'self',
  all: 'all',
  none: 'none'
};
exports.SUPPORTED_STREAM_BEHAVIOUR = SUPPORTED_STREAM_BEHAVIOUR;

var Connection = /*#__PURE__*/function (_EventEmitter) {
  _inherits(Connection, _EventEmitter);

  var _super = _createSuper(Connection);

  function Connection(options) {
    var _this;

    var subscriptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

    _classCallCheck(this, Connection);

    _this = _super.call(this);
    _this.options = options;
    _this.httpURI = _this.buildURI('http');
    _this.wsURI = _this.buildURI('ws');
    _this.shouldDisconnect = false;
    _this.connected = false;
    _this.socket = null;
    _this.lastMessage = -1;
    _this.isConnecting = false;
    _this._fetchReady = false;
    _this._bearerTokenPrefix = _this.options.bearerTokenPrefix || 'Bearer';
    _this._authenticated = false;
    _this._retries = 0;
    _this._connection = null;
    _this._self = '';
    _this._subscriptions = subscriptions;
    _this.onWSMessage = _this._onWSMessage.bind(_assertThisInitialized(_this));
    _this.onWSOpen = _this._onWSOpen.bind(_assertThisInitialized(_this));
    _this.onWSClose = _this._onWSClose.bind(_assertThisInitialized(_this));
    _this.onWSError = _this._onWSError.bind(_assertThisInitialized(_this));
    _this._token = {
      kind: '',
      token: ''
    };

    _this.reconnect(true);

    return _this;
  }

  _createClass(Connection, [{
    key: "buildURI",
    value: function buildURI(protocol) {
      var _this$options = this.options,
          useTLS = _this$options.useTLS,
          hostname = _this$options.hostname,
          port = _this$options.port,
          version = _this$options.version,
          deltaStreamBehaviour = _this$options.deltaStreamBehaviour;
      var uri = useTLS === true ? "".concat(protocol, "s://") : "".concat(protocol, "://");
      uri += hostname;
      uri += port === 80 ? '' : ":".concat(port);
      uri += '/signalk/';
      uri += version;

      if (protocol === 'ws') {
        uri += '/stream';

        if (deltaStreamBehaviour && SUPPORTED_STREAM_BEHAVIOUR.hasOwnProperty(deltaStreamBehaviour) && SUPPORTED_STREAM_BEHAVIOUR[deltaStreamBehaviour] !== '') {
          uri += "?subscribe=".concat(SUPPORTED_STREAM_BEHAVIOUR[deltaStreamBehaviour]);
        }
      }

      if (protocol === 'http') {
        uri += '/api';
      }

      return uri;
    }
  }, {
    key: "state",
    value: function state() {
      return {
        connecting: this.isConnecting,
        connected: this.connected,
        ready: this.fetchReady
      };
    }
  }, {
    key: "disconnect",
    value: function disconnect() {
      debug('[disconnect] called');
      this.shouldDisconnect = true;
      this.reconnect();
    }
  }, {
    key: "reconnect",
    value: function reconnect() {
      var _this2 = this;

      var initial = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (this.isConnecting === true) {
        return;
      }

      if (this.socket !== null) {
        debug('[reconnect] closing socket');
        this.socket.close();
        return;
      }

      if (initial === false) {
        this._retries += 1;
      }

      if (initial !== true && this._retries === this.options.maxRetries) {
        this.emit('hitMaxRetries');
        this.cleanupListeners();
        return;
      }

      if (initial !== true && this.options.reconnect === false) {
        debug('[reconnect] Not reconnecting, for reconnect is false');
        this.cleanupListeners();
        return;
      }

      if (initial !== true && this.shouldDisconnect === true) {
        debug('[reconnect] not reconnecting, shouldDisconnect is true');
        this.cleanupListeners();
        return;
      }

      debug("[reconnect] socket is ".concat(this.socket === null ? '' : 'not ', "NULL"));
      this._fetchReady = false;
      this.shouldDisconnect = false;
      this.isConnecting = true;

      if (this.options.useAuthentication === false) {
        this._fetchReady = true;
        this.emit('fetchReady');
        this.initiateSocket();
        return;
      }

      var authRequest = {
        method: 'POST',
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({
          username: String(this.options.username || ''),
          password: String(this.options.password || '')
        })
      };
      return this.fetch('/auth/login', authRequest).then(function (result) {
        if (!result || _typeof(result) !== 'object' || !result.hasOwnProperty('token')) {
          throw new Error("Unexpected response from auth endpoint: ".concat(JSON.stringify(result)));
        }

        debug("[reconnect] successful auth request: ".concat(JSON.stringify(result, null, 2)));
        _this2._authenticated = true;
        _this2._token = {
          kind: typeof result.type === 'string' && result.type.trim() !== '' ? result.type : _this2._bearerTokenPrefix,
          token: result.token
        };
        _this2._fetchReady = true;

        _this2.emit('fetchReady');

        _this2.initiateSocket();
      })["catch"](function (err) {
        debug("[reconnect] error logging in: ".concat(err.message, ", reconnecting"));

        _this2.emit('error', err);

        _this2._retries += 1;
        _this2.isConnecting = false;
        return _this2.reconnect();
      });
    }
  }, {
    key: "setAuthenticated",
    value: function setAuthenticated(token) {
      var kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'JWT';
      // @FIXME default type should be Bearer
      this.emit('fetchReady');
      this._authenticated = true;
      this._token = {
        kind: kind,
        token: token
      };
    }
  }, {
    key: "initiateSocket",
    value: function initiateSocket() {
      if (isNode && this.options.useTLS && this.options.rejectUnauthorized === false) {
        this.socket = new _isomorphicWs["default"](this.wsURI, {
          rejectUnauthorized: false
        });
      } else {
        this.socket = new _isomorphicWs["default"](this.wsURI);
      }

      this.socket.addEventListener('message', this.onWSMessage);
      this.socket.addEventListener('open', this.onWSOpen);
      this.socket.addEventListener('error', this.onWSError);
      this.socket.addEventListener('close', this.onWSClose);
    }
  }, {
    key: "cleanupListeners",
    value: function cleanupListeners() {
      debug("[cleanupListeners] resetting auth and removing listeners"); // Reset authentication

      this._authenticated = false;
      this._token = {
        kind: '',
        token: ''
      };
      this.removeAllListeners();
    }
  }, {
    key: "_onWSMessage",
    value: function _onWSMessage(evt) {
      this.lastMessage = Date.now();
      var data = evt.data;

      try {
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
      } catch (e) {
        console.error("[Connection: ".concat(this.options.hostname, "] Error parsing data: ").concat(e.message));
      }

      if (data && _typeof(data) === 'object' && data.hasOwnProperty('name') && data.hasOwnProperty('version') && data.hasOwnProperty('roles')) {
        this.connectionInfo = data;
      }

      this.emit('message', data);
    }
  }, {
    key: "_onWSOpen",
    value: function _onWSOpen() {
      this.connected = true;
      this.isConnecting = false;

      if (this._subscriptions.length > 0) {
        var subscriptions = flattenSubscriptions(this._subscriptions);
        this.subscribe(subscriptions);
      }

      this._retries = 0;
      this.emit('connect');
    }
  }, {
    key: "_onWSError",
    value: function _onWSError(err) {
      debug('[_onWSError] WS error', err.message || '');
      this.emit('error', err);
      this.reconnect();
    }
  }, {
    key: "_onWSClose",
    value: function _onWSClose(evt) {
      debug('[_onWSClose] called with wsURI:', this.wsURI);
      this.socket.removeEventListener('message', this.onWSMessage);
      this.socket.removeEventListener('open', this.onWSOpen);
      this.socket.removeEventListener('error', this.onWSError);
      this.socket.removeEventListener('close', this.onWSClose);
      this.connected = false;
      this.isConnecting = false;
      this.socket = null;
      this.emit('disconnect', evt);
      this.reconnect();
    }
  }, {
    key: "unsubscribe",
    value: function unsubscribe() {
      this.send(JSON.stringify({
        context: '*',
        unsubscribe: [{
          path: '*'
        }]
      }));
    }
  }, {
    key: "subscribe",
    value: function subscribe() {
      var _this3 = this;

      var subscriptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      if (!Array.isArray(subscriptions) && subscriptions && _typeof(subscriptions) === 'object' && subscriptions.hasOwnProperty('subscribe')) {
        subscriptions = [subscriptions];
      }

      subscriptions.forEach(function (sub) {
        _this3.send(JSON.stringify(sub));
      });
    }
  }, {
    key: "send",
    value: function send(data) {
      if (this.connected !== true || this.socket === null) {
        return Promise.reject(new Error('Not connected to WebSocket'));
      } // Basic check if data is stringified JSON


      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          debug("[send] data is string but not valid JSON: ".concat(e.message));
        }
      }

      var isObj = data && _typeof(data) === 'object'; // FIXME: this shouldn't be required as per discussion about security.
      // Add token to data IF authenticated
      // https://signalk.org/specification/1.3.0/doc/security.html#other-clients
      // if (isObj && this.useAuthentication === true && this._authenticated === true) {
      //   data.token = String(this._token.token)
      // }

      try {
        if (isObj) {
          data = JSON.stringify(data);
        }
      } catch (e) {
        return Promise.reject(e);
      }

      debug("Sending data to socket: ".concat(data));
      var result = this.socket.send(data);
      return Promise.resolve(result);
    }
  }, {
    key: "fetch",
    value: function fetch(path, opts) {
      if (path.charAt(0) !== '/') {
        path = "/".concat(path);
      }

      if (!opts || _typeof(opts) !== 'object') {
        opts = {
          method: 'GET'
        };
      }

      if (!opts.headers || _typeof(opts.headers) !== 'object') {
        opts.headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        };
      }

      if (this._authenticated === true && !path.includes('auth/login')) {
        opts.headers = _objectSpread(_objectSpread({}, opts.headers), {}, {
          Authorization: "".concat(this._token.kind, " ").concat(this._token.token)
        });
        opts.credentials = 'same-origin';
        opts.mode = 'cors';
        debug("[fetch] enriching fetch options with in-memory token");
      }

      if (isNode && this.options.useTLS && this.options.rejectUnauthorized === false) {
        opts.agent = new _https["default"].Agent({
          rejectUnauthorized: false
        });
      }

      var URI = "".concat(this.httpURI).concat(path); // @TODO httpURI includes /api, which is not desirable. Need to refactor

      if (URI.includes('/api/auth/login')) {
        URI = URI.replace('/api/auth/login', '/auth/login');
      } // @TODO httpURI includes /api, which is not desirable. Need to refactor


      if (URI.includes('/api/access/requests')) {
        URI = URI.replace('/api/access/requests', '/access/requests');
      } // @FIXME weird hack because node server paths for access requests are not standardised


      if (URI.includes('/signalk/v1/api/security')) {
        URI = URI.replace('/signalk/v1/api/security', '/security');
      }

      debug("[fetch] ".concat(opts.method || 'GET', " ").concat(URI, " ").concat(JSON.stringify(opts, null, 2)));
      return (0, _crossFetch["default"])(URI, opts).then(function (response) {
        if (!response.ok) {
          throw new Error("Error fetching ".concat(URI, ": ").concat(response.status, " ").concat(response.statusText));
        }

        var type = response.headers.get('content-type');

        if (type.includes('application/json')) {
          return response.json();
        }

        return response.text();
      });
    }
  }, {
    key: "retries",
    get: function get() {
      return this._retries;
    }
  }, {
    key: "self",
    set: function set(data) {
      if (data !== null) {
        this.emit('self', data);
      }

      this._self = data;
    },
    get: function get() {
      return this._self;
    }
  }, {
    key: "connectionInfo",
    set: function set(data) {
      if (data !== null) {
        this.emit('connectionInfo', data);
      }

      this._connection = data;
      this.self = data.self;
    },
    get: function get() {
      return this._connection;
    }
  }]);

  return Connection;
}(_eventemitter["default"]);

exports["default"] = Connection;

var flattenSubscriptions = function flattenSubscriptions(subscriptionCommands) {
  var commandPerContext = {};
  subscriptionCommands.forEach(function (command) {
    if (!Array.isArray(commandPerContext[command.context])) {
      commandPerContext[command.context] = [];
    }

    commandPerContext[command.context] = commandPerContext[command.context].concat(command.subscribe);
  });
  return Object.keys(commandPerContext).map(function (context) {
    var subscription = {
      context: context,
      subscribe: commandPerContext[context]
    };

    if (subscription.subscribe.length > 0) {
      var paths = [];
      subscription.subscribe = subscription.subscribe.reduce(function (list, command) {
        if (!paths.includes(command.path)) {
          paths.push(command.path);
        } else {
          var index = list.findIndex(function (candidate) {
            return candidate.path === command.path;
          });

          if (index !== -1) {
            list.splice(index, 1);
          }
        }

        list.push(command);
        return list;
      }, []);
    }

    return subscription;
  });
};