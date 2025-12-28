/**
 * Celebration Particle System
 * Creates a festive confetti and sparkle effect for special moments
 */

class Particle {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.x = options.x || Math.random() * canvas.width;
        this.y = options.y || -10;
        this.size = options.size || Math.random() * 8 + 4;
        this.speedY = options.speedY || Math.random() * 3 + 2;
        this.speedX = options.speedX || (Math.random() - 0.5) * 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
        this.opacity = 1;
        this.fadeSpeed = options.fadeSpeed || 0.005;
        this.gravity = options.gravity || 0.1;
        this.wobble = Math.random() * 10;
        this.wobbleSpeed = Math.random() * 0.1 + 0.05;

        // Beautiful color palette for celebration
        const colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
            "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
            "#BB8FCE", "#85C1E9", "#F8B500", "#FF69B4",
            "#00CED1", "#FFD700", "#FF4500", "#7B68EE"
        ];
        this.color = options.color || colors[Math.floor(Math.random() * colors.length)];

        // Particle shape: 0 = square, 1 = circle, 2 = star, 3 = heart
        this.shape = Math.floor(Math.random() * 4);
    }

    update() {
        this.speedY += this.gravity;
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.wobble) * 0.5;
        this.wobble += this.wobbleSpeed;
        this.rotation += this.rotationSpeed;
        this.opacity -= this.fadeSpeed;

        // Add slight horizontal drift
        this.speedX *= 0.99;

        return this.opacity > 0 && this.y < this.canvas.height + 50;
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = this.opacity;
        this.ctx.fillStyle = this.color;

        switch (this.shape) {
            case 0: // Square
                this.ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
            case 1: // Circle
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 2: // Star
                this.drawStar(0, 0, 5, this.size / 2, this.size / 4);
                break;
            case 3: // Heart
                this.drawHeart(0, 0, this.size);
                break;
        }

        this.ctx.restore();
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }

        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawHeart(x, y, size) {
        const s = size / 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + s / 4);
        this.ctx.quadraticCurveTo(x, y, x + s / 2, y);
        this.ctx.quadraticCurveTo(x + s, y, x + s, y + s / 2);
        this.ctx.quadraticCurveTo(x + s, y + s, x, y + s * 1.5);
        this.ctx.quadraticCurveTo(x - s, y + s, x - s, y + s / 2);
        this.ctx.quadraticCurveTo(x - s, y, x - s / 2, y);
        this.ctx.quadraticCurveTo(x, y, x, y + s / 4);
        this.ctx.fill();
    }
}

class Sparkle {
    constructor(canvas, x, y) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.x = x;
        this.y = y;
        this.size = Math.random() * 4 + 2;
        this.maxSize = this.size * 2;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;
        this.growing = true;
        this.color = `hsl(${Math.random() * 60 + 40}, 100%, 70%)`; // Golden sparkles
    }

    update() {
        if (this.growing) {
            this.size += 0.5;
            if (this.size >= this.maxSize) {
                this.growing = false;
            }
        } else {
            this.size -= 0.3;
            this.life -= this.decay;
        }
        return this.life > 0 && this.size > 0;
    }

    draw() {
        this.ctx.save();
        this.ctx.globalAlpha = this.life;
        this.ctx.fillStyle = this.color;

        // Draw a 4-pointed sparkle
        this.ctx.beginPath();
        this.ctx.moveTo(this.x, this.y - this.size);
        this.ctx.lineTo(this.x + this.size / 4, this.y);
        this.ctx.lineTo(this.x, this.y + this.size);
        this.ctx.lineTo(this.x - this.size / 4, this.y);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(this.x - this.size, this.y);
        this.ctx.lineTo(this.x, this.y + this.size / 4);
        this.ctx.lineTo(this.x + this.size, this.y);
        this.ctx.lineTo(this.x, this.y - this.size / 4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }
}

export class CelebrationEffect {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.sparkles = [];
        this.animationId = null;
        this.isRunning = false;
        this.burstCount = 0;
        this.maxBursts = 5;
    }

    init() {
        // Create canvas if it doesn't exist
        this.canvas = document.getElementById("celebration-canvas");
        if (!this.canvas) {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "celebration-canvas";
            this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
      `;
            document.body.appendChild(this.canvas);
        }

        this.ctx = this.canvas.getContext("2d");
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    createBurst(x, y, count = 50) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = Math.random() * 8 + 4;
            this.particles.push(
                new Particle(this.canvas, {
                    x: x,
                    y: y,
                    speedX: Math.cos(angle) * speed,
                    speedY: Math.sin(angle) * speed - 5,
                    gravity: 0.15,
                    fadeSpeed: 0.008,
                })
            );
        }
    }

    createConfetti(count = 30) {
        for (let i = 0; i < count; i++) {
            this.particles.push(
                new Particle(this.canvas, {
                    x: Math.random() * this.canvas.width,
                    y: -20,
                    speedY: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 3,
                    gravity: 0.05,
                    fadeSpeed: 0.003,
                })
            );
        }
    }

    createSparkle() {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height * 0.6;
        this.sparkles.push(new Sparkle(this.canvas, x, y));
    }

    animate() {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        this.particles = this.particles.filter((particle) => {
            const alive = particle.update();
            if (alive) particle.draw();
            return alive;
        });

        // Update and draw sparkles
        this.sparkles = this.sparkles.filter((sparkle) => {
            const alive = sparkle.update();
            if (alive) sparkle.draw();
            return alive;
        });

        // Add continuous effects
        if (this.isRunning && Math.random() < 0.3) {
            this.createSparkle();
        }

        // Continue animation if there are particles or still running
        if (this.isRunning || this.particles.length > 0 || this.sparkles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.cleanup();
        }
    }

    start() {
        if (this.isRunning) return;

        this.init();
        this.isRunning = true;
        this.burstCount = 0;
        this.particles = [];
        this.sparkles = [];

        // Initial spectacular burst from center
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.createBurst(centerX, centerY, 80);

        // Create side bursts
        setTimeout(() => {
            if (this.isRunning) {
                this.createBurst(this.canvas.width * 0.2, this.canvas.height * 0.3, 40);
                this.createBurst(this.canvas.width * 0.8, this.canvas.height * 0.3, 40);
            }
        }, 200);

        // Continuous confetti rain
        const confettiInterval = setInterval(() => {
            if (this.isRunning && this.burstCount < this.maxBursts) {
                this.createConfetti(20);
                this.burstCount++;
            } else {
                clearInterval(confettiInterval);
            }
        }, 500);

        // Random bursts
        const burstInterval = setInterval(() => {
            if (this.isRunning && this.burstCount < this.maxBursts) {
                const x = Math.random() * this.canvas.width;
                const y = Math.random() * this.canvas.height * 0.5;
                this.createBurst(x, y, 30);
            } else {
                clearInterval(burstInterval);
            }
        }, 800);

        // Start animation loop
        this.animate();

        // Auto stop after duration
        setTimeout(() => {
            this.isRunning = false;
        }, 5000);
    }

    stop() {
        this.isRunning = false;
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// Create a singleton instance for easy access
export const celebrationEffect = new CelebrationEffect();
