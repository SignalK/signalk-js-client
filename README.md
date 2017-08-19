# Signal K JavaScript Client Library

## Installation

```
$ npm install @signalk/client
```

Mdns is an optional dependency for doing [automatic
discovery](http://signalk.org/specification/master/connection.html).
It is not relevant in browser environment, but Browserify will fail if you don't ignore or exclude it explicitly as in
`--exclude mdns`. For Webpack you can [declare it as an
external](https://github.com/SignalK/instrumentpanel/blob/b66047dd6c3382d5981601ed0c7c58d39505fdb6/webpack.config.js#L36).

## Usage

```
var SignalKClient = require('@signalk/client').Client;
var signalk = new SignalKClient;
var connection;

var thisCallback = function(msg) {
  $.each(listenerList, function(i, obj) {
    obj.onmessage(msg, connection);
  });
};

function connectDelta(host, thisCallback, onConnect, onDisconnect) {
  debug("Connecting to " + host);

  // try mdns
  connection = signalk.discoverAndConnect();
  if(connection) {
    return;
  }

  console.log("Could not use mdns, falling back to " + host);

  connection = signalk.connectDelta(host, thisCallback,
    function(skConnection) {
      skConnection.subscribeAll();
      onConnect();
    },

    function(skConnection) {
      skConnection.close();
      debug('Disconnected');
    },

    function(error) {
      console.log(error)
    },

    'self'
  );
}
```
