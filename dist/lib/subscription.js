"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/web.dom.iterable");

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Subscription extends _eventemitter.default {
  constructor(connection, api) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    super();
    this.connection = connection;
    this.api = api;
    this.active = false;

    this._listener = data => this.message(data);

    this.options = _objectSpread({
      context: '*',
      subscribe: [{
        path: '*'
      }]
    }, options);
  }

  subscribe() {
    const subscription = {
      context: this.options.context,
      subscribe: this.options.subscribe,
      format: 'delta',
      policy: 'instant'
    };
    this.connection.on('message', this._listener.bind(this));
    this.connection.send(JSON.stringify(subscription));
    this.active = true;
    this.emit('subscribe');
    return Promise.resolve(this);
  }

  unsubscribe() {
    this.active = false;
    this.connection.removeListener('message', this._listener);
    this.connection.send(JSON.stringify({
      context: 'vessels.dont_send_me_anything',
      subscribe: [{
        path: 'dont_send_me_anything.dont_send_me_anything'
      }],
      format: 'delta',
      policy: 'instant'
    }));
    this.emit('unsubscribe');
    return Promise.resolve(this);
  }

  message(data) {
    if (this.active === false) {
      return;
    }

    if (typeof data === 'string' && data.trim() !== '') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        this.emit('error', e);
      }
    }

    if (data && typeof data === 'object' && data.hasOwnProperty('updates')) {
      this.emit('delta', data);
    }
  }

}

exports.default = Subscription;