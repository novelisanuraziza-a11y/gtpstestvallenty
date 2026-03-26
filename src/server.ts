import { resolve } from "path";
import { PlayerInfo } from "./player/PlayerInfo";
import { PacketHandler, TankPacketType } from "./core/PacketHandler";

// Coba memuat addon C++ jika berhasil dibuild
let enet: any;
try {
    enet = require(resolve(__dirname, "../../build/Release/enet_wrapper.node"));
} catch (e) {
    console.warn("Wajib melakukan `npm run build:addon` terlebih dahulu! Memuat stub mode sementara...");
    enet = {
        createHost: () => console.log("[ENet Stub] Host created!"),
        pollEvents: () => null,
        sendPacket: () => null,
        disconnectPeer: () => null
    };
}

const PORT = 17091; // Default GT port
const MAX_PEERS = 1000;
const MAX_CHANNELS = 2;

// ENET_PACKET_FLAG_RELIABLE is 1
const FLAG_RELIABLE = 1; 

class GTPSServer {
    private isRunning: boolean = false;
    private peers: Map<number, PlayerInfo> = new Map();

    constructor() {
        console.log("Starting GTPS / ENet Host...");
        enet.createHost(PORT, MAX_PEERS, MAX_CHANNELS);
        this.isRunning = true;
    }

    public startTick() {
        // Simple tick loop
        setInterval(() => this.tick(), 5);
        console.log(`Server listening on UDP port ${PORT}...`);
    }

    private tick() {
        let event;
        while ((event = enet.pollEvents())) {
            switch (event.type) {
                case "connect":
                    this.onConnect(event);
                    break;
                case "receive":
                    this.onReceive(event);
                    break;
                case "disconnect":
                    this.onDisconnect(event);
                    break;
            }
        }
    }

    private onConnect(event: any) {
        console.log(`[CONNECT] Peer incoming from ${event.ip} (ConnectID: ${event.connectID})`);
        
        const newPlayer = new PlayerInfo();
        newPlayer.ip = event.ip;
        newPlayer.netID = event.connectID;
        this.peers.set(event.connectID, newPlayer);
        
        // Contoh mengirim hello
        const helloPacket = Buffer.alloc(4);
        helloPacket.writeUInt32LE(1, 0); // 1 = Hello message type in growtopia
        enet.sendPacket(event.peerId, helloPacket, FLAG_RELIABLE);
    }

    private onReceive(event: any) {
        const data: Buffer = event.data;
        const type = data.readUInt32LE(0);
        console.log(`[RECEIVE] Type ${type} from ConnectID: ${event.connectID}, Length: ${data.length}`);

        // Parsing String Packet (Type 2, 3)
        if (type === 2 || type === 3) {
            let text = data.subarray(4, data.length - 1).toString('utf-8'); // Null terminated
            console.log(`[TEXT DATA]: \n${text}`);
            
            if (text.includes("action|logon") || text.includes("requestedName|")) {
                const lines = text.split("\n");
                let requestedName = "Guest_" + Math.floor(Math.random() * 999);
                for (const line of lines) {
                    if (line.startsWith("requestedName|")) {
                        requestedName = line.split("|")[1];
                    }
                }
                const p = this.peers.get(event.connectID);
                if (p) {
                    p.tankIDName = requestedName;
                    
                    // Coba muat data JSON lokal jika ada
                    const loadedData = PlayerInfo.loadFromJSON(requestedName);
                    if (loadedData) {
                        p.gems = loadedData.gems;
                        p.inventory = loadedData.inventory;
                        console.log(`[LOGIN] Akun lama ditemukan: ${requestedName} Gems: ${p.gems}`);
                    } else {
                        console.log(`[LOGIN] Akun baru: ${requestedName}`);
                        p.saveToJSON(); 
                    }
                }

                this.sendLogonAccept(event.peerId);
            }
        } else if (type === 4) {
            // Unpack TankPacket
            const tankData = PacketHandler.unpackTankPacket(data);
            if (tankData) {
                console.log(`[TANK-PACKET] Action: ${tankData.type} from NetID: ${tankData.netID}`);
                // Example handling movement
                if (tankData.type === TankPacketType.STATE) {
                    const p = this.peers.get(event.connectID);
                    if (p) {
                        p.x = tankData.x;
                        p.y = tankData.y;
                    }
                }
            }
        }
    }

    private onDisconnect(event: any) {
        console.log(`[DISCONNECT] Peer (ConnectID: ${event.connectID}) disconnected.`);
        this.peers.delete(event.connectID);
    }

    private sendLogonAccept(peerId: number) {
        // String Packet: type 3
        const logondoc = "action|logon_fail\n" // Just placeholder to test if connect succeeds, in GT real server this would be action|logon_accept
        const packet = Buffer.alloc(4 + logondoc.length + 1);
        packet.writeUInt32LE(3, 0);
        packet.write(logondoc, 4, "utf-8");
        packet.writeUInt8(0, packet.length - 1);
        
        enet.sendPacket(peerId, packet, FLAG_RELIABLE);
        console.log("[SERVER] Logon packet sent back.");
    }
}

const server = new GTPSServer();
server.startTick();
