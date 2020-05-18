"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * @description   An API wraps the REST API for a Signal K server
 * @author        Fabian Tollenaar <fabian@decipher.industries>
 * @copyright     2018-2019, Fabian Tollenaar. All rights reserved.
 * @license       Apache-2.0
 * @module        @signalk/signalk-js-sdk
 */
var API = /*#__PURE__*/function () {
  function API(connection) {
    _classCallCheck(this, API);

    this.connection = connection;
    this.selfMRN = this.connection.self;
  }

  _createClass(API, [{
    key: "get",
    value: function get(path) {
      if (path.includes('.')) {
        path = path.replace(/\./g, '/');
      }

      if (typeof path !== 'string' || path.trim() === '') {
        path = '/';
      }

      if (path.charAt(0) !== '/') {
        path = "/".concat(path);
      }

      return this.connection.fetch(path);
    }
  }, {
    key: "put",
    value: function put(path, body) {
      if (path.includes('.')) {
        path = path.replace(/\./g, '/');
      }

      if (typeof path !== 'string' || path.trim() === '') {
        path = '/';
      }

      if (path.charAt(0) !== '/') {
        path = "/".concat(path);
      }

      return this.connection.fetch(path, {
        method: 'PUT',
        mode: 'cors',
        body: body && _typeof(body) === 'object' ? JSON.stringify(body) : body
      });
    }
    /**
     * Shortcut methods.
     * @TODO: investigate if we can generate these using a Proxy and signalk-schema, using this.options.version.
     */

  }, {
    key: "getMeta",
    value: function getMeta(path) {
      return this.get(path).then(function (result) {
        if (!result || _typeof(result) !== 'object') {
          return null;
        }

        if (!result.hasOwnProperty('meta')) {
          return null;
        }

        return result.meta;
      });
    }
  }, {
    key: "sources",
    value: function sources() {
      return this.get('/sources');
    }
  }, {
    key: "resources",
    value: function resources() {
      return this.get('/resources');
    }
  }, {
    key: "mrn",
    value: function mrn() {
      return this.get('/self');
    }
  }, {
    key: "vessels",
    value: function vessels() {
      return this.get('/vessels');
    }
  }, {
    key: "aircraft",
    value: function aircraft() {
      return this.get('/aircraft');
    }
  }, {
    key: "aton",
    value: function aton() {
      return this.get('/aton');
    }
  }, {
    key: "sar",
    value: function sar() {
      return this.get('/sar');
    }
  }, {
    key: "version",
    value: function version() {
      return this.get('/version');
    }
  }, {
    key: "self",
    value: function self(path) {
      if (typeof path !== 'string' || path.charAt(0) !== '/') {
        path = '';
      }

      return this.connection.fetch("/vessels/self".concat(path));
    }
  }, {
    key: "vessel",
    value: function vessel(mrn, path) {
      if (typeof path !== 'string' || path.charAt(0) !== '/') {
        path = '';
      }

      return this.connection.fetch("/vessels/".concat(mrn).concat(path));
    }
  }, {
    key: "name",
    value: function name() {
      return this.self('/name');
    }
  }, {
    key: "getGroup",
    value: function getGroup(group, path) {
      var vessel = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'self';

      if (typeof path !== 'string' || path.charAt(0) !== '/') {
        path = '';
      }

      if (vessel === 'self') {
        return this.self("/".concat(group).concat(path));
      }

      return this.vessel(vessel, "/".concat(group).concat(path));
    }
  }, {
    key: "communication",
    value: function communication() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('communication', path, vessel);
    }
  }, {
    key: "design",
    value: function design() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('design', path, vessel);
    }
  }, {
    key: "electrical",
    value: function electrical() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('electrical', path, vessel);
    }
  }, {
    key: "environment",
    value: function environment() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('environment', path, vessel);
    }
  }, {
    key: "navigation",
    value: function navigation() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('navigation', path, vessel);
    }
  }, {
    key: "notifications",
    value: function notifications() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('notifications', path, vessel);
    }
  }, {
    key: "performance",
    value: function performance() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('performance', path, vessel);
    }
  }, {
    key: "propulsion",
    value: function propulsion() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('propulsion', path, vessel);
    }
  }, {
    key: "sails",
    value: function sails() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('sails', path, vessel);
    }
  }, {
    key: "sensors",
    value: function sensors() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('sensors', path, vessel);
    }
  }, {
    key: "steering",
    value: function steering() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('steering', path, vessel);
    }
  }, {
    key: "tanks",
    value: function tanks() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      var vessel = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'self';
      return this.getGroup('tanks', path, vessel);
    }
  }]);

  return API;
}();

exports["default"] = API;