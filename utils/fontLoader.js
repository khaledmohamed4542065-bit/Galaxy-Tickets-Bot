import { GlobalFonts } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import https from 'https';

export const ensureFonts = async () => {
    const fontsDir = path.join(process.cwd(), 'fonts');
    if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
    }
    
    const fontFiles = {
        'Outfit.ttf': 'https://github.com/google/fonts/raw/main/ofl/outfit/Outfit%5Bwght%5D.ttf',
        'Cairo.ttf': 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf'
    };

    const download = (url, dest) => {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(dest)) {
                return resolve();
            }
            console.log(`📥 Downloading font from ${url}...`);
            const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    https.get(response.headers.location, (redirectResponse) => {
                        if (redirectResponse.statusCode !== 200) {
                            reject(new Error(`Failed to download font (redirect): ${redirectResponse.statusCode}`));
                            return;
                        }
                        redirectResponse.pipe(file);
                        file.on('finish', () => {
                            file.close();
                            console.log(`✅ Font saved to ${dest}`);
                            resolve();
                        });
                    }).on('error', (err) => {
                        fs.unlink(dest, () => {});
                        reject(err);
                    });
                } else if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download font: ${response.statusCode}`));
                    return;
                } else {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`✅ Font saved to ${dest}`);
                        resolve();
                    });
                }
            }).on('error', (err) => {
                fs.unlink(dest, () => {});
                reject(err);
            });
        });
    };

    try {
        const downloadPromises = Object.entries(fontFiles).map(([filename, url]) => {
            const dest = path.join(fontsDir, filename);
            return download(url, dest);
        });

        await Promise.all(downloadPromises);
        
        // Register variable fonts with napi-rs canvas
        const outfitReg = GlobalFonts.registerFromPath(path.join(fontsDir, 'Outfit.ttf'), 'Outfit');
        const cairoReg = GlobalFonts.registerFromPath(path.join(fontsDir, 'Cairo.ttf'), 'Cairo');
        
        console.log(`✨ Font registration status: Outfit: ${outfitReg}, Cairo: ${cairoReg}`);
    } catch (err) {
        console.error('❌ Failed to download or register fonts:', err);
    }
};
