import { PacketHandler, TankPacketType } from "../core/PacketHandler";

export enum VariantType {
    NONE = 0,
    FLOAT = 1,
    STRING = 2,
    VECTOR2 = 3,
    VECTOR3 = 4,
    UNSIGNED_INT = 5,
    SIGNED_INT = 9
}

export class VariantList {
    private args: Array<{type: VariantType, value: any}> = [];

    // Tiru fungsi .Insert() di struct `gamepacket_t`
    public insert(value: string | number | boolean | Float32Array) {
        if (typeof value === "string") {
            this.args.push({ type: VariantType.STRING, value });
        } else if (typeof value === "number") {
            // Kita asumsikan signed_int (int32) untuk angka kecuali butuh Float khusus
            // Pada TS semua number adalah f64, tapi secara default GT pakai Int32 untuk CallFunction
            this.args.push({ type: VariantType.SIGNED_INT, value: Math.floor(value) });
        } else if (typeof value === "boolean") {
            this.args.push({ type: VariantType.SIGNED_INT, value: value ? 1 : 0 });
        }
    }

    // Memaksa insert Unsigned Int (seperti port, ID flag tertentu)
    public insertUint(value: number) {
        this.args.push({ type: VariantType.UNSIGNED_INT, value });
    }

    public insertFloat(value: number) {
        this.args.push({ type: VariantType.FLOAT, value });
    }

    // Bangun byte buffer payload untuk VariantList ini
    public serialize(): Buffer {
        let buffers: Buffer[] = [];
        
        // 1 byte = Args Count
        const countBuf = Buffer.alloc(1);
        countBuf.writeUInt8(this.args.length, 0);
        buffers.push(countBuf);

        for (let i = 0; i < this.args.length; i++) {
            const arg = this.args[i];
            
            // 2 Bytes (Index, Type)
            const header = Buffer.alloc(2);
            header.writeUInt8(i, 0); // Index ke berapa? (0 = OnSuperMainStartAcceptLogon, dst)
            header.writeUInt8(arg.type, 1);
            buffers.push(header);

            if (arg.type === VariantType.STRING) {
                const str = String(arg.value);
                const strLen = Buffer.byteLength(str, "utf-8");
                const lenBuf = Buffer.alloc(4);
                lenBuf.writeUInt32LE(strLen, 0);
                buffers.push(lenBuf);
                
                const strBuf = Buffer.from(str, "utf-8");
                buffers.push(strBuf);
            } 
            else if (arg.type === VariantType.SIGNED_INT) {
                const intBuf = Buffer.alloc(4);
                intBuf.writeInt32LE(arg.value, 0);
                buffers.push(intBuf);
            }
            else if (arg.type === VariantType.UNSIGNED_INT) {
                const uintBuf = Buffer.alloc(4);
                uintBuf.writeUInt32LE(arg.value, 0);
                buffers.push(uintBuf);
            }
            else if (arg.type === VariantType.FLOAT) {
                const floatBuf = Buffer.alloc(4);
                floatBuf.writeFloatLE(arg.value, 0);
                buffers.push(floatBuf);
            }
        }
        
        return Buffer.concat(buffers);
    }

    // Create CallFunction tank packet and send it! (alias `pId.CreatePacket(peer)` di C++)
    public send(enet: any, peerId: number, netID: number = -1, delay: number = 0) {
        const payload = this.serialize();
        
        // Buat TankPacket structure, flag TYPE = 1 (Call Function / VariantList)
        // Kita menggunakan PacketHandler helper dari core (yg sblmnya sdh kita bikin)
        const emptyTankPacket = PacketHandler.createTankPacket(
            TankPacketType.CALL_FUNCTION,
            -1, -1, 0, 0, 0, 0, 0, payload.length
        );

        // Jika ada delay, biasa ditaruh di field xSpeed/ySpeed/punchX
        if (delay > 0) {
            emptyTankPacket.writeInt32LE(delay, 24); // Custom field untuk delay
        }

        // Tembel payload VariantList ke ekor TankPacket
        const finalBuffer = Buffer.concat([emptyTankPacket, payload]);
        
        // Kirim via n-api EnetWrapper (flag = 1 reliable)
        enet.sendPacket(peerId, finalBuffer, 1);
    }
}
