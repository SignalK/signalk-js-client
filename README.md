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

// Default options for instantiating a client:
const defaults = {
  hostname: 'localhost',
  port: 3000,
  useTLS: true,
  useAuthentication: false,
  notifications: true,
  autoConnect: false,
  reconnect: true,
  maxRetries: Infinity,
  maxTimeBetweenRetries: 2500,
  username: null,
  password: null,
  deltaStreamBehaviour: 'none',
}

// Instantiate client
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: false,
  reconnect: true,
  autoConnect: false,
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
  password: 'signalk',
})

// Discover client using mDNS
// Params: bonjour lib, search time
const bonjour = Bonjour()
const discovery = new Discovery(bonjour, 60000)

// Timeout fires when search time is up and no servers were found
discovery.on('timeout', () => console.log('No SK servers found'))

// Found fires when a SK server was found
discovery.on('found', (server) => {
  if (server.isMain() && server.isMaster()) {
    client = server.createClient({
      useTLS: false,
      useAuthentication: true,
      reconnect: true,
      autoConnect: true,
      notifications: false,
      username: 'sdk@decipher.industries',
      password: 'signalk',
    })
  }
})

// Delta Stream over WS usage
// 1. Stream behaviour selection
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: false,
  reconnect: true,
  autoConnect: false,
  notifications: false,
  // Either "self", "all", "none", or null (see below)
  // - null: no behaviour is set for the delta stream, default behaviour is used. Use this option when connecting to older devices that don't support the subscription modifiers per query request. See https://signalk.org/specification/1.4.0/doc/subscription_protocol.html.
  // - "self" provides a stream of all local data of own vessel
  // - "all" provides a stream of all data for all vessels
  // - "none" provides no data over the stream
  deltaStreamBehaviour: 'self',
})

// 2. Subscribe to specific Signal K paths
client = new Client({
  hostname: 'demo.signalk.org',
  port: 80,
  useTLS: false,
  reconnect: true,
  autoConnect: false,
  notifications: false,
  subscriptions: [
    {
      context: 'vessels.*',
      subscribe: [
        {
          path: 'navigation.position',
          policy: 'instant',
        },
      ],
    },
  ],
})

// 3. Listen to the "delta" event to get the stream data
client.on('delta', (delta) => {
  // do something with delta
})

// 4. Modify your subscription parameters. Can be a single object or an array.
client.subscribe([
  {
    context: 'vessels.*',
    subscribe: [
      {
        path: 'navigation.position',
        policy: 'instant',
      },
    ],
  },
])

// 5. Unsubscribe from all data paths.
client.unsubscribe()

// REST API usage
// 1. Fetch an entire group
client
  .API() // create REST API client
  .then((api) => api.navigation())
  .then((navigationGroupResult) => {
    // Do something with navigation group data
  })

// 2. Fetch a specific path
client
  .API() // create REST API client
  .then((api) => api.get('/vessels/self/navigation/position')) // Path can be specified using dotnotation and slashes
  .then((positionResult) => {
    // Do something with position data
  })

// 3. Fetch meta for a specific path
client
  .API() // create REST API client
  .then((api) => api.getMeta('vessels.self.navigation.position'))
  .then((positionMetaResult) => {
    // Do something with position meta data
  })

// 4. Fetch the entire tree for the local vessel
client
  .API() // create REST API client
  .then((api) => api.self())
  .then((selfResult) => {
    // Do something with boat data
  })

// ... check out the tests for more REST API examples
```

### Other Signal K Clients:

**Angular:**
Signal K client for the Angular framework
[signalk-client-angular](https://github.com/panaaj/signalk-client-angular)

### NOTES

- Node SK server responds with "Request updated" for access request responses. This is incorrect per spec
- Node SK server paths for access requests repsponses are not correct to spec (i.e. no /signalk/v1 prefix)
