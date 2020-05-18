"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _debug = _interopRequireDefault(require("debug"));

var _uuid = require("uuid");

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

var debug = (0, _debug["default"])('signalk-js-sdk/Request');

var Request = /*#__PURE__*/function (_EventEmitter) {
  _inherits(Request, _EventEmitter);

  var _super = _createSuper(Request);

  function Request(connection, name, body) {
    var _this;

    _classCallCheck(this, Request);

    _this = _super.call(this);
    _this.connection = connection;
    _this.requestId = (0, _uuid.v4)();
    _this.name = name;
    _this.body = body;
    _this.responses = [];
    _this.sent = false;

    _this.connection.on('message', function (message) {
      if (message && _typeof(message) === 'object' && message.hasOwnProperty('requestId') && message.requestId === _this.requestId) {
        _this.addResponse(message);
      }
    });

    return _this;
  }

  _createClass(Request, [{
    key: "query",
    value: function query() {
      var request = {
        requestId: this.requestId,
        query: true
      };
      debug("Sending query: ".concat(JSON.stringify(request, null, 2)));
      this.connection.send(request);
    }
  }, {
    key: "send",
    value: function send() {
      if (this.sent === true) {
        return;
      }

      var request = _objectSpread({
        requestId: this.requestId
      }, this.body);

      debug("Sending request: ".concat(JSON.stringify(request, null, 2)));
      this.connection.send(request);
    }
  }, {
    key: "addResponse",
    value: function addResponse(response) {
      debug("Got response for request \"".concat(this.name, "\": ").concat(JSON.stringify(response, null, 2)));
      var receivedAt = new Date().toISOString();
      this.responses.push({
        response: response,
        receivedAt: receivedAt
      });
      this.emit('response', _objectSpread(_objectSpread({}, response), {}, {
        request: {
          receivedAt: receivedAt,
          name: this.name,
          requestId: this.requestId
        }
      }));
    }
  }, {
    key: "getRequestId",
    value: function getRequestId() {
      return this.requestId;
    }
  }]);

  return Request;
}(_eventemitter["default"]);

exports["default"] = Request;