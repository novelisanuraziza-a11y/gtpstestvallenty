import * as fs from 'fs';
import * as path from 'path';

export class InventoryItem {
    id: number = 0;
    count: number = 0;
}

export class PlayerInfo {
    public tankIDName: string = "";
    public netID: number = 0;
    public ip: string = "";
    public pass: string = "";
    
    // Core Login & Access
    public adminLevel: number = 0;
    public gems: number = 0;
    public level: number = 1;
    public xp: number = 0;
    
    public world: string = ""; // "EXIT" or empty string when not in world
    public isKicked: boolean = false;
    
    // Coordinates
    public x: number = 0;
    public y: number = 0;
    
    // Clothing
    public face: number = 0;
    public shirt: number = 0;
    public pants: number = 0;
    public hair: number = 0;
    public neck: number = 0;
    public back: number = 0;
    public feet: number = 0;
    public hand: number = 0;

    public inventory: Map<number, number> = new Map(); // Map item_id => count

    constructor() {}

    public saveToJSON() {
        if (!this.tankIDName) return;

        const dbFolder = path.join(__dirname, '../../database/players');
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder, { recursive: true });
        }

        const data = {
            tankIDName: this.tankIDName,
            pass: this.pass,
            gems: this.gems,
            level: this.level,
            xp: this.xp,
            adminLevel: this.adminLevel,
            inventory: Array.from(this.inventory.entries())
        };

        const targetFile = path.join(dbFolder, `${this.tankIDName.toUpperCase()}_.json`);
        fs.writeFileSync(targetFile, JSON.stringify(data, null, 4));
    }

    public static loadFromJSON(tankIDName: string): PlayerInfo | null {
        const dbFolder = path.join(__dirname, '../../database/players');
        const targetFile = path.join(dbFolder, `${tankIDName.toUpperCase()}_.json`);

        if (!fs.existsSync(targetFile)) {
            return null; // Belum terdaftar (New User)
        }

        const data = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
        const player = new PlayerInfo();
        player.tankIDName = data.tankIDName;
        player.pass = data.pass || "";
        player.gems = data.gems || 0;
        player.level = data.level || 1;
        player.xp = data.xp || 0;
        player.adminLevel = data.adminLevel || 0;

        if (data.inventory) {
            player.inventory = new Map(data.inventory);
        }

        return player;
    }
}
