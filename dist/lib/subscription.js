"use strict";

require("core-js/modules/es.object.assign");

require("core-js/modules/es.promise");

require("core-js/modules/es.string.trim");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _eventemitter = _interopRequireDefault(require("eventemitter3"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Subscription extends _eventemitter.default {
  constructor(connection, api) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    let identifier = arguments.length > 3 ? arguments[3] : undefined;
    super();
    this.connection = connection;
    this.api = api;
    this.active = false;

    this._listener = data => this.message(data);

    this.identifier = identifier;
    this.options = _objectSpread({
      context: '*',
      subscribe: [{
        path: '*'
      }]
    }, options);
  }

  getSubscriptionData() {
    return Object.assign({}, {
      options: this.options,
      identifier: this.identifier
    });
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