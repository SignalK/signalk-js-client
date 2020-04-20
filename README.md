# Signal K JS Client

[![Build Status](https://travis-ci.org/SignalK/signalk-js-client.svg)](https://travis-ci.org/SignalK/signalk-js-client)

> A Javascript SDK for Signal K clients. Provides various abstract interfaces for discovering the Signal K server and communication via WebSocket & REST. Aims to implement all major APIs in the most recent Signal K version(s).


### INSTALLATION

```bash
[sudo] npm install --save @signalk/client
```

### BASIC USAGE
```javascript
import Client, { Discovery } from '@signalk/client'
import Bonjour from 'bonjour'

let client = null

// Instantiate client
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: true,
  reconnect: true,
  autoConnect: false
})

// Instantiate client with authentication
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: false,
  rejectUnauthorized: false, // Optional, set to false only if the server has a self-signed certificate
  useAuthentication: true,
  reconnect: true,
  autoConnect: false,
  username: 'demo@signalk.org',
  password: 'signalk'
})

// Discover client using mDNS
// Params: bonjour lib, search time
const bonjour = Bonjour()
const discovery = new Discovery(bonjour, 60000)

// Timeout fires when search time is up and no servers were found
discovery.on('timeout', () => console.log('No SK servers found'))

// Found fires when a SK server was found
discovery.on('found', server => {
  if (server.isMain() && server.isMaster()) {
    client = server.createClient({
      useTLS: false,
      useAuthentication: true,
      reconnect: true,
      autoConnect: true,
      notifications: false,
      username: 'sdk@decipher.industries',
      password: 'signalk'
    })
  }
})

// Delta Stream over WS usage
// 1. Stream behaviour selection
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: true,
  reconnect: true,
  autoConnect: false,
  notifications: false,
  // Either "legacy", "self", "all", "none", or "subscription" (see below)
  // - "legacy" is used to support older server implementations that do not yet support the query string API on the stream endpoint (such as iKommunicate)
  // - "self" provides a stream of all local data of own vessel
  // - "all" provides a stream of all data for all vessels
  // - "none" provides no data over the stream
  // - "subscription" - see below
  deltaStreamBehaviour: 'self'
})

// 2. Subscribe to specific Signal K paths
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: true,
  reconnect: true,
  autoConnect: false,
  notifications: false,
  deltaStreamBehaviour: 'subscription',
  subscription: {
    context: 'vessels.*',
    subscribe: [
      {
        path: 'navigation.position',
        policy: 'instant'
      }
    ]
  }
})

// 3. Listen to the "delta" event to get the stream data
client.on('delta', (delta) => {
  // do something with delta
})

// REST API usage
// 1. Fetch an entire group
client
  .API() // create REST API client
  .then(api => api.navigation())
  .then(navigationGroupResult => {
    // Do something with navigation group data
  })
  
// 2. Fetch a specific path
client
  .API() // create REST API client
  .then(api => api.get('/vessels/self/navigation/position'))  // Path can be specified using dotnotation and slashes
  .then(positionResult => {
    // Do something with position data
  })

// 3. Fetch meta for a specific path
client
  .API() // create REST API client
  .then(api => api.getMeta('vessels.self.navigation.position'))
  .then(positionMetaResult => {
    // Do something with position meta data
  })

// 4. Fetch the entire tree for the local vessel
client
  .API() // create REST API client
  .then(api => api.self())
  .then(selfResult => {
    // Do something with boat data
  })

// ... check out the tests for more REST API examples
```

### Other Signal K Clients:
**Angular:**
Signal K client for the Angular framework
[signalk-client-angular](https://github.com/panaaj/signalk-client-angular)


### WISHLIST
- [ ] Expand device access mechanism into its own EventEmitter
- [ ] Master/slave detection during discovery, with correct selection. Should emit an event if multiple mains+masters are found
- [ ] Dynamic REST API based on `signalk-schema`, auto-generated tests for each path so client can be used to test-drive servers
- [ ] Multiple sources for a datapoint/"select" feature
- [ ] History API support
- [ ] Port codebase & tests to Typescript
- [ ] Add an option to spawn a `WebWorker` for each `Connection`, offloading server comms to a different thread
- [x] Switch mDNS to bonjour (pure JS) implementation
- [ ] Add a React hook


### NOTES
- mDNS advert should advertise if server supports TLS
- Node SK server responds with "Request updated" for access request responses. This is incorrect per spec
- Node SK server paths for access requests repsponses are not correct to spec (i.e. no /signalk/v1 prefix)
- ~~Security is implemented, but the token type is currently hardcoded to `JWT` if no `token.type` is returned by a SK server. IMHO that default should be `Bearer`. See issue https://github.com/SignalK/signalk-server-node/issues/715 & PR https://github.com/SignalK/specification/pull/535~~
