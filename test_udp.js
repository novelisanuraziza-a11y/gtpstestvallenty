// Test UDP listener untuk verifikasi apakah packet GT Client sampai ke PC
const dgram = require('dgram');
const server = dgram.createSocket('udp4');

server.on('error', (err) => {
    console.error(`[UDP TEST] Server error: ${err}`);
    server.close();
});

server.on('message', (msg, rinfo) => {
    console.log(`[UDP TEST] ✅ PACKET RECEIVED from ${rinfo.address}:${rinfo.port} (${msg.length} bytes)`);
    console.log(`[UDP TEST] Raw hex: ${msg.toString('hex')}`);
});

server.on('listening', () => {
    const addr = server.address();
    console.log(`[UDP TEST] Listening on UDP ${addr.address}:${addr.port}`);
    console.log(`[UDP TEST] Sekarang coba connect GT Client, kalau ada paket masuk akan tercetak di sini!`);
});

server.bind(17091);
