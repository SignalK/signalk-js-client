"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/web.dom.iterable");

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

var _debug = _interopRequireDefault(require("debug"));

var _uuid = require("uuid");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const debug = (0, _debug.default)('signalk-js-sdk/Request');

class Request extends _eventemitter.default {
  constructor(connection, name, body) {
    super();
    this.connection = connection;
    this.requestId = (0, _uuid.v4)();
    this.name = name;
    this.body = body;
    this.responses = [];
    this.sent = false;
    this.connection.on('message', message => {
      if (message && typeof message === 'object' && message.hasOwnProperty('requestId') && message.requestId === this.requestId) {
        this.addResponse(message);
      }
    });
  }

  query() {
    const request = {
      requestId: this.requestId,
      query: true
    };
    debug(`Sending query: ${JSON.stringify(request, null, 2)}`);
    this.connection.send(request);
  }

  send() {
    if (this.sent === true) {
      return;
    }

    const request = _objectSpread({
      requestId: this.requestId
    }, this.body);

    debug(`Sending request: ${JSON.stringify(request, null, 2)}`);
    this.connection.send(request);
  }

  addResponse(response) {
    debug(`Got response for request "${this.name}": ${JSON.stringify(response, null, 2)}`);
    const receivedAt = new Date().toISOString();
    this.responses.push({
      response,
      receivedAt
    });
    this.emit('response', _objectSpread({}, response, {
      request: {
        receivedAt,
        name: this.name,
        requestId: this.requestId
      }
    }));
  }

  getRequestId() {
    return this.requestId;
  }

}

exports.default = Request;