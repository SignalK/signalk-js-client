# Signal K JavaScript Client Library

## Installation

Install from npm

```
$ npm install signalk-client
```

## Usage

```javascript
/* Get a reference to the Client class */
/* var Client = require('signalk-client').Client; */
import {Client} from 'signalk-client';

/* Set up some event handlers */
handleClose = function(code, description) {
  console.warn('Connection was closed with the following code: ' + code + ': ' + description);
};

handleError = function(error) {
  console.error(error);
};

handleMessage = function(message) {
  $('.value').innerHTML = message.updates[0].values[0].value;
};

handleOpen = function() {
  console.log('Connection established');
};

/* Create a new Signal K Client with the callbacks, prefer v1 of the API */
const skClient = new Client({
  hostname: 'localhost',
  useTLS: true,
  version: 'v1',
  onClose: handleClose,
  onError: handleError,
  onMessage: handleMessage,
  onOpen: handleOpen
});

/* Open the WebSockets connection, display some system information */
skClient.connect().then(function(skConnection) {
  skConnection.subscribe('navigation.speedOverGround');

  skConnection.getMeta('navigation.speedOverGround').then(function(meta) {
    $('.units').innerHTML = meta.units;
    $('.label').innerHTML = meta.longName;
  });

  $('.systemInfo').innerHTML =
    '<ul><li>Host:' + skConnection.hostname +
    '<li>' + skConnection.version + '</ul>';
});
```
## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#skConnection">skConnection</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#skDelta">skDelta</a> : <code>Object</code></dt>
<dd><p>See documentation on the <a href="http://signalk.org/specification/master/data_model.html#delta-format">Signal K Delta</a>
  message documentation.</p>
</dd>
<dt><a href="#closeHandler">closeHandler</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#errorHandler">errorHandler</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#messageHandler">messageHandler</a> : <code>function</code></dt>
<dd></dd>
<dt><a href="#newHostHandler">newHostHandler</a> : <code>function</code></dt>
<dd></dd>
</dl>

<a name="Client"></a>

## Client
**Kind**: global class  
**Summary**: Create a new Signal K Client  

* [Client](#Client)
    * [new Client(options, [mdns])](#new_Client_new)
    * [.connect(subscriptionType)](#Client+connect)
    * [.connectSync()](#Client+connectSync) ⇒ [<code>skConnection</code>](#skConnection)
    * [.get(path)](#Client+get) ⇒ <code>Promise</code>
    * [.getAvailableVersions()](#Client+getAvailableVersions) ⇒ <code>Promise</code>
    * [.getSelf()](#Client+getSelf) ⇒ <code>Promise</code>
    * [.getSelfMatcher()](#Client+getSelfMatcher) ⇒ <code>Promise</code>
    * [.getMeta([path])](#Client+getMeta) ⇒ <code>Promise</code>
    * [.startDiscovery(onNewHost)](#Client+startDiscovery)
    * [.stopDiscovery()](#Client+stopDiscovery)

<a name="new_Client_new"></a>

### new Client(options, [mdns])
The constructor can take either a single string parameter which will be used as a host to connect to or a
configuration object with the parameters below. Note, that if you're using mdns, but _not_ passing any configuration
parameters, you MUST pass either an empty Object or `null` as the first parameter.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> \| <code>string</code> | If a string is passed, the host to connect to, assumes default ports. If more   configuration is required pass an object with the properties described below. |
| options.hostname | <code>string</code> | Host to connect to, e.g. localhost |
| [options.port] | <code>number</code> | Override the standard ports of 80/443 |
| [options.useTLS] | <code>boolean</code> | Set to `true` if the client should use TLS, defaults to `false` |
| [options.version] | <code>string</code> | string indicating the version of the Signal K API the client should use, defaults   to v1 |
| [options.onClose] | [<code>closeHandler</code>](#closeHandler) | callback called when the connection is closed |
| [options.onError] | [<code>errorHandler</code>](#errorHandler) | callback called when an error occurs |
| [options.onMessage] | [<code>messageHandler</code>](#messageHandler) | callback called whenever data is received |
| [options.onOpen] | <code>function</code> | callback called when the connection is opened, takes no parameters |
| [mdns] | <code>Object</code> | If you want to use mDNS with the Signal K client, pass it in here |

**Example**  
```js
import mdns from 'mdns';

const handleClose = function(code, description) {
  console.warn('Connection was closed with the following code: ' + code + ': ' + description);
};

const handleError = function(error) {
  console.error(error);
};

const handleMessage = function(message) {
  $('.messageElement').innerHTML = JSON.stringify(message, null, 2);
};

handleOpen = function() {
  console.log('Connection established');
};

const skClient = new Client({
  hostname: 'localhost',
  useTLS: true,
  version: 'v1',
  onClose: handleClose,
  onError: handleError,
  onMessage: handleMessage,
  onOpen: handleOpen
});

// or, if not using WebSockets and just interested in connecting to a specific server for the HTTP API
const skClient = new Client('localhost');

// or, using mDNS to find servers
const skClient = new Client(null, mdns);

// or, specifying some settings with mdns
const skClient = new Client({
  onMessage: handleMessage
}, mdns);
```
<a name="Client+connect"></a>

### client.connect(subscriptionType)
The `connect` method establishes a Signal K WebSocket stream connection. If called with no parameter, `connect`
connects with the `subscribe` query parameter set to `none` and requires that the call to `connect` is followed by a
to one of the `subscribe*` functions on the [skConnection](#skConnection) object within the returned Promise.

Refer the documentation of the [Subscription
Protocol](http://signalk.org/specification/master/subscription_protocol.html) for more details.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Summary**: Connect to a Signal K WebSocket stream. Takes a single optional parameter and returns a Promise.  

| Param | Type | Description |
| --- | --- | --- |
| subscriptionType | <code>enum</code> | One of `none`, `self` or `all`. |

**Example**  
```js
import mdns from 'mdns';
import Primus from 'primus';

// Event handler setup and client instantiation, as above

const skConnection = skClient.connect().then(function(skConnection) {
  skConnection.subscribe('navigation.*', 'environment.*', 'propulsion.*')

  // or
  skConnection.subscribe({
    "context": "vessels.self",
    "subscribe": [{
      "path": "navigation.*"
    }, {
      "path": "environment.*"
    }, {
      "path": "propulsion.*"
    }]
  });

  // or
  skConnection.subscribeAll();
});

// or, if the host you're connecting to does not support the subscription protocol
const skConnection = skClient.connect('self').then(function(skConnection) {
  // do something with the skConnection object.
});
```
<a name="Client+connectSync"></a>

### client.connectSync() ⇒ [<code>skConnection</code>](#skConnection)
`The connectSync` method takes the same arguments as the connect method and returns an [skConnection](#skConnection) object.

This is a blocking method, prefer the Promise based connect instead.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: [<code>skConnection</code>](#skConnection) - A Signal K Connection object  
**Example**  
```js
const skConnection = skClient.connect('self');

skConnection.subscribeAll();

// or any of the other methods as described above
```
<a name="Client+get"></a>

### client.get(path) ⇒ <code>Promise</code>
A convenience function to get Signal K data from the connected server. This is basically equivalent to usinging the
JavaScript Fetch API, with a base path of `<protocol>://<host>:[<port>]/signalk/<version>/api`.

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | path to fetch |

**Example**  
```js
skClient.get('/vessels').then(function(result) {
  console.log(result); // urn:mrn:signalk:uuid:c0d79334-4e25-4245-8892-54e8ccc8021d
});
```
<a name="Client+getAvailableVersions"></a>

### client.getAvailableVersions() ⇒ <code>Promise</code>
Returns an array of version objects describing the Signal K versions that the server supports.

A client application may wish to use this information for diagnostic purposes or for finer-grained control over the
version of Signal K it is using.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Example**  
```js
skClient.getAvailableVersions().then(function(result) {
  result.forEach(function(version) {
    console.log(version.id + ': ' + version.version); // v1: 1.3.1, v2: 2.0.0.rc1
  };
});
```
<a name="Client+getSelf"></a>

### client.getSelf() ⇒ <code>Promise</code>
Gets the current full tree from the Signal K server for the `/vessels/self` path.

This can be useful prior to subscribing to the WebSockets stream to prepopulate an instrument panel, especially for
slowly changing data points which would otherwise remain blank until they appeared in the data stream.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Example**  
```js
skClient.getSelf().then(function(result) {
  console.log(result);
});
```
<a name="Client+getSelfMatcher"></a>

### client.getSelfMatcher() ⇒ <code>Promise</code>
Returns a function which can be used to filter a WebSockets stream for the vessel specified by `self`. Generally, it
is better to let the server handle the filtering and only subscribe to to the `self` context. However, this can be
useful when displaying data for many vessels (e.g. on a live chart), while maintaining a separate display of local
vessel data.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Example**  
```js
skClient.getSelfMatcher().then(function(fnFilter) {
  // do something with the filter
});
```
<a name="Client+getMeta"></a>

### client.getMeta([path]) ⇒ <code>Promise</code>
Get metadata for a specific path. Unless a specific context is passed, assumes `self`.

**Kind**: instance method of [<code>Client</code>](#Client)  
**Returns**: <code>Promise</code> - The metadata object contains mostly optional properties. The only required property is `units`. Everything else is
optional.  

| Param | Type | Description |
| --- | --- | --- |
| [path] | <code>string</code> | Path to get metadata for. |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| shortName | <code>string</code> | Human friendly, appreviated label |
| longName | <code>string</code> | Human friendly, spelled out label |
| units | <code>string</code> | One of the Signal K SI abbreviations listed in   [Appendix A](http://signalk.org/specification/master/keys/) of the Specification. |
| min | <code>Number</code> | minimum display value for the path. |
| max | <code>Number</code> | maximum expected values for the path. |
| colors | <code>Object</code> | Specifies display colors for different zone types |
| zones | <code>Array.&lt;Zone&gt;</code> | an array of display zones   - `lower` and `upper` start and stop points of zone, the first zone may elide `lower` and last zone `upper`   - `state` one of `alarm`, `warn`, `normal`   - `methods` an array of methods that the client should use to alert the user if the value enters the zone.   Options are `audible` and `visual`   - `message` message that should be displayed next to the value |

**Example**  
```js
skClient.getMeta('electrical.batteries.1.voltage').then(function(meta) {
  console.log(meta);
  // {
  //   "shortName": "Volts",
  //   "longName": "House Battery Voltage",
  //   "units": "V",
  //   "min": 0,
  //   "max": 16,
  //   "colors": {
  //     "alarm": "#f00",
  //     "warn": "#ff0",
  //     "normal": "#ddd"
  //   },
  //   "zones": [{
  //     "upper": 10,
  //     "state": "alarm",
  //     "methods": ["audible", "visual"],
  //     "message": "Critically low voltage"
  //   }, {
  //     "lower": 10,
  //     "upper": 11.5,
  //     "state": "warn",
  //     "methods": ["visual"],
  //     "message": "Low voltage"
  //   }]
  // }
});
```
<a name="Client+startDiscovery"></a>

### client.startDiscovery(onNewHost)
Start mDNS based Signal K server discovery

**Kind**: instance method of [<code>Client</code>](#Client)  

| Param | Type | Description |
| --- | --- | --- |
| onNewHost | [<code>newHostHandler</code>](#newHostHandler) | Function called whenever a new Signal K host is discovered |

**Example**  
```js
function gotNewHost(hostInfo) {
 console.log(hostInfo);
}

skClient.startDiscovery(gotNewHost);
```
<a name="Client+stopDiscovery"></a>

### client.stopDiscovery()
Stop mDNS Signal K server discovery

**Kind**: instance method of [<code>Client</code>](#Client)  
<a name="skConnection"></a>

## skConnection : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| hostname | <code>string</code> | the host ultimately connected to. This is typically the same as the host passed to the   constructor, but might be different if the server has a different WebSockets host configured or if the client   received an HTTP redirect or if the host was discovered via mDNS. |
| version | <code>string</code> | the version of the Signal K API actually being used. Typically the same as the one   requested, but if the server doesn't support the requested version, the next lower version that it does support   will be what's used. |
| locale | <code>string</code> | the server's locale, used when returning meta data such as unit names and labels. |
| send | <code>function</code> | a function which takes a single parameter, either an object or a string to send to the   server. |
| disconnect | <code>function</code> | a function which takes no parameters and disconnects the WebSockets stream. |
| subscribe | <code>function</code> | a function which takes a variable number of string parameters and subscribes to those   paths in the default (self) context. Alternatively, it can take a full Signal K subscription object. |
| unsubscribe | <code>function</code> | the inverse of the subscribe method. |
| subscribeAll | <code>function</code> | a convienence function which subscribes the client to all Signal K paths. |
| unsubscribeAll | <code>function</code> | a convienence function which unsubscribes the client from all Signal K paths. |

<a name="skDelta"></a>

## skDelta : <code>Object</code>
See documentation on the [Signal K Delta](http://signalk.org/specification/master/data_model.html#delta-format)
  message documentation.

**Kind**: global typedef  
<a name="closeHandler"></a>

## closeHandler : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> | Reason code |
| description | <code>string</code> | Message explaining reason for the connection closing |

<a name="errorHandler"></a>

## errorHandler : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>Error</code> | Error object returned by the underlying WebSocket implementation |

<a name="messageHandler"></a>

## messageHandler : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| message | [<code>skDelta</code>](#skDelta) | Signal K message object |

<a name="newHostHandler"></a>

## newHostHandler : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| newHost | <code>Object</code> | Signal K host description object |

