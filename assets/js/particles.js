export function initParticles() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animationId;
  let width, height;

  const config = {
    particleCount: 60,
    particleSize: 2,
    connectionDistance: 120,
    moveSpeed: 0.5,
    particleColor: "rgba(255, 255, 255, 0.5)",
    lineColor: "rgba(255, 255, 255, 0.1)",
  };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * config.moveSpeed,
      vy: (Math.random() - 0.5) * config.moveSpeed,
      size: Math.random() * config.particleSize + 1,
    };
  }

  function initParticleArray() {
    particles = [];
    for (let i = 0; i < config.particleCount; i++) {
      particles.push(createParticle());
    }
  }

  function drawParticle(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = config.particleColor;
    ctx.fill();
  }

  function drawConnection(p1, p2, distance) {
    const opacity = 1 - distance / config.connectionDistance;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * 0.15})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function updateParticle(p) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    p.x = Math.max(0, Math.min(width, p.x));
    p.y = Math.max(0, Math.min(height, p.y));
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      updateParticle(p1);
      drawParticle(p1);

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.connectionDistance) {
          drawConnection(p1, p2, distance);
        }
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  function start() {
    resize();
    initParticleArray();
    animate();
  }

  function handleVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate();
    }
  }

  window.addEventListener("resize", () => {
    resize();
    initParticleArray();
  });

  document.addEventListener("visibilitychange", handleVisibility);

  start();
}
