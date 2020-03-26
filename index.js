// const customServiceUUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const customServiceUUID = 0xFFE0;
// const customServiceUUID = "0000180a-0000-1000-8000-00805f9b34fb";
const customCharacteristicUUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
// const customCharacteristicUUID = "0xFFE1";

let button_connection = document.getElementById("ble-connection");
let button_disconnection = document.getElementById("ble-disconnection");
let button_scanQRcode = document.getElementById("scanQRcode");
let logText = document.getElementById("log");

let dataBuffer = null;
let bleDevice = null;
let bleDeviceName = null;
let connected = false;

button_connection.addEventListener("click", (event) => {
  bleDeviceName = null;
  connect();
});

button_disconnection.addEventListener("click", (event) => {
  disconnect();
});

button_scanQRcode.addEventListener("click", (event) => {
  scannerState.toggleState();
  if (!scannerState.init) {
    scannerState.init = true;
  }
});

class ScannerState {
  constructor() {
    this.state = "off";
    this.init = false;
    this.scanner = null;
    this.camera = null;
  }
  toggleState() {
    if (this.state === "off") {
      this.state = "on";
      this.startScanning();
      button_scanQRcode.innerText = "Stop scanning";
      let videoContainer = document.querySelector(".video");
      videoContainer.style.display = "block";
    } else if (this.state === "on") {
      this.state = "off";
      this.scanner.stop();
      button_scanQRcode.innerText = "Scan QRcode";
      let videoContainer = document.querySelector(".video");
      videoContainer.style.display = "none";
    }
  }
  startScanning() {
    this.scanner = new Instascan.Scanner({ 
      video: document.getElementById('preview'),
      mirror: false
    });
    this.scanner.addListener('scan', (content) => {
      console.log(content);
      bleDeviceName = content;
      log(`From QRcode: ${content}`);
      if (content) {
        this.toggleState();
        connect();
      }
    });
    Instascan.Camera.getCameras()
      .then((cameras) => {
        console.log(cameras);
        if (cameras.length > 0) {
          this.camera = cameras[cameras.length - 1];
          this.scanner.start(cameras[cameras.length - 1]);
        } else {
          console.error('No cameras found.');
        }
    }).catch(function (e) {
      console.error(e);
    });
  }
};

let scannerState = new ScannerState();

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

function connect() {
  let constraint;
  if (bleDeviceName) {
    constraint = {
      filters: [
        {
          name: bleDeviceName
        }
      ],
      optionalServices: [customServiceUUID]
    }
  } else {
    constraint = {
      acceptAllDevices: true,
      optionalServices: [customServiceUUID]
    }
  }
  navigator.bluetooth.requestDevice(constraint)
  .then(device => {
    bleDevice = device;
    sessionStorage.lastDevice = device.id;
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
    log("listening...");
  })
  .catch(err => {
    log(err);
  })
}

function disconnect() {
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
