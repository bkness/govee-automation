    
const res = await fetch('http://localhost:8000/lights')
const { data } = await res.json()
const device = data.devices

const kitchen = device.filter(d => d.deviceName === 'Kitchen')
kitchen.forEach(d => console.log(d.device))