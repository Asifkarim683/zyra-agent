import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AiOrb3DProps {
  state: OrbState;
  onClick?: () => void;
  className?: string;
}

export const AiOrb3D: React.FC<AiOrb3DProps> = ({ state, onClick, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<OrbState>(state);
  stateRef.current = state;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00f2fe, 3, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9d4edd, 3, 20);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // 3. Central Morphing Icosahedron Core
    const sphereRadius = 1.6;
    const coreGeometry = new THREE.IcosahedronGeometry(sphereRadius, 32);
    // Cache original positions for wave displacement
    const originalPositions = coreGeometry.attributes.position.array.slice();

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x051329,
      emissive: 0x0a224a,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.7,
      ior: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 4. Wireframe Hologram Overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const wireframeMesh = new THREE.Mesh(coreGeometry, wireframeMaterial);
    scene.add(wireframeMesh);

    // 5. Outer Gyroscopic Sci-Fi Energy Rings
    const ring1Geo = new THREE.TorusGeometry(2.3, 0.018, 16, 100);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.5, 0.014, 16, 100);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    // 6. Surrounding Quantum Particle Swarm
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleOriginals = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = sphereRadius * (1.3 + Math.random() * 0.9);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      particleOriginals[i * 3] = x;
      particleOriginals[i * 3 + 1] = y;
      particleOriginals[i * 3 + 2] = z;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 7. Mouse Interactivity Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 1.5;
      mouseY = y * 1.5;
    };
    window.addEventListener('mousemove', onMouseMove);

    // 8. Animation Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;

      // Smooth camera parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 1.2;
      camera.position.y = -targetY * 1.2;
      camera.lookAt(scene.position);

      // Dynamic variables based on state
      let speedMultiplier = 1.0;
      let waveAmplitude = 0.08;
      let waveFrequency = 3.0;
      let coreColor = 0x051329;
      let emissiveColor = 0x0a224a;
      let accentColor = 0x00f2fe;

      if (currentState === 'listening') {
        speedMultiplier = 2.2;
        waveAmplitude = 0.22;
        waveFrequency = 5.0;
        coreColor = 0x022c22;
        emissiveColor = 0x10b981; // Vibrant neon emerald
        accentColor = 0x34d399;
      } else if (currentState === 'thinking') {
        speedMultiplier = 3.5;
        waveAmplitude = 0.16;
        waveFrequency = 7.0;
        coreColor = 0x2e1065;
        emissiveColor = 0xa855f7; // Electric cosmic violet
        accentColor = 0xc084fc;
      } else if (currentState === 'speaking') {
        speedMultiplier = 2.8;
        // Audio reactive pulsating wave simulation
        waveAmplitude = 0.28 + Math.sin(elapsed * 12) * 0.08;
        waveFrequency = 4.5;
        coreColor = 0x082f49;
        emissiveColor = 0x0284c7; // Bright cyber blue
        accentColor = 0x38bdf8;
      }

      // Smooth color transitions
      coreMaterial.color.lerp(new THREE.Color(coreColor), 0.06);
      coreMaterial.emissive.lerp(new THREE.Color(emissiveColor), 0.06);
      wireframeMaterial.color.lerp(new THREE.Color(accentColor), 0.08);
      ring1Mat.color.lerp(new THREE.Color(accentColor), 0.08);
      particleMat.color.lerp(new THREE.Color(accentColor), 0.08);

      // Deform sphere geometry vertices using 3D harmonic wave noise
      const posAttr = coreGeometry.attributes.position;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];

        // Spherical wave deformation
        const length = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / length;
        const ny = oy / length;
        const nz = oz / length;

        const wave =
          Math.sin(nx * waveFrequency + elapsed * speedMultiplier * 2) *
          Math.cos(ny * waveFrequency + elapsed * speedMultiplier * 2.5) *
          Math.sin(nz * waveFrequency + elapsed * speedMultiplier * 1.8);

        const currentRadius = sphereRadius + wave * waveAmplitude;

        posAttr.setXYZ(i, nx * currentRadius, ny * currentRadius, nz * currentRadius);
      }
      posAttr.needsUpdate = true;
      coreGeometry.computeVertexNormals();

      // Gyroscopic Ring Rotations
      ring1.rotation.z += 0.008 * speedMultiplier;
      ring1.rotation.y += 0.005 * speedMultiplier;

      ring2.rotation.x -= 0.006 * speedMultiplier;
      ring2.rotation.z += 0.009 * speedMultiplier;

      // Swarm Particle Motion
      const pAttr = particleGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        const ox = particleOriginals[i * 3];
        const oy = particleOriginals[i * 3 + 1];
        const oz = particleOriginals[i * 3 + 2];

        const pAngle = elapsed * 0.4 * speedMultiplier + i * 0.02;
        const s = Math.sin(pAngle);
        const c = Math.cos(pAngle);

        // Orbit around Y axis with subtle breathing
        const rx = ox * c - oz * s;
        const rz = ox * s + oz * c;
        const pulse = 1.0 + Math.sin(elapsed * 2 + i) * 0.05 * waveAmplitude;

        pAttr.setXYZ(i, rx * pulse, oy * pulse, rz * pulse);
      }
      pAttr.needsUpdate = true;

      // Core mesh gentle rotation
      coreMesh.rotation.y += 0.004 * speedMultiplier;
      wireframeMesh.rotation.y = coreMesh.rotation.y;
      wireframeMesh.rotation.x = coreMesh.rotation.x;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 320;
      const newH = container.clientHeight || 320;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      wireframeMaterial.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      className={className}
    >
      <div
        ref={containerRef}
        style={{
          width: '320px',
          height: '320px',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      />
    </div>
  );
};
