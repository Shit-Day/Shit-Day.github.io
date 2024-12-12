export function initializeBoids(canvasId) { 
 // boids.js
    const canvas = document.getElementById("boidsCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let mouse = { x: -1000, y: -1000 };

    // Update mouse position
    canvas.addEventListener("mousemove", (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    class Boid {
        constructor() {
            this.position = {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height
            };
            this.velocity = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };
            this.acceleration = { x: 0, y: 0 };
            this.maxSpeed = 3;
            this.maxForce = 0.05;
            this.perceptionRadius = 20;
            this.mouseAvoidanceRadius = 100; // Increase radius for smoother avoidance
        }

        // Helper function to calculate distance
        distance(other) {
            return Math.hypot(this.position.x - other.x, this.position.y - other.y);
        }

        // Mouse avoidance behavior with smoothing and dampening
        avoidMouse(mouse) {
            let mouseDist = this.distance(mouse);
            let steering = { x: 0, y: 0 };

            if (mouseDist < this.mouseAvoidanceRadius) {
                // Calculate direction away from mouse
                steering.x = this.position.x - mouse.x;
                steering.y = this.position.y - mouse.y;

                // Normalize and apply max speed, with dampening
                let mag = Math.hypot(steering.x, steering.y);
                steering.x = (steering.x / mag) * this.maxSpeed * 0.1;
                steering.y = (steering.y / mag) * this.maxSpeed * 0.1;
            }
            return steering;
        }

        // Alignment behavior: steer towards average direction of flockmates
        align(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                if (other !== this && this.distance(other.position) < this.perceptionRadius) {
                    steering.x += other.velocity.x;
                    steering.y += other.velocity.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                steering.x = (steering.x / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.x;
                steering.y = (steering.y / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.y;
                steering.x = Math.min(steering.x, this.maxForce);
                steering.y = Math.min(steering.y, this.maxForce);
            }
            return steering;
        }

        // Cohesion behavior: steer towards the average position of flockmates
        cohesion(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                if (other !== this && this.distance(other.position) < this.perceptionRadius) {
                    steering.x += other.position.x;
                    steering.y += other.position.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                steering.x -= this.position.x;
                steering.y -= this.position.y;
                steering.x = (steering.x / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.x;
                steering.y = (steering.y / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.y;
                steering.x = Math.min(steering.x, this.maxForce);
                steering.y = Math.min(steering.y, this.maxForce);
            }
            return steering;
        }

        // Separation behavior: steer away from close flockmates
        separation(boids) {
            let steering = { x: 0, y: 0 };
            let total = 0;
            for (let other of boids) {
                let d = this.distance(other.position);
                if (other !== this && d < this.perceptionRadius / 2) {
                    steering.x += this.position.x - other.position.x;
                    steering.y += this.position.y - other.position.y;
                    total++;
                }
            }
            if (total > 0) {
                steering.x /= total;
                steering.y /= total;
                steering.x = (steering.x / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.x;
                steering.y = (steering.y / Math.hypot(steering.x, steering.y)) * this.maxSpeed - this.velocity.y;
                steering.x = Math.min(steering.x, this.maxForce);
                steering.y = Math.min(steering.y, this.maxForce);
            }
            return steering;
        }

        // Apply all behaviors: alignment, cohesion, separation, and mouse avoidance
        flock(boids) {
            let alignment = this.align(boids);
            let cohesion = this.cohesion(boids);
            let separation = this.separation(boids);
            let mouseAvoidance = this.avoidMouse(mouse);

            // Define weights for each behavior
            const alignmentWeight = 1;
            const cohesionWeight = 1;
            const separationWeight = 1;
            const mouseAvoidanceWeight = 30; // Give higher weight to mouse avoidance

            // Apply weights to each behavior
            this.acceleration.x += (alignment.x * alignmentWeight) +
                                (cohesion.x * cohesionWeight) +
                                (separation.x * separationWeight) +
                                (mouseAvoidance.x * mouseAvoidanceWeight);

            this.acceleration.y += (alignment.y * alignmentWeight) +
                                (cohesion.y * cohesionWeight) +
                                (separation.y * separationWeight) +
                                (mouseAvoidance.y * mouseAvoidanceWeight);
        }

        // Update boid position and smooth angle changes to avoid flickering
        update() {
            this.velocity.x += this.acceleration.x;
            this.velocity.y += this.acceleration.y;

            // Apply angle rounding for smoother direction changes
            let angle = Math.atan2(this.velocity.y, this.velocity.x);
            let roundedAngle = Math.round(angle * 4) / 4;  // Round to nearest quarter-radian
            this.velocity.x = Math.cos(roundedAngle) * Math.hypot(this.velocity.x, this.velocity.y);
            this.velocity.y = Math.sin(roundedAngle) * Math.hypot(this.velocity.x, this.velocity.y);

            // Limit speed to maxSpeed
            let mag = Math.hypot(this.velocity.x, this.velocity.y);
            if (mag > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / mag) * this.maxSpeed;
                this.velocity.y = (this.velocity.y / mag) * this.maxSpeed;
            }

            // Update position
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            // Reset acceleration for the next frame
            this.acceleration.x = 0;
            this.acceleration.y = 0;

            // Wrap around screen edges
            if (this.position.x > canvas.width) this.position.x = 0;
            if (this.position.x < 0) this.position.x = canvas.width;
            if (this.position.y > canvas.height) this.position.y = 0;
            if (this.position.y < 0) this.position.y = canvas.height;
        }

        // Draw the boid as a triangle
        draw() {
            let angle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(angle);
            ctx.beginPath();
            //ctx.arc(0, 0, 4, Math.PI * 0.5, Math.PI * 1.5, false); // Larger arc
            //ctx.arc(-1.5, 0, 4, Math.PI * 1.5, Math.PI * 0.5, true); // "Cut out" inner arc
            ctx.moveTo(0, -2);
            ctx.lineTo(-2, 2);
            ctx.lineTo(2, 2);
            ctx.closePath();
            ctx.fillStyle = "#ffdd44";
            ctx.fill();
            ctx.restore();
        }
    }

    // Initialize boids
    const boids = Array.from({ length: 250 }, () => new Boid());

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let boid of boids) {
            boid.flock(boids);
            boid.update();
            boid.draw();
        }
        requestAnimationFrame(animate);
    }

    animate();
}