/**
 * A basic STUN Server (still under development - not finished)
 * Author: Mert Özdemir <mertozdemircontact@icloud.com>
 */

const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const PORT = 3478;

// STUN Header için bazı sabitler
const MAGIC_COOKIE = 0x2112A442;
const TRANSACTION_ID = Buffer.from([
    0x21, 0x12, 0xA4, 0x42, // Transaction ID (16 Byte'lık random veri yerine sabit)
    0x63, 0x6E, 0x8F, 0x7F, 
    0x8F, 0x7F, 0x63, 0x6E,
    0x63, 0x6E, 0x8F, 0x7F
]);

// STUN Binding Request ve Binding Response tipi için kodlar
const BINDING_REQUEST = 0x0001;
const BINDING_RESPONSE = 0x0101;
const BINDING_ERROR_RESPONSE = 0x0111;

server.on('message', (message, rinfo) => {
    console.log(`Received message from ${rinfo.address}:${rinfo.port}`);

    // STUN Header Formatını kontrol et
    const msgType = message.readUInt16BE(0);
    const msgLength = message.readUInt16BE(2);

    if (msgType !== BINDING_REQUEST) {
        console.error('Unsupported message type');
        return;
    }

    // Yanıt için bir buffer oluştur
    const response = Buffer.alloc(20 + 8); // 20 Byte STUN Header + 8 Byte ATTR (Mapped Address)

    // STUN Header: Binding Response
    response.writeUInt16BE(BINDING_RESPONSE, 0);
    response.writeUInt16BE(8, 2); // Length (8 Byte'lık Mapped Address Attribute)
    response.writeUInt32BE(MAGIC_COOKIE, 4); // Magic Cookie
    TRANSACTION_ID.copy(response, 8); // Transaction ID

    // Mapped Address Attribute (IP ve Port)
    response.writeUInt16BE(0x0001, 20); // Mapped Address Type
    response.writeUInt16BE(8, 22); // Length (8 Byte'lık Mapped Address Attribute)
    response.writeUInt8(0x01, 24); // Family (IPv4)
    response.writeUInt8(0x00, 25); // Reserved
    response.writeUInt16BE(rinfo.port, 26); // Port
    response.writeUInt32BE(parseInt(rinfo.address.split('.').reverse().join(''), 10), 28); // IP Address (Little Endian)

    // Yanıtı istemciye gönder
    server.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
        if (err) {
            console.error('Error sending response:', err);
        } else {
            console.log(`Sent response to ${rinfo.address}:${rinfo.port}`);
        }
    });
});

// Sunucuyu başlat
server.on('listening', () => {
    const address = server.address();
    console.log(`STUN server listening on ${address.address}:${address.port}`);
});

server.bind(PORT);
