"use strict";

var _bonjour = _interopRequireDefault(require("bonjour"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const bonjour = (0, _bonjour.default)();
const browser = bonjour.find({
  type: 'signalk-http'
});
console.log(Object.keys(bonjour));
browser.on('up', service => {
  console.log(JSON.stringify(service, null, 2));
  browser.stop();
  process.exit();
});
browser.start();
setTimeout(() => {
  browser.stop();
  process.exit();
}, 10000);