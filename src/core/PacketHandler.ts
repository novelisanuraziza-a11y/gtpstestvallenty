import { PlayerInfo } from '../player/PlayerInfo';
import { WorldInfo } from '../world/WorldInfo';

export enum PacketType {
    HELLO = 1,
    TEXT = 2,
    GAME_MESSAGE = 3,
    TANK = 4,
}

export enum TankPacketType {
    STATE = 0,
    CALL_FUNCTION = 1,
    UPDATE_STATUS = 2,
    TILE_CHANGE_REQUEST = 3,
    SEND_MAP_DATA = 4,
    SEND_TILE_UPDATE_DATA = 5,
    SEND_TILE_UPDATE_DATA_MULTIPLE = 6,
    TILE_ACTIVATE_REQUEST = 7,
    TILE_APPLY_DAMAGE = 8,
    SEND_INVENTORY_STATE = 9,
    ITEM_ACTIVATE_REQUEST = 10,
    ITEM_ACTIVATE_OBJECT_REQUEST = 11,
    SEND_TILE_TREE_STATE = 12,
    MODIFY_ITEM_INVENTORY = 13,
    ITEM_CHANGE_OBJECT = 14,
    SEND_LOCK = 15,
    SEND_ITEM_DATABASE_DATA = 16,
    SEND_PARTICLE_EFFECT = 17,
    SET_ICON_STATE = 18,
    ITEM_EFFECT = 19,
    SET_CHARACTER_STATE = 20,
    PING_REPLY = 21,
    PING_REQUEST = 22,
    GOT_PUNCHED = 23,
    APP_CHECK_RESPONSE = 24,
    APP_INTEGRITY_FAIL = 25,
    DISCONNECT = 26,
    BATTLE_JOIN = 27,
    BATTLE_EVENT = 28,
    USE_DOOR = 29,
    SEND_PARENTAL = 30,
    GONE_FISHIN = 31,
    STEAM = 32,
    PET_BATTLE = 33,
    NPC = 34,
    SPECIAL = 35,
    SEND_PARTICLE_EFFECT_V2 = 36,
    ACTIVE_ARROW_TO_ITEM = 37,
    SELECT_TILE_INDEX = 38,
    SEND_PLAYER_TRIBUTE_DATA = 39,
    PVE_BATTLE_EVENT = 40,
    SEND_EFFECT_V3 = 41
}

export class PacketHandler {
    
    // Helper function used usually in C++ to unpack the type 4 structs
    public static unpackTankPacket(buffer: Buffer) {
        if (buffer.length < 56) return null; // Too small
        
        return {
            type: buffer.readUInt8(0),
            // offset 4 is netID uint32
            netID: buffer.readInt32LE(4),
            // offset 12 is state int32
            targetNetID: buffer.readInt32LE(8),
            characterState: buffer.readInt32LE(12),
            // For block changes, float values for x and y
            waterSpeed: buffer.readFloatLE(16),
            objX: buffer.readFloatLE(20),
            objY: buffer.readFloatLE(24),
            xSpeed: buffer.readFloatLE(28),
            ySpeed: buffer.readFloatLE(32),
            x: buffer.readFloatLE(36),
            y: buffer.readFloatLE(40),
            punchX: buffer.readInt32LE(44),
            punchY: buffer.readInt32LE(48),
            extDataLength: buffer.readInt32LE(52), // Extended data length
        };
    }

    public static createTankPacket(type: TankPacketType, netID: number, targetNetID: number, characterState: number, 
                            punchX: number, punchY: number, x: number, y: number, extDataLength: number): Buffer {
        const buffer = Buffer.alloc(56 + extDataLength);
        buffer.writeUInt32LE(4, 0); // TankPacket message type is globally 4 on byte 0
        
        // Setup internal properties based on GT standard 5.15 struct
        buffer.writeUInt8(type, 4); 
        buffer.writeInt32LE(netID, 8);
        buffer.writeInt32LE(targetNetID, 12);
        buffer.writeInt32LE(characterState, 16);
        buffer.writeFloatLE(0, 20); // water speed
        buffer.writeFloatLE(x, 24); // objX
        buffer.writeFloatLE(y, 28); // objY
        buffer.writeFloatLE(0, 32); // xSpeed
        buffer.writeFloatLE(0, 36); // ySpeed
        buffer.writeFloatLE(0, 40); // targetX
        buffer.writeFloatLE(0, 44); // targetY
        buffer.writeInt32LE(punchX, 48); // punchX
        buffer.writeInt32LE(punchY, 52); // punchY
        
        return buffer;
    }

    // Handles any normal Action Message String (action|...)
    public static handleGameMessage(peer: any, actionType: string, actionItems: string[]) {
        switch (actionType) {
            case "enter_game":
                // Send Login / Wait packet sequence 
                // e.g., Request Send items.dat -> Request Inventory -> Ready -> Spawn
                break;
            case "quit":
                // Clear peer cache
                break;
            case "join_request":
                const worldObj = actionItems.find(p => p.startsWith("name="));
                if (worldObj && worldObj.split("=")[1]) {
                    const worldName = worldObj.split("=")[1];
                    // Load world logic
                }
                break;
        }
    }
}
