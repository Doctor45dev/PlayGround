(() => {
  const canvas = document.getElementById('field');
  const hint = document.getElementById('hint');
  const countLabel = document.getElementById('count');
  const fpsLabel = document.getElementById('fps');
  const reseedButton = document.getElementById('reseed');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0, active: false };
  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;

  const palette = ['#6ee7ff', '#8b9dff', '#ff7ab8', '#ffd479', '#7cf5c8'];

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawn(count) {
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: randomBetween(-26, 26),
      vy: randomBetween(-26, 26),
      radius: randomBetween(1.2, 3.2),
      color: palette[Math.floor(Math.random() * palette.length)],
      phase: randomBetween(0, Math.PI * 2)
    }));
    if (countLabel) countLabel.textContent = String(count);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.round(Math.min(240, Math.max(70, (width * height) / 5200)));
    if (particles.length === 0 || Math.abs(target - particles.length) > 24) spawn(target);
  }

  function step(dt, time) {
    const linkDistance = width < 600 ? 84 : 112;
    const stiffness = pointer.active ? 0.0009 : 0.0002;

    for (const particle of particles) {
      if (pointer.active) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distanceSq = dx * dx + dy * dy;
        const influence = Math.max(0, 1 - distanceSq / (260 * 260));
        particle.vx += dx * influence * stiffness * 60;
        particle.vy += dy * influence * stiffness * 60;
      }

      particle.vx += Math.cos(time * 0.0005 + particle.phase) * 2.5 * dt;
      particle.vy += Math.sin(time * 0.0006 + particle.phase) * 2.5 * dt;
      particle.vx *= 0.995;
      particle.vy *= 0.995;

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      if (particle.x < 0) {
        particle.x = 0;
        particle.vx = Math.abs(particle.vx);
      } else if (particle.x > width) {
        particle.x = width;
        particle.vx = -Math.abs(particle.vx);
      }
      if (particle.y < 0) {
        particle.y = 0;
        particle.vy = Math.abs(particle.vy);
      } else if (particle.y > height) {
        particle.y = height;
        particle.vy = -Math.abs(particle.vy);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq > 112 * 112) continue;
        const alpha = (1 - Math.sqrt(distanceSq) / 112) * 0.22;
        ctx.strokeStyle = `rgba(139, 157, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    for (const particle of particles) {
      ctx.beginPath();
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (pointer.active) {
      const gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 130);
      gradient.addColorStop(0, 'rgba(110, 231, 255, 0.16)');
      gradient.addColorStop(1, 'rgba(110, 231, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 130, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let last = performance.now();
  let fpsAccumulator = 0;
  let fpsFrames = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt, now);
    draw();

    fpsAccumulator += dt;
    fpsFrames += 1;
    if (fpsAccumulator >= 0.5) {
      if (fpsLabel) fpsLabel.textContent = `${Math.round(fpsFrames / fpsAccumulator)} fps`;
      fpsAccumulator = 0;
      fpsFrames = 0;
    }

    requestAnimationFrame(frame);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    if (hint) hint.textContent = 'nice — the field is following you';
  }

  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerdown', updatePointer);
  canvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });

  reseedButton?.addEventListener('click', () => {
    const target = Math.round(Math.min(240, Math.max(70, (width * height) / 5200)));
    spawn(target);
  });

  window.addEventListener('resize', resize, { passive: true });
  reducedMotion.addEventListener?.('change', () => {
    if (reducedMotion.matches) {
      pointer.active = false;
    }
  });

  resize();
  requestAnimationFrame(frame);
})();
