let button_connection = document.getElementById("ble-connection");
let button_disconnection = document.getElementById("ble-disconnection");
let logText = document.getElementById("log");

let bleDevice = null;
let connected = false;

button_connection.addEventListener("click", (event) => {
  connect(event);
});

button_disconnection.addEventListener("click", (event) => {
  disconnect(event);
});

function log(v) {
  var line = Array.prototype.slice.call(arguments).map(function(argument) {
    return typeof argument === 'string' ? argument : JSON.stringify(argument);
  }).join(' ');

  logText.textContent += line + '\n';
  console.log(line);
}

function connect(event) {
  console.log("in connect funciton!");
  console.log(event);
  navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    // optionalServices: ['battery_service']
  })
  .then(device => {
    // console.log(device.name);
    bleDevice = device;
    log(device.name);
    connected = true;
    return device.gatt.connect();
  })
  .catch(err => {
    console.log(err);
  })
}

function disconnect(event) {
  if (!connected) {
    return;
  }
  log("Disconnecting from Bluetooth Device...");
  if (bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
    log("finished")
  } else {
    log("> Bluetooth Device is already disconnected");
  }
}