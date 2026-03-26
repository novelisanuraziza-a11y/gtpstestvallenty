import { resolve } from "path";
import { PlayerInfo } from "./player/PlayerInfo";
import { PacketHandler, TankPacketType } from "./core/PacketHandler";
import { LoginHandler } from "./handlers/LoginHandler";
import { PacketSender } from "./net/PacketSender";

// Coba memuat addon C++ jika berhasil dibuild
let enet: any;
const addonPath = resolve(process.cwd(), "build/Release/enet_wrapper.node");
console.log(`[INIT] Loading ENet addon from: ${addonPath}`);
try {
    enet = require(addonPath);
    console.log(`[INIT] ENet native addon loaded successfully!`);
} catch (e: any) {
    console.warn(`[WARN] Failed to load ENet addon: ${e.message}`);
    console.warn("[WARN] Running in STUB mode - no real networking!");
    enet = {
        createHost: (port: number) => console.log(`[ENet Stub] Host created on port ${port}!`),
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
        try {
            const result = enet.createHost(PORT, MAX_PEERS, MAX_CHANNELS);
            console.log(`[INIT] createHost(${PORT}, ${MAX_PEERS}, ${MAX_CHANNELS}) returned: ${result}`);
            if (!result) {
                console.error("[ERROR] ENet host_create returned null/false! Port may already be in use or ENet init failed.");
                process.exit(1);
            }
        } catch(err: any) {
            console.error(`[ERROR] createHost threw exception: ${err.message}`);
            process.exit(1);
        }
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
            const nullIndex = data.indexOf(0, 4);
            const textEnd = nullIndex !== -1 ? nullIndex : data.length;
            let text = data.subarray(4, textEnd).toString("utf-8"); 
            console.log(`[TEXT DATA]: \n${text}`);
            
            if (text.includes("action|logon") || text.includes("requestedName|")) {
                LoginHandler.handleLogon(enet, event.peerId, event.connectID, this.peers, text);
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
}

const server = new GTPSServer();
server.startTick();
