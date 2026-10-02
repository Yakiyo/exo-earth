export function initStarfield(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let stars = [];
  const numStars = 200;
  let mouseX = 0;
  let mouseY = 0;

  function resize() {
    // scale for retina displays
    const dpr = window.devicePixelRatio || 1;
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    initStars();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 2 + 0.1, // depth for parallax (larger = further away = slower)
        size: Math.random() * 1.5 + 0.5,
        baseAlpha: Math.random() * 0.5 + 0.3,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    
    // Calculate target offset based on mouse (small effect)
    const targetOffsetX = (mouseX - width / 2) * 0.05;
    const targetOffsetY = (mouseY - height / 2) * 0.05;

    for (let i = 0; i < stars.length; i++) {
      let star = stars[i];
      
      // Calculate star's actual position including parallax offset
      let px = star.x - (targetOffsetX / star.z);
      let py = star.y - (targetOffsetY / star.z);

      // Wrap around edges to create continuous feel
      if (px < 0) px += width;
      else if (px > width) px -= width;
      
      if (py < 0) py += height;
      else if (py > height) py -= height;

      // Twinkle effect
      const alpha = star.baseAlpha + Math.sin(Date.now() * 0.002 * star.size) * 0.2;
      
      ctx.beginPath();
      ctx.arc(px, py, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    }
    
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    // Only track mouse within the stage to avoid weird jumps if tracking body
    const rect = canvas.parentElement.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && 
        e.clientY >= rect.top && e.clientY <= rect.bottom) {
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }
  });

  resize();
  draw();
}
