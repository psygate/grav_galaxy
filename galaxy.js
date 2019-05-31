'use strict';

class FPSCounter {
    constructor(fpsUpdate) {
        this.ticks = []
        this.fpsUpdate = fpsUpdate
    }

    tick() {
        const millis = (new Date).getTime()
        if (this.tick && millis - this.ticks[0] >= 1000) {
            console.log("Tick")
            this.fpsUpdate(this.ticks.length)
            this.ticks = []
        }

        this.ticks.push(millis)
    }
}

let PID = 0

const GLOBALS = {
    simulate: true,
    terminate: false,
    postDeathCallback: () => {
    },
}

class Particle {
    constructor(x, y, vx, vy, mass) {
        this.id = PID++
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = mass;
    }
}

const initSystem = (settings) => {
    const particles = new Array(settings.particleNumber);

    for (let i = 0; i < particles.length; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random();

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const deltaVRadius = Math.random() * 0.001
        // const angleDeltaV = Math.random() * Math.PI * 2;
        const angleDeltaV = angle + Math.PI / 2
        const vx = Math.cos(angleDeltaV) * deltaVRadius
        const vy = Math.sin(angleDeltaV) * deltaVRadius

        particles[i] = new Particle(x, y, vx, vy, 1);
    }

    return {
        particles: particles,
        constants: {
            gravity: 0.00001,
        },
        renderTarget: settings.renderTarget,
    }
}

const renderSystem = (system) => {
    system.renderTarget.clear()
    for (let particle of system.particles) {
        system.renderTarget.drawParticle(particle);
    }
}

const applySystemGravity = (system) => {
    const G = system.constants.gravity
    for (let i = 0; i < system.particles.length; i++) {
        for (let j = 0; j < system.particles.length; j++) {
            if (i == j) continue
            const pa = system.particles[i]
            const pb = system.particles[j]
            if (pa.id === pb.id) continue

            const dx = pa.x - pb.x
            const dy = pa.y - pb.y
            const distpapb = Math.sqrt(dx * dx + dy * dy)

            if (distpapb !== 0) {
                if (distpapb < 0.001) {
                    pa.mass = pa.mass + pb.mass
                    system.particles[j] = pa
                } else {
                    const forceUVx = dx / distpapb
                    const forceUVy = dy / distpapb

                    const force = G * (pa.mass * pb.mass) / distpapb
                    pa.vx -= force * forceUVx
                    pa.vy -= force * forceUVy
                }
            } else {
                console.log(`Zero distance:`, system.particles[i], system.particles[j])
            }
        }
    }
}

const applyParticleMovement = (system) => {
    for (let i = 0; i < system.particles.length; i++) {
        const particle = system.particles[i]
        particle.x += particle.vx
        particle.y += particle.vy
    }
}

const applySystemPhysics = (system) => {
    applySystemGravity(system)
    applyParticleMovement(system)
}

let lastCall = performance.now()

function renderCallback(system, meta) {
    meta.fpsCounter.tick()
    if (GLOBALS.simulate) applySystemPhysics(system)
    renderSystem(system)

    while (performance.now() - lastCall < 1000 / 60) {
        //FPS limit
    }

    lastCall = performance.now()

    if (!GLOBALS.terminate) {
        window.requestAnimationFrame((timestamp) => {
            renderCallback(system, meta)
        })
    } else {
        GLOBALS.postDeathCallback()
    }
}

const colorByMass = (mass) => {
    if (mass < 10) {
        return '#FFFFFF'
    } else if (mass < 50) {
        return '#0000FF'
    } else {
        return '#FF0000'
    }
}

const simulate = (canvas, settings) => {
    const ctx = canvas.getContext("2d")

    const drawParticleFunction = (particle) => {
        const x = ((particle.x + 1) / 2) * canvas.width
        const y = ((particle.y + 1) / 2) * canvas.height
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = colorByMass(particle.mass);
        ctx.fill();
        // ctx.lineWidth = 0;
        // ctx.strokeStyle = '#FFFFFF';
        // ctx.stroke();
    }

    const systemSettings = {
        particleNumber: settings.particleNumber,
        renderTarget: {
            drawParticle: drawParticleFunction,
            clear: () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        },
    }

    const system = initSystem(systemSettings);

    renderCallback(system, settings)
}

const main = () => {
    const canvas = document.getElementById("particle_canvas");
    canvas.setAttribute("style", "background-color: black;");

    const fpsSpan = document.getElementById("fps_counter")
    const fpsCounter = new FPSCounter((fps) => {
        fpsSpan.innerHTML = fps
    })

    const settings = {
        particleNumber: 1000,
        fpsCounter: fpsCounter,
    }

    const particleNumberSlider = document.getElementById("particle_number")
    const particleNumber = [2, 5, 10, 100, 500, 1000, 2000, 5000, 10000]
    particleNumberSlider.min = 0
    particleNumberSlider.max = particleNumber.length - 1
    particleNumberSlider.value = 5

    particleNumberSlider.addEventListener("change", (ev) => {
        const newNumber = particleNumber[ev.target.value]
        document.getElementById("particle_number_value").innerText = newNumber
        settings.particleNumber = newNumber

        GLOBALS.postDeathCallback = () => {
            GLOBALS.terminate = false
            simulate(canvas, settings);
        }

        GLOBALS.terminate = true
    })

    const runSimulationCheckbox = document.getElementById("run_simulation_checkbox")
    runSimulationCheckbox.addEventListener("change", (ev) => {
        GLOBALS.simulate = ev.target.checked
    })

    simulate(canvas, settings);
}


document.addEventListener("DOMContentLoaded", (ev) => {
    main()
});
