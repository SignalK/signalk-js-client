"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.SKServer = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _client = _interopRequireDefault(require("./client"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var SKServer = /*#__PURE__*/function () {
  function SKServer(service) {
    _classCallCheck(this, SKServer);

    this._roles = service.roles || ['master', 'main'];
    this._self = service.self || '';
    this._version = service.version || '0.0.0';
    this._hostname = service.hostname;
    this._port = service.port;
  }

  _createClass(SKServer, [{
    key: "isMain",
    value: function isMain() {
      return this._roles.includes('main');
    }
  }, {
    key: "isMaster",
    value: function isMaster() {
      return this._roles.includes('master');
    }
  }, {
    key: "createClient",
    value: function createClient() {
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return new _client["default"](_objectSpread(_objectSpread({}, opts), {}, {
        hostname: this._hostname,
        port: this._port
      }));
    }
  }, {
    key: "roles",
    get: function get() {
      return this._roles;
    }
  }, {
    key: "self",
    get: function get() {
      return this._self;
    }
  }, {
    key: "version",
    get: function get() {
      return this._version;
    }
  }, {
    key: "hostname",
    get: function get() {
      return this._hostname;
    }
  }, {
    key: "port",
    get: function get() {
      return this._port;
    }
  }]);

  return SKServer;
}();

exports.SKServer = SKServer;

var Discovery = /*#__PURE__*/function (_EventEmitter) {
  _inherits(Discovery, _EventEmitter);

  var _super = _createSuper(Discovery);

  function Discovery(bonjour) {
    var _this;

    var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 60000;

    _classCallCheck(this, Discovery);

    _this = _super.call(this);
    var props = ['_server', '_registry'].join(',');

    if (!bonjour || _typeof(bonjour) !== 'object' || Object.keys(bonjour).join(',') !== props) {
      throw new Error('Invalid mDNS provider');
    }

    _this.found = [];
    var browser = bonjour.find({
      type: 'signalk-http'
    });
    browser.on('up', function (ad) {
      var service = _objectSpread(_objectSpread({}, ad.txt), {}, {
        name: ad.name || '',
        hostname: ad.host || '',
        port: parseInt(ad.port, 10)
      });

      if (service.hasOwnProperty('roles') && typeof service.roles === 'string' && service.roles.includes(',')) {
        service.roles = service.roles.split(',').map(function (role) {
          return role.trim().toLowerCase();
        });
      }

      if (service.hasOwnProperty('roles') && typeof service.roles === 'string' && !service.roles.includes(',')) {
        service.roles = [service.roles].map(function (role) {
          return role.trim().toLowerCase();
        });
      }

      var ipv4 = service.hostname;

      if (Array.isArray(ad.addresses)) {
        ipv4 = ad.addresses.reduce(function (found, address) {
          if (address && typeof address === 'string' && address.includes('.')) {
            found = address;
          }

          return found;
        }, service.hostname);
      }

      if (ipv4.trim() !== '') {
        service.hostname = ipv4;
      }

      var server = new SKServer(service);

      _this.found.push(server);

      _this.emit('found', server);
    });
    browser.start();
    setTimeout(function () {
      if (_this.found.length === 0) {
        _this.emit('timeout');
      }

      browser.stop();
    }, timeout);
    return _this;
  }

  return Discovery;
}(_eventemitter["default"]);

exports["default"] = Discovery;