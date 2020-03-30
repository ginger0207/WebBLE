// const customServiceUUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const customServiceUUID = 0xFFE0;
// const customServiceUUID = "0000180a-0000-1000-8000-00805f9b34fb";
const customCharacteristicUUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
// const customCharacteristicUUID = "0xFFE1";

let button_connection = document.getElementById("ble-connection");
let button_disconnection = document.getElementById("ble-disconnection");
let button_selectDevice = document.getElementById("selectKnownDevice");
let button_scanQRcode = document.getElementById("scanQRcode");
let logText = document.getElementById("log");
let selectOption = document.querySelector(".selectDevices");
let aliasSubmit = document.querySelector(".aliasSubmit");
let selectSubmit = document.querySelector(".selectSubmit");

let dataBuffer = null;
let bleDevice = null;
let bleDeviceName = null;
let isConnected = false;

let deviceAlias = {};

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

if (localStorage.getItem("deviceName")) {
  button_selectDevice.style.display = "block";
}
button_selectDevice.addEventListener("click", (event) => {
  let devices = JSON.parse(localStorage.getItem("deviceName"));
  let optionString = "";
  for (device in devices) {
    optionString += `<option value="${device}">${devices[device]}</option>`;
    console.log(`${device}: ${devices[device]}`);
  }
  selectOption.style.display = "block";
  selectOption.innerHTML = 
  `<form>
  <span style="color: aliceblue;">select you device: <span>
  <select name="Device" id="selectedDevice">`
  + optionString
  +`<input type="submit" value="Connect" class="btn btn-primary btn-sm selectSubmit ml-2 mr-2">
  </select>
  </form>`;

  let selectAndConnect = document.querySelector(".selectSubmit")
  selectAndConnect.addEventListener("click", (event) => {
    event.preventDefault();
    let selected = document.getElementById("selectedDevice");
    bleDeviceName = selected.options[selected.selectedIndex].value;
    console.log(selected.options[selected.selectedIndex].value);
    connect();
  });
});

aliasSubmit.addEventListener("click", (event => {
  let name = document.querySelector("div form input");
  deviceAlias[bleDeviceName] = name.value;
  localStorage.setItem("deviceName", JSON.stringify(deviceAlias));
  name.value = "";
  event.preventDefault();
}));

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
    isConnected = true;
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
    sessionStorage.lastDevice = device.id;
    log(`Device name: ${device.name}`);
    bleDeviceName = device.name;
    let alias = document.querySelector(".alias");
    alias.style.display = "block";
    button_connection.style.display = "none";
    button_disconnection.style.display = "block";
    button_selectDevice.style.display = "none";
    button_scanQRcode.style.display = "none";
    selectOption.style.display = "none";
    return device.gatt.connect();
  })
  .then(server => {
    log("> Getting Services...", "append");
    return server.getPrimaryService(customServiceUUID);
    // return server.getPrimaryServices();
  })
  .then(service => {
    log("> Getting Characteristics...", "append");
    console.log(service);
    return service.getCharacteristics(customCharacteristicUUID);
  })
  .then(characteristic => {
    console.log(characteristic[0]);
    characteristic[0].startNotifications().then(res => {
      characteristic[0].addEventListener('characteristicvaluechanged', getData)
    })
    log("> Listening...", "append");
  })
  .catch(err => {
    log(err);
  })
}

function disconnect() {
  if (!isConnected) {
    log("No device connected");
    return;
  }
  log("Disconnecting from Bluetooth Device...");
  if (bleDevice.gatt.connected) {
    isConnected = false;
    bleDevice.gatt.disconnect();
    let alias = document.querySelector(".alias");
    alias.style.display = "none";
    button_connection.style.display = "block";
    button_disconnection.style.display = "none";
    button_selectDevice.style.display = "block";
    button_scanQRcode.style.display = "block";
    log("> finished", "append")
  } else {
    log("> Bluetooth Device is already disconnected");
  }
}

function onDisconnected() {
  log("> Bluetooth Device disconnected", "append");
  if (isConnected) {
    exponentialBackoff(10, 5,
      function toTry() {
        time("Connecting to Bluetooth Device...", "append");
        return bleDevice.gatt.connect();
      },
      function success() {
        log("> Bluetooth Device connected.", "append");
      },
      function fail() {
        time("Failed to reconnect.", "append");
      });
  }
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

// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
function exponentialBackoff(maxRetry, delay, toTry, success, fail) {
  toTry().then(result => success(result))
  .catch(_ => {
    if (maxRetry === 0) {
      return fail();
    }
    time('Retrying in ' + delay + 's... (' + maxRetry + ' tries left)');
    setTimeout(function() {
      exponentialBackoff(--maxRetry, delay * 2, toTry, success, fail);
    }, delay * 1000);
  });
}

function time(text) {
  log('[' + new Date().toJSON().substr(11, 8) + '] ' + text);
}
