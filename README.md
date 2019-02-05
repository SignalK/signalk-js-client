# Signal K JS SDK

> A Javascript SDK for Signal K servers. Provides various abstract interfaces for discovering (via optional mDNS) the Signal K server and communication via WebSocket & REST. Aims to implement all major APIs in the most recent Signal K version(s).


### INSTALLATION
This is not yet published on Github. If you'd like to use an early version, use the following command to install the SDK in your project:

```bash
[sudo] npm install --save fabdrol/signalk-js-client
```

### BASIC USAGE
```javascript
import Client, { Discovery } from '@signalk/signalk-js-sdk'
import mdns from 'mdns'

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
  hostname: 'hq.decipher.digital',
  port: 3000,
  useTLS: true,
  useAuthentication: true,
  reconnect: true,
  autoConnect: false,
  username: 'sdk@decipher.industries',
  password: 'signalk'
})

// Discover client using mDNS
// Params: mdns lib, search time
const discovery = new Discovery(mdns, 60000)

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
      username: 'sdk@decipher.industries',
      password: 'signalk'
    })
  }
})

// Subscribe to specific paths over WS
const subscription = {
  context: 'vessels.self',
  subscribe: [{ path: 'navigation.position' }]
}

client
  .connect()
  .then(() => client.subscribe(subscription))
  .catch(err => done(err))

client.on('delta', delta => {
  // do something with incoming delta message from subscription
})

// Subscribe to all paths over WS
client
  .connect()
  .then(() => client.subscribe())
  .catch(err => done(err))

client.on('delta', delta => {
  // do something with incoming delta message from subscription
})

// Unsubscribe
client.unsubscribe()

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

### PRE-1.0 RELEASE CHECKLIST
- [x] mDNS server discovery
- [x] Security/authentication (REST) support
- [x] Basic notifications/alarms support
- [x] Access Request mechanism (responding to requests, as a special case of notification)
- [x] Security/authentication (WS) support (relies on request/response)
- [x] PUT requests via request/response over WS
- [x] Access Request mechanism (basic requesting)
- [x] PUT requests via REST
- [x] Move mDNS stack into a separate class
- [ ] Write comprehensive README of supported options, methods, examples, etc


### FUTURE RELEASES
- [ ] Expand device access mechanism into its own EventEmitter, to automate the entire flow
- [ ] Master/slave detection during discovery, with correct selection. Should emit an event if multiple mains+masters are found
- [ ] Dynamic REST API based on `signalk-schema`, auto-generated tests for each path so client can be used to test-drive servers
- [ ] Full react-native compatibility (current version mostly works due to WS issues on RN)
- [ ] Multiple sources for a data point/"select" feature
- [ ] History API support
- [ ] Port codebase & tests to Typescript
- [ ] Add an option to spawn a `WebWorker` for each `Connection`, offloading server comms to a different thread


### NOTES
- (Note to self) Need to do PR for specification for access requests & make issue for node server & sdk to update
- mDNS advert should advertise wether server supports TLS (?)
- `PUT requests via REST` have been implemented, but don't have a valid test yet. Need to figure out how to test this
- Node SK server responds with "Request updated" for access request responses. This is incorrect per spec
- Node SK server paths for access requests repsponses are not correct to spec (i.e. no /signalk/v1 prefix)
- ~~Security is implemented, but the token type is currently hardcoded to `JWT` if no `token.type` is returned by a SK server. IMHO that default should be `Bearer`. See issue https://github.com/SignalK/signalk-server-node/issues/715 & PR https://github.com/SignalK/specification/pull/535~~