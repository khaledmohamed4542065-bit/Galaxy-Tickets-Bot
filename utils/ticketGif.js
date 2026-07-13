import { createCanvas, loadImage } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';

function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export const generateTicketGif = async (guildName, guildIconUrl, selectOptions = ['💬 دعم عام']) => {
    const width = 680;
    const height = 240;
    const frames = 80; // Optimized to 80 frames (approx 4 seconds at 20fps)
    const fps = 20;

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    encoder.start();
    encoder.setRepeat(0);   
    encoder.setQuality(15); 

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let guildImg = null;
    if (guildIconUrl) {
        try {
            guildImg = await loadImage(guildIconUrl);
        } catch(e) { console.error('Failed to load guild icon', e); }
    }

    // Space background elements (twinkling stars)
    const stars = Array.from({ length: 40 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        twinkleSpeed: 0.1 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        driftSpeed: -(Math.random() * 0.2 + 0.1) // very slow drift left
    }));

    // Spiral Galaxy centered on the right side behind text
    const galaxyCenterX = 520;
    const galaxyCenterY = 120;
    const galaxyRadius = 100;
    const galaxyArms = 3;
    const galaxyParticles = Array.from({ length: 130 }).map(() => {
        const arm = Math.floor(Math.random() * galaxyArms);
        const distanceProgress = Math.pow(Math.random(), 1.5);
        return {
            arm,
            distanceProgress,
            angleOffset: (Math.random() - 0.5) * 0.35,
            size: Math.random() * 1.2 + 0.4,
            brightness: 0.5 + Math.random() * 0.5,
            hue: 275 + Math.random() * 20 // between 275 (purple) and 295 (pink-purple)
        };
    });

    // Space Planets
    const planet1 = {
        baseX: 85,
        baseY: 45,
        radius: 12,
        driftX: 0.12,
        driftY: 0.04
    };
    const planet2 = {
        baseX: 610,
        baseY: 195,
        radius: 6,
        driftX: -0.08,
        driftY: -0.04
    };

    for (let i = 0; i < frames; i++) {
        encoder.setDelay(1000 / fps);

        // 1. Deep Space background (Dark space violet)
        ctx.fillStyle = '#05030c'; 
        ctx.fillRect(0, 0, width, height);

        const pulse = Math.sin((i / frames) * Math.PI) * 0.5 + 0.5;

        // 2. Cosmic Nebulae (Purple/Pink Glows)
        ctx.save();
        // Nebula 1 (near galaxy)
        const grad1 = ctx.createRadialGradient(galaxyCenterX, galaxyCenterY, 10, galaxyCenterX, galaxyCenterY, 220);
        grad1.addColorStop(0, `rgba(168, 85, 247, ${0.12 + pulse * 0.04})`); // bright violet
        grad1.addColorStop(1, 'rgba(5, 3, 12, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);

        // Nebula 2 (near planet 1/bottom left)
        const grad2 = ctx.createRadialGradient(150, 150, 10, 150, 150, 200);
        grad2.addColorStop(0, `rgba(217, 70, 239, ${0.08 + pulse * 0.03})`); // pink-purple
        grad2.addColorStop(1, 'rgba(5, 3, 12, 0)');
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // 3. Tech grid with subtle purple tint
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.02)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // 4. Draw Twinkling Stars
        stars.forEach(star => {
            star.x += star.driftSpeed;
            if (star.x < 0) star.x = width; // wrap
            const opacity = (Math.sin(i * star.twinkleSpeed + star.phase) * 0.4 + 0.6) * 0.7;
            ctx.fillStyle = `rgba(232, 121, 249, ${opacity})`; // Pinkish-purple star glow
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 5. Draw Spiral Galaxy
        const currentRotation = i * 0.012; // slow drift
        ctx.save();
        // Galaxy core glow
        const coreGlow = ctx.createRadialGradient(galaxyCenterX, galaxyCenterY, 2, galaxyCenterX, galaxyCenterY, 25);
        coreGlow.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        coreGlow.addColorStop(0.2, 'rgba(217, 70, 239, 0.45)');
        coreGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = coreGlow;
        ctx.beginPath();
        ctx.arc(galaxyCenterX, galaxyCenterY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Galaxy arms stars
        galaxyParticles.forEach(gp => {
            const theta = gp.distanceProgress * Math.PI * 2.5; 
            const angle = theta + (gp.arm * 2 * Math.PI / galaxyArms) + currentRotation + gp.angleOffset;
            const r = gp.distanceProgress * galaxyRadius;
            const px = galaxyCenterX + r * Math.cos(angle);
            const py = galaxyCenterY + r * Math.sin(angle);

            const opacity = gp.brightness * (1 - gp.distanceProgress * 0.65) * 0.5;
            ctx.fillStyle = `hsla(${gp.hue}, 100%, 75%, ${opacity})`;
            ctx.beginPath();
            ctx.arc(px, py, gp.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 6. Draw Planets
        // Planet 1 (Gas giant with ring)
        ctx.save();
        const p1x = planet1.baseX + planet1.driftX * i;
        const p1y = planet1.baseY + planet1.driftY * i;
        
        // Ring behind
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p1x, p1y, planet1.radius * 1.8, planet1.radius * 0.35, -Math.PI / 6, Math.PI, 0);
        ctx.stroke();

        // Planet body
        const gradP1 = ctx.createRadialGradient(p1x - 3, p1y - 3, 2, p1x, p1y, planet1.radius);
        gradP1.addColorStop(0, 'hsl(295, 100%, 78%)'); // light pinkish-purple
        gradP1.addColorStop(1, 'hsl(275, 100%, 38%)'); // vibrant deep purple
        ctx.fillStyle = gradP1;
        ctx.beginPath();
        ctx.arc(p1x, p1y, planet1.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ring front
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(p1x, p1y, planet1.radius * 1.8, planet1.radius * 0.35, -Math.PI / 6, 0, Math.PI);
        ctx.stroke();
        ctx.restore();

        // Planet 2 (Small ice world)
        ctx.save();
        const p2x = planet2.baseX + planet2.driftX * i;
        const p2y = planet2.baseY + planet2.driftY * i;
        const gradP2 = ctx.createRadialGradient(p2x - 1, p2y - 1, 1, p2x, p2y, planet2.radius);
        gradP2.addColorStop(0, 'hsl(255, 100%, 82%)'); // light blue-violet
        gradP2.addColorStop(1, 'hsl(285, 100%, 50%)'); // light purple
        ctx.fillStyle = gradP2;
        ctx.beginPath();
        ctx.arc(p2x, p2y, planet2.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Animations Progress (scaled for 80 frames)
        const panelProgress = easeOutExpo(Math.max(0, Math.min(i / 20, 1)));
        const iconProgress = easeOutExpo(Math.max(0, Math.min((i - 12) / 18, 1)));
        const textProgress = easeOutExpo(Math.max(0, Math.min((i - 20) / 20, 1)));
        const optProgress = easeOutExpo(Math.max(0, Math.min((i - 24) / 20, 1)));

        // 7. Glass Panel
        const fullPanelW = width - 40;
        const panelH = height - 40;
        const panelW = fullPanelW * panelProgress;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        if (panelProgress > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(10, 8, 20, 0.38)'; // Glassmorphism translucent dark purple-black
            ctx.strokeStyle = `rgba(217, 70, 239, ${0.12 + panelProgress * 0.25})`; // Light pinkish-purple border
            ctx.lineWidth = 1.5;
            
            const r = 15;
            ctx.beginPath();
            ctx.moveTo(panelX + r, panelY);
            ctx.lineTo(panelX + panelW - r, panelY);
            ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + r, r);
            ctx.lineTo(panelX + panelW, panelY + panelH - r);
            ctx.arcTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH, r);
            ctx.lineTo(panelX + r, panelY + panelH);
            ctx.arcTo(panelX, panelY + panelH, panelX, panelY + panelH - r, r);
            ctx.lineTo(panelX, panelY + r);
            ctx.arcTo(panelX, panelY, panelX + r, panelY, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 8. Guild Icon with dashed rotating border
        const iconSize = 120;
        const iconX = (width - fullPanelW) / 2 + 30;
        const iconY = (height - iconSize) / 2;

        if (iconProgress > 0) {
            // Rotating dashed border
            ctx.save();
            ctx.translate(iconX + iconSize / 2, iconY + iconSize / 2);
            ctx.rotate((i * 4 * Math.PI) / 180); 
            
            ctx.beginPath();
            ctx.arc(0, 0, (iconSize / 2) + 12, 0, Math.PI * 2);
            ctx.setLineDash([15, 10]); 
            ctx.strokeStyle = `rgba(217, 70, 239, ${iconProgress})`; // Light pink-purple
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, (iconSize / 2) + 5, 0, Math.PI * 2);
            ctx.setLineDash([]);
            ctx.strokeStyle = `rgba(168, 85, 247, ${iconProgress * 0.5})`; // deeper purple
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            
            // Draw Icon
            ctx.save();
            ctx.globalAlpha = iconProgress;
            ctx.beginPath();
            ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            ctx.clip();
            if (guildImg) {
                ctx.drawImage(guildImg, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.fillStyle = '#5865F2';
                ctx.fill();
            }
            ctx.restore();
        }

        // 9. Texts and Separation Line
        const textX = iconX + iconSize + 30;
        if (textProgress > 0) {
            ctx.textAlign = 'left';
            
            // Subtitle text (Pinkish-purple)
            ctx.fillStyle = `rgba(217, 70, 239, ${textProgress})`;
            ctx.font = 'bold 12px "Outfit", "Cairo", sans-serif';
            ctx.fillText(`✦ ${guildName.toUpperCase()} TICKET SYSTEM`, textX, iconY + 20);

            // Title text
            ctx.fillStyle = `rgba(255, 255, 255, ${textProgress})`;
            ctx.font = 'bold 36px "Outfit", "Cairo", sans-serif';
            ctx.fillText('Ticket System', textX, iconY + 60);

            // Underline
            ctx.save();
            const lineWidth = 300 * textProgress;
            const lineY = iconY + 75;
            const lineGrad = ctx.createLinearGradient(textX, lineY, textX + lineWidth, lineY);
            lineGrad.addColorStop(0, `rgba(217, 70, 239, ${textProgress})`);
            lineGrad.addColorStop(1, 'rgba(168, 85, 247, 0)'); 
            ctx.fillStyle = lineGrad;
            ctx.fillRect(textX, lineY, lineWidth, 2);
            ctx.restore();
        }

        // 10. Options List / Instructions
        if (optProgress > 0) {
            // Instructions
            ctx.fillStyle = `rgba(180, 185, 200, ${optProgress})`;
            ctx.font = 'bold 15px "Cairo", "Outfit", sans-serif'; 
            ctx.fillText('اختر نوع التذكرة من القائمة المنسدلة', textX, iconY + 102);

            // Dynamically list options below instructions (up to 4 options in a grid)
            ctx.fillStyle = `rgba(160, 170, 190, ${optProgress})`;
            ctx.font = '14px "Cairo", "Outfit", sans-serif';
            
            selectOptions.forEach((opt, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                const xOffset = col === 0 ? 0 : 160;
                const yOffset = iconY + 128 + (row * 22);
                ctx.fillText(opt, textX + xOffset, yOffset);
            });
        }

        encoder.addFrame(ctx);

        // Yield execution to event loop
        if (i % 15 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    encoder.finish();
    return encoder.out.getData();
};
