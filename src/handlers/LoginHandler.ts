import { PlayerInfo } from "../player/PlayerInfo";
import { VariantList } from "../net/VariantList";
import { PacketSender } from "../net/PacketSender";

export class LoginHandler {

    // Helper untuk mecah ltoken (mirip get_value di C++)
    private static getValue(query: string, key: string): string {
        const params = new URLSearchParams(query);
        return params.get(key) || "";
    }

    // Dipanggil dari server.ts saat menerima action|logon
    public static handleLogon(enet: any, peerId: number, connectID: number, peers: Map<number, PlayerInfo>, packetString: string) {
        
        let p = peers.get(connectID);
        if (!p) {
            p = new PlayerInfo();
            p.netID = connectID;
            peers.set(connectID, p);
        }

        const lines = packetString.split("\n");
        const parsed: Record<string, string> = {};
        for (const line of lines) {
            const parts = line.split("|");
            if (parts.length >= 2) {
                parsed[parts[0]] = parts.slice(1).join("|");
            }
        }

        p.tankIDName = parsed["tankIDName"] || "";
        let password = parsed["tankIDPass"] || "";
        let requestedName = parsed["requestedName"] || "Guest_" + Math.floor(Math.random() * 9999);

        // Jika klien mengirim ltoken (Logon token untuk PC/Modern Auth iOS dsb)
        if (parsed["protocol"] && parsed["ltoken"]) {
            const ltoken = parsed["ltoken"];
            
            if (!ltoken) {
                PacketSender.sendLog(enet, peerId, "`4Server protection:`` There are some errors in your login information.");
                PacketSender.sendLogonFail(enet, peerId);
                return;
            }

            // Dekode Base64 seperti fungsi base64_decode di C++
            const decodedData = Buffer.from(ltoken, "base64").toString("utf-8");
            console.log(`[LOGIN] Decoded LToken: ${decodedData}`);
            
            p.tankIDName = this.getValue(decodedData, "growId");
            password = this.getValue(decodedData, "password");
            
            console.log(`[LOGIN A] Trying: ${p.tankIDName} / pass: ${password}`);
        }

        // Cek jika butuh ngisi password tapi nama growID diinput 
        if (p.tankIDName && !password) {
            PacketSender.sendLog(enet, peerId, "`4Server protection:`` There must be an input password!.");
            PacketSender.sendLogonFail(enet, peerId);
            return;
        }

        // Otentikasi Player dari file JSON
        let correctpass = false;
        let isRegistered = false;

        const localData = PlayerInfo.loadFromJSON(p.tankIDName);
        if (localData) {
            isRegistered = true;
            correctpass = (password === localData.pass);
        }

        // Cek hasil password
        if (p.tankIDName && password) {
            if (isRegistered && correctpass) {
                // Success Login
                console.log(`[LOGIN] Sukses: ${p.tankIDName}`);
                p.gems = localData!.gems;
                p.inventory = localData!.inventory;
                p.pass = localData!.pass;
            } 
            else if (isRegistered && !correctpass) {
                PacketSender.sendLog(enet, peerId, "`4Server Information:`` The Account: " + p.tankIDName + " has Wrong Password!.");
                PacketSender.sendLogonFail(enet, peerId);
                return;
            } 
            else if (!isRegistered) {
                // Register otomatis di mari
                PacketSender.sendLog(enet, peerId, "`2Server Information:`` Registered automatically as: " + p.tankIDName);
                p.pass = password;
                p.saveToJSON(); // simpan data baru
            }
        } else {
            // Guest login (tanpa nama)
            p.tankIDName = requestedName;
        }

        // --- MENGIRIM ACCEPT LOGON (Seperti di C++ VarList::OnSuperMainStartAcceptLogon) ---
        // Pake VariantList Builder buatan kita!
        const vList = new VariantList();
        vList.insert("OnSuperMainStartAcceptLogon");
        vList.insert(1710927976); // items.dat hash code (contoh)
        vList.insert(""); // cdn host
        vList.insert(""); // cdn path
        vList.insert("cc.cz.madkite.freedom fixes3d mac_bux"); // flag modifikasi proto khusus
        vList.insert(""); // pesen ekstra (ex: discord desc)
        
        vList.send(enet, peerId);
        
        console.log(`[SERVER] Sent OnSuperMainStartAcceptLogon for ${p.tankIDName}`);
    }
}
