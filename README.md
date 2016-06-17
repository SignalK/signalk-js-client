# signalk-js-client
Signal K JavaScript client library
Install:
=======

```
# Adapted from http://jaketrent.com/post/npm-install-local-files/
# In local git repository directory
git clone https://github.com/SignalK/signalk-js-client.git
cd signalk-js-client/
npm install

# now add a local link for npm
signalk-js-client$ sudo npm link
[sudo] password for robert: 
/usr/lib/node_modules/signalk-client -> /home/robert/gitrep/signalk-js-client

# change to project directory
# link in your local signalk-client project
freeboard-sk$ sudo npm link signalk-client
/home/robert/gitrep/signalk-java/signalk-static/freeboard-sk/node_modules/signalk-client -> /usr/lib/node_modules/signalk-client -> /home/robert/gitrep/signalk-js-client

freeboard-sk$ npm start

> freeboardk@0.0.1 start /home/robert/gitrep/signalk-java/signalk-static/freeboard-sk
> watchify index.js --outfile bundle.js

Error: Parsing file /home/robert/gitrep/signalk-java/signalk-static/freeboard-sk/lib/signalk.js: Unexpected token (3:0)
Error: Parsing file /home/robert/gitrep/signalk-java/signalk-static/freeboard-sk/lib/signalk.js: Unexpected token (116:0)
Error: Cannot find module 'mdns' from '/home/robert/gitrep/signalk-js-client'
Error: Cannot find module 'mdns' from '/home/robert/gitrep/signalk-js-client'
^C

# back to the signalk-js-dir
signalk-js-client$ npm install mdns
|
> mdns@2.3.3 install /home/robert/gitrep/signalk-js-client/node_modules/mdns
> node-gyp rebuild

make: Entering directory '/home/robert/gitrep/signalk-js-client/node_modules/mdns/build'
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_sd.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_browse.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_enumerate_domains.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_get_addr_info.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_process_result.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_ref.o                                                                                           
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_ref_deallocate.o                                                                                
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_ref_sock_fd.o                                                                                   
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_register.o                                                                                      
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_resolve.o                                                                                       
  CXX(target) Release/obj.target/dns_sd_bindings/src/dns_service_update_record.o                                                                                 
  CXX(target) Release/obj.target/dns_sd_bindings/src/mdns_utils.o                                                                                                
  CXX(target) Release/obj.target/dns_sd_bindings/src/network_interface.o                                                                                         
  CXX(target) Release/obj.target/dns_sd_bindings/src/socket_watcher.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_ref.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_create.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_deallocate.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_set_value.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_get_length.o
  CXX(target) Release/obj.target/dns_sd_bindings/src/txt_record_buffer_to_object.o
  SOLINK_MODULE(target) Release/obj.target/dns_sd_bindings.node
  COPY Release/dns_sd_bindings.node
make: Leaving directory '/home/robert/gitrep/signalk-js-client/node_modules/mdns/build'
mdns@2.3.3 node_modules/mdns
├── bindings@1.2.1
└── nan@2.3.5


> freeboardk@0.0.1 start /home/robert/gitrep/signalk-java/signalk-static/freeboard-sk
> watchify index.js --outfile bundle.js

All good now
```

Usage:
=====

Add:
```
var signalkClient = require('signalk-client').Client;
var signalk = new signalkClient;

var thisCallback = function(msg) {

	//for debug
	//console.log(JSON.stringify(msg));
        //do handling of messages here eg.

	$.each(listenerList, function(i, obj) {
		//console.log("Send msg to "+obj);
		obj.onmessage(msg, connection);
	});
	msg=null;
};

var connection;
// needs (hostname:port, callbackForOnMessage, onConnect, onDisconnect, onError, subscribe)
function connectDelta(host, thisCallback, onConnect, onDisconnect) {
    debug("Connecting to " + host);

    //try mdns
    connection = signalk.discoverAndConnect();
    if(connection){
	 return;
    }
    console.log("Could not use mdns, falling back to "+host);
  
    connection=signalk.connectDelta(host, thisCallback,
        function(skConnection) {
            skConnection.subscribeAll();
            onConnect();
        },
        function (skConnection){
                skConnection.close();
                debug('Disconnected');
        },
        function(error) {
            console.log(error)
        },
        'self'
        );
}

