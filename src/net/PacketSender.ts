import { TankPacketType, PacketHandler } from "../core/PacketHandler";

/**
 * PacketSender corresponds to the `packet_` and generic send functions in C++.
 */
export class PacketSender {

    // Sends a raw string packet (type 2 or 3)
    public static sendStringPacket(enet: any, peerId: number, type: number, data: string) {
        const payload = Buffer.alloc(5 + data.length);
        payload.writeUInt32LE(type, 0); // e.g., 2 for text, 3 for game message
        payload.write(data, 4, "utf-8");
        payload.writeUInt8(0, payload.length - 1); // Null terminator
        
        enet.sendPacket(peerId, payload, 1); // ENET_PACKET_FLAG_RELIABLE = 1
    }

    // Corresponds to `packet_(peer, "action|log\nmsg|...")`
    public static sendLog(enet: any, peerId: number, message: string) {
        this.sendStringPacket(enet, peerId, 3, `action|log\nmsg|${message}`);
    }

    // Sends logon_fail
    public static sendLogonFail(enet: any, peerId: number) {
        this.sendStringPacket(enet, peerId, 3, "action|logon_fail\n");
    }

    // Sends OnConsoleMessage
    public static sendConsoleMessage(enet: any, peerId: number, message: string) {
        // Console message is actually a variant list, but sometimes handled as string. 
        // We will implement sending VariantList properly for this later.
        // For simple logs, `action|log` is often enough.
        this.sendLog(enet, peerId, message);
    }
}
