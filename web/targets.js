import { initStarfield } from './starfield.js';

// Initialize background starfield
initStarfield('starfield');

document.addEventListener("DOMContentLoaded", async () => {
  // Animate header
  gsap.to("#title", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.4 });
  gsap.to("#subtitle", { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.5 });

  // Fetch targets
  try {
    const res = await fetch('/api/targets');
    const data = await res.json();
    const targets = data.targets || [];

    const grid = document.getElementById('targetsGrid');
    
    // Add custom exploration option if needed
    targets.push({
      id: "__custom__",
      name: "Custom Exploration",
      body: "earth",
      description: "Define your own criteria to search across the entire planet."
    });

    targets.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'target-card';
      card.dataset.id = t.id;
      
      // Try to determine an icon image based on body (case-insensitive)
      const bodyStr = (t.body || '').toLowerCase();
      let bgImage = '';
      if (bodyStr === 'moon') bgImage = 'assets/moon.jpg';
      else if (bodyStr === 'mars') bgImage = 'assets/mars.jpg';
      else bgImage = 'assets/earth.jpg';

      card.innerHTML = `
        <div class="target-icon" style="background-image: url('${bgImage}')"></div>
        <h2 class="target-name">${t.name}</h2>
        <p class="target-desc">${t.description || (t.body ? 'Target on ' + t.body.toUpperCase() : '')}</p>
      `;

      card.addEventListener('click', () => {
        selectTarget(t.id);
      });

      grid.appendChild(card);

      // Animate in
      // Use GSAP to set initial state to prevent any weird layout jumping before animation
      gsap.set(card, { opacity: 0, y: 30 });
      gsap.to(card, {
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: "power3.out", 
        delay: 0.6 + (i * 0.1),
        clearProps: "transform" // clear transform after animation for hover effects to work
      });
    });

  } catch (e) {
    console.error("Failed to load targets", e);
    document.getElementById('targetsGrid').innerHTML = '<p>Error loading targets. Please ensure the backend is running.</p>';
  }
});



function selectTarget(id) {
  window.location.href = `finder.html#target=${id}`;
}


