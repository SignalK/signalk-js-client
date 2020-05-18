"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.Discovery = exports.Client = void 0;

var _client = _interopRequireDefault(require("./lib/client"));

var _discovery = _interopRequireDefault(require("./lib/discovery"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */
var Client = _client["default"];
exports.Client = Client;
var Discovery = _discovery["default"];
exports.Discovery = Discovery;
var _default = _client["default"];
exports["default"] = _default;