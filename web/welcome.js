import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { initStarfield } from './starfield.js';
import { SpaceScenery } from './space.js';

// Initialize background starfield
initStarfield('starfield');

// Setup Three.js Globe for the Welcome Page
const canvas = document.getElementById('welcomeGlobeCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = 3.5;
// Shift camera to the left to place the globe nicely on the right side of the screen
camera.position.x = 0;

// Add OrbitControls for interactivity
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false; // Disable zooming so it doesn't break layout
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

// Update size
function updateSize() {
  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', updateSize);
updateSize();

// Create Earth sphere
const geometry = new THREE.SphereGeometry(1.2, 64, 64);
const textureLoader = new THREE.TextureLoader();

// Assuming earth.jpg is available in assets
const earthTexture = textureLoader.load('assets/earth.jpg');

const material = new THREE.MeshStandardMaterial({
  map: earthTexture,
  roughness: 0.8,
  metalness: 0.1
});

const earth = new THREE.Mesh(geometry, material);
// Rotate it slightly for a better angle
earth.rotation.z = 23.5 * Math.PI / 180;
scene.add(earth);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// Add slight blue rim light
const rimLight = new THREE.DirectionalLight(0x4488ff, 1);
rimLight.position.set(-5, 0, -5);
scene.add(rimLight);

// The Moon, Mars and passing comets behind the Earth.
const space = new SpaceScenery(scene, camera, { radius: 1.2, pixelRatio: renderer.getPixelRatio() });
let lastFrame = performance.now();

// Render loop
function animate() {
  requestAnimationFrame(animate);
  // Update controls
  controls.update();
  const now = performance.now();
  space.update(Math.min(0.1, (now - lastFrame) / 1000));
  lastFrame = now;
  renderer.render(scene, camera);
}
animate();

// GSAP Animations
document.addEventListener("DOMContentLoaded", () => {
  // Initial entrance animations
  gsap.to("#title", { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.2 });
  gsap.to("#subtext", { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.4 });
  gsap.to("#exploreBtn", { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 0.6 });
  
  // Fade in the globe canvas
  gsap.fromTo(canvas, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.5, ease: "power2.out", delay: 0.5 });
});



// Page Transition
document.getElementById('exploreBtn').addEventListener('click', () => {
  window.location.href = 'targets.html';
});
