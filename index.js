// const customServiceUUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const customServiceUUID = 0xFFE0;
// const customServiceUUID = "0000180a-0000-1000-8000-00805f9b34fb";
const customCharacteristicUUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
// const customCharacteristicUUID = "0xFFE1";

let button_connection = document.getElementById("ble-connection");
let button_disconnection = document.getElementById("ble-disconnection");
let logText = document.getElementById("log");

let dataBuffer = null;
let bleDevice = null;
let connected = false;

button_connection.addEventListener("click", (event) => {
  connect(event);
});

button_disconnection.addEventListener("click", (event) => {
  disconnect(event);
});

function log(v, mode) {
  // var line = Array.prototype.slice.call(arguments).map(function(argument) {
  //   return typeof argument === 'string' ? argument : JSON.stringify(argument);
  // }).join(' ');

  if (mode === "append") {
    logText.textContent += v + '\n';
  } else {
    logText.textContent = v + '\n';
  }
  // logText.textContent += line + '\n';
  
  // console.log(line);
}

function connect(event) {
  navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [customServiceUUID]
  })
  .then(device => {
    bleDevice = device;
    log(`Device name: ${device.name}`);
    connected = true;
    return device.gatt.connect();
  })
  .then(server => {
    log('Getting Services...');
    return server.getPrimaryService(customServiceUUID);
    // return server.getPrimaryServices();
  })
  .then(service => {
    log('Getting Characteristics...');
    console.log(service);
    return service.getCharacteristics(customCharacteristicUUID);
    // let queue = Promise.resolve();
    // services.forEach(service => {
    //   queue = queue.then(_ => service.getCharacteristics().then(characteristics => {
    //     log('> Service: ' + service.uuid);
    //     characteristics.forEach(characteristic => {
    //       log('>> Characteristic: ' + characteristic.uuid + ' ' +
    //           getSupportedProperties(characteristic));
    //     });
    //   }));
    // });
    // return queue;
  })
  .then(characteristic => {
    console.log(characteristic[0]);
    characteristic[0].startNotifications().then(res => {
      characteristic[0].addEventListener('characteristicvaluechanged', getData)
    })
  })
  .catch(err => {
    log(err);
  })
}

function disconnect(event) {
  if (!connected) {
    log("No device connected");
    return;
  }
  log("Disconnecting from Bluetooth Device...");
  if (bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
    log("finished", "append")
  } else {
    log("> Bluetooth Device is already disconnected");
  }
  connected = false;
}

function getData(event) {
  console.log(event);
  console.log(event.target.value);
  console.log(event.target.value.buffer);
  dataBuffer = event.target.value;
  let bufferLength = dataBuffer.byteLength;
  let dataString = "";
  for (let i = 0; i < bufferLength; i++) {
    dataString += String.fromCharCode(dataBuffer.getUint8(i));
  }
  log(dataString);
}

/* Utils */

function getSupportedProperties(characteristic) {
  let supportedProperties = [];
  for (const p in characteristic.properties) {
    if (characteristic.properties[p] === true) {
      supportedProperties.push(p.toUpperCase());
    }
  }
  return '[' + supportedProperties.join(', ') + ']';
}