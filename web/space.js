/* Scenery around an Earth globe: the Moon and Mars hanging in the background,
 * and the occasional comet streaking past behind the Earth. Decoration only:
 * sizes and distances are chosen to frame the globe, not to scale.
 *
 * The Moon and Mars keep a place in the background beside the Earth and drift
 * back to it after you turn the globe, so they are in view at the default zoom. */

import * as THREE from "three";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DEG = Math.PI / 180;

/* Load a big equirectangular texture and keep a small copy (decoration needs little detail). */
function smallTexture(url, width = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = width;
      c.height = width / 2;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = url;
  });
}

const COMET_POINTS = 160;

function cometMaterial(pixelRatio) {
  return new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 26 * pixelRatio }, uFade: { value: 1 }, uHead: { value: new THREE.Color(0xf4fbff) }, uTail: { value: new THREE.Color(0x5fc8ff) } },
    vertexShader: `attribute float aT; uniform float uSize; varying float vT;
      void main() { vT = aT; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * mix(1.0, 0.18, sqrt(aT)) * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uFade; uniform vec3 uHead, uTail; varying float vT;
      void main() { float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard;
        float a = pow(1.0 - d, 1.4) * pow(1.0 - vT, 1.5) * uFade * (vT < 0.01 ? 1.0 : 0.55);
        gl_FragColor = vec4(mix(uHead, uTail, smoothstep(0.0, 0.35, vT)) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

export class SpaceScenery {
  /* scene, camera: the globe's; radius: the Earth's radius in scene units. */
  constructor(scene, camera, { radius = 1, pixelRatio = 1, comets = true, assets = "assets" } = {}) {
    this.scene = scene;
    this.camera = camera;
    this.radius = radius;
    this.comets = [];
    this.cometsOn = comets && !REDUCED;
    this.nextComet = performance.now() + 2500;
    this.pixelRatio = pixelRatio;

    // [texture, size, distance behind the Earth, bearing on screen (deg), extra angle beyond the Earth's edge]
    const specs = [
      { key: "moon", size: 0.27, behind: 5, bearing: 32, gap: 5, spin: 0.02 },
      { key: "mars", size: 0.36, behind: 15, bearing: 152, gap: 8, spin: 0.035 },
    ];
    this.bodies = specs.map((s) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(s.size * radius, 48, 24),
        new THREE.MeshLambertMaterial({ color: 0x6a6a6a }),
      );
      mesh.rotation.z = (s.key === "mars" ? 25 : 6.7) * DEG;
      mesh.visible = false;
      scene.add(mesh);
      smallTexture(`${assets}/${s.key}.jpg`).then((tex) => {
        mesh.material.dispose();
        mesh.material = new THREE.MeshLambertMaterial({ map: tex, color: s.key === "mars" ? 0xd8d8d8 : 0xc4c4c4 });
        mesh.visible = true;
      }).catch(() => {});
      return { ...s, mesh, placed: false };
    });
  }

  /* Where a background body sits now: beside the Earth's disc at its bearing, inside the frame. */
  _anchor(b) {
    const cam = this.camera;
    const dist = cam.position.length();
    const depth = dist + b.behind * this.radius;
    const edge = Math.asin(Math.min(1, (this.radius * 1.12) / dist));
    const tanA = Math.tan(edge + b.gap * DEG);
    const vf = Math.tan((cam.fov * DEG) / 2);
    const hf = vf * cam.aspect;
    const x = Math.max(-hf * 0.86, Math.min(hf * 0.86, tanA * Math.cos(b.bearing * DEG)));
    const y = Math.max(-vf * 0.8, Math.min(vf * 0.8, tanA * Math.sin(b.bearing * DEG)));
    return cam.localToWorld(new THREE.Vector3(x * depth, y * depth, -depth));
  }

  _spawnComet() {
    const cam = this.camera;
    const dist = cam.position.length();
    const depth = dist + this.radius * (3 + Math.random() * 7);
    const vf = Math.tan((cam.fov * DEG) / 2);
    const hf = vf * cam.aspect;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = (Math.random() * 1.3 - 0.4) * vf;
    const y1 = y0 + (Math.random() - 0.6) * vf;
    const start = cam.localToWorld(new THREE.Vector3(-dir * hf * 1.25 * depth, y0 * depth, -depth));
    const end = cam.localToWorld(new THREE.Vector3(dir * hf * 1.25 * depth, y1 * depth, -depth));
    const pos = new Float32Array(COMET_POINTS * 3);
    const t = new Float32Array(COMET_POINTS);
    for (let i = 0; i < COMET_POINTS; i++) t[i] = i / (COMET_POINTS - 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    const points = new THREE.Points(geo, cometMaterial(this.pixelRatio));
    points.frustumCulled = false;
    this.scene.add(points);
    // A gentle arc: bow the path a little toward the top of the screen.
    const bow = cam.localToWorld(new THREE.Vector3(0, depth * vf * 0.18, -depth)).sub(cam.localToWorld(new THREE.Vector3(0, 0, -depth)));
    this.comets.push({ points, start, end, bow, t0: performance.now(), dur: 2600 + Math.random() * 2200, tail: 0.12 + Math.random() * 0.08 });
  }

  _cometAt(c, f) {
    return c.start.clone().lerp(c.end, f).addScaledVector(c.bow, 4 * f * (1 - f));
  }

  update(dt) {
    const k = REDUCED ? 1 : 1 - Math.exp(-dt * 1.8);
    for (const b of this.bodies) {
      const target = this._anchor(b);
      if (!b.placed) { b.mesh.position.copy(target); b.placed = true; }
      else b.mesh.position.lerp(target, k);
      if (!REDUCED) b.mesh.rotation.y += b.spin * dt;
    }
    if (!this.cometsOn) return;
    const now = performance.now();
    if (now > this.nextComet && this.comets.length < 2) {
      this._spawnComet();
      this.nextComet = now + 5000 + Math.random() * 9000;
    }
    this.comets = this.comets.filter((c) => {
      const f = (now - c.t0) / c.dur;
      if (f >= 1 + c.tail) {
        this.scene.remove(c.points);
        c.points.geometry.dispose();
        c.points.material.dispose();
        return false;
      }
      const pos = c.points.geometry.attributes.position.array;
      for (let i = 0; i < COMET_POINTS; i++) {
        const p = this._cometAt(c, Math.max(0, f - (i / (COMET_POINTS - 1)) * c.tail));
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      }
      c.points.geometry.attributes.position.needsUpdate = true;
      // Fade in at the start and out once the head has left the frame.
      c.points.material.uniforms.uFade.value = Math.min(1, f * 6, (1 + c.tail - f) * 5);
      return true;
    });
  }
}
