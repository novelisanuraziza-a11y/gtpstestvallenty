import * as fs from 'fs';
import * as path from 'path';

export class WorldBlock {
    public fg: number = 0; // Foreground item
    public bg: number = 0; // Background item
    public water_fire: boolean = false;
    public locked: boolean = false;
    public owner: string = "";
    public signLabel: string = "";

    constructor() {}
}

export class WorldInfo {
    public name: string;
    public width: number;
    public height: number;
    public blocks: WorldBlock[] = [];
    public weather: number = 0;
    
    // Custom Events (inspired by C++ Events like Zombie Apocalypse / Comet Dust)
    public special_event: boolean = false;
    public special_event_item: number = 0;
    public last_special_event: number = 0;

    constructor(name: string, width: number = 100, height: number = 60) {
        this.name = name.toUpperCase();
        this.width = width;
        this.height = height;

        // Initialize empty blocks
        for (let i = 0; i < this.width * this.height; i++) {
            this.blocks.push(new WorldBlock());
        }
    }

    public generateDefault(seedFn: (x: number, y: number) => number) {
        // Logika sederhana untuk mereset dan membuat dunia dasar misalnya dirt cave
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = x + y * this.width;
                if (y == 23) {
                    this.blocks[index].fg = 2; // DIRT
                    this.blocks[index].bg = 14; // CAVE DIRT
                } else if (y > 23 && y < 58) {
                    this.blocks[index].fg = 2; // DIRT / CAVE
                    this.blocks[index].bg = 14;
                } else if (y >= 58) {
                    this.blocks[index].fg = 8; // BEDROCK
                    this.blocks[index].bg = 14;
                }
            }
        }
        
        // Spawn Door as example
        this.blocks[50 + 22 * this.width].fg = 6;
        this.blocks[50 + 22 * this.width].bg = 14;
    }

    public static loadWorldJSON(worldName: string): WorldInfo {
        const dbFolder = path.join(__dirname, '../../database/worlds');
        const targetFile = path.join(dbFolder, `${worldName.toUpperCase()}_.json`);

        if (!fs.existsSync(targetFile)) {
            // Jika dunia baru, kita buat objek mentah (namun kita harus mengisi block!)
            const newWorld = new WorldInfo(worldName);
            newWorld.generateDefault(() => 0); // Call dummy logic
            newWorld.saveWorldJSON(); // Langsung save agar terdaftar
            return newWorld;
        }

        const dataStr = fs.readFileSync(targetFile, 'utf-8');
        const data = JSON.parse(dataStr);
        
        const worldObj = new WorldInfo(data.name, data.width || 100, data.height || 60);
        worldObj.weather = data.weather || 0;
        
        if (data.blocks && Array.isArray(data.blocks)) {
            for (let i = 0; i < Math.min(data.blocks.length, worldObj.blocks.length); i++) {
                worldObj.blocks[i].fg = data.blocks[i].fg;
                worldObj.blocks[i].bg = data.blocks[i].bg;
                if (data.blocks[i].signLabel) worldObj.blocks[i].signLabel = data.blocks[i].signLabel;
            }
        }

        return worldObj;
    }

    public saveWorldJSON() {
        const dbFolder = path.join(__dirname, '../../database/worlds');
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder, { recursive: true });
        }
        
        const mappedBlocks = this.blocks.map(b => ({ fg: b.fg, bg: b.bg, signLabel: b.signLabel }));

        const targetFile = path.join(dbFolder, `${this.name.toUpperCase()}_.json`);
        fs.writeFileSync(targetFile, JSON.stringify({
            name: this.name,
            width: this.width,
            height: this.height,
            weather: this.weather,
            blocks: mappedBlocks
        })); // Disarankan pakai stream atau binary untuk versi dunia yang blocknya berat!
    }
}
