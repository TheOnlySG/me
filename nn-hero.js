import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Color Palette tuned for AI/ML Portfolio (Spruce Teal, Neon Emerald, Cyan, Electric Sage)
const colorPalettes = [
  [
    new THREE.Color(0x38f9d7),
    new THREE.Color(0x00f2fe),
    new THREE.Color(0x3A6B65),
    new THREE.Color(0x608983),
    new THREE.Color(0x4facfe),
  ],
  [
    new THREE.Color(0x667eea),
    new THREE.Color(0x764ba2),
    new THREE.Color(0xf093fb),
    new THREE.Color(0x9d50bb),
    new THREE.Color(0x6e48aa),
  ],
];

const config = {
  paused: false,
  activePaletteIndex: 0,
  currentFormation: 0,
  densityFactor: 0.9,
};

const canvasElement = document.getElementById('neural-network-canvas');
if (!canvasElement) {
  console.warn('neural-network-canvas not found');
}

const heroSection = document.getElementById('top') || canvasElement?.parentElement || document.body;

function getHeroBounds() {
  const width = window.innerWidth;
  const height = heroSection ? heroSection.clientHeight : window.innerHeight;
  return { width: Math.max(width, 320), height: Math.max(height, 400) };
}

const { width: initW, height: initH } = getHeroBounds();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050708, 0.0025);

const camera = new THREE.PerspectiveCamera(65, initW / initH, 0.1, 1000);
camera.position.set(0, 7, 28);

const renderer = new THREE.WebGLRenderer({
  canvas: canvasElement,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setSize(initW, initH);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x050708, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

function createStarfield() {
  const count = 4500;
  const positions = [];
  const colors = [];
  const sizes = [];
  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.randFloat(40, 140);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    const colorChoice = Math.random();
    if (colorChoice < 0.65) {
      colors.push(0.9, 0.95, 0.95);
    } else if (colorChoice < 0.85) {
      colors.push(0.23, 0.97, 0.84); // spruce cyan
    } else {
      colors.push(0.38, 0.54, 0.51); // muted spruce
    }
    sizes.push(THREE.MathUtils.randFloat(0.1, 0.35));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.35 + 0.65;
        gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha * 0.7);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

const starField = createStarfield();
scene.add(starField);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.6;
controls.minDistance = 8;
controls.maxDistance = 80;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.2;
controls.enablePan = false;
controls.enableZoom = false; // keep page scroll natural

let autoRotateResumeTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  canvasElement.style.cursor = 'grabbing';
});

controls.addEventListener('end', () => {
  canvasElement.style.cursor = 'crosshair';
  clearTimeout(autoRotateResumeTimer);
  autoRotateResumeTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 2200);
});

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(initW, initH),
  1.6, // bloom strength
  0.55, // radius
  0.72 // threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const pulseUniforms = {
  uTime: { value: 0.0 },
  uPulsePositions: {
    value: [
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
    ],
  },
  uPulseTimes: { value: [-1e3, -1e3, -1e3] },
  uPulseColors: {
    value: [
      new THREE.Color(0.22, 0.98, 0.84),
      new THREE.Color(0.0, 0.95, 1.0),
      new THREE.Color(0.23, 0.42, 0.4),
    ],
  },
  uPulseSpeed: { value: 20.0 },
  uBaseNodeSize: { value: 0.55 },
};

const noiseFunctions = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

const nodeShader = {
  vertexShader: `${noiseFunctions}
    attribute float nodeSize;
    attribute float nodeType;
    attribute vec3 nodeColor;
    attribute float distanceFromRoot;
    
    uniform float uTime;
    uniform vec3 uPulsePositions[3];
    uniform float uPulseTimes[3];
    uniform float uPulseSpeed;
    uniform float uBaseNodeSize;
    
    varying vec3 vColor;
    varying float vNodeType;
    varying vec3 vPosition;
    varying float vPulseIntensity;
    varying float vDistanceFromRoot;
    varying float vGlow;

    float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
    }

    void main() {
      vNodeType = nodeType;
      vColor = nodeColor;
      vDistanceFromRoot = distanceFromRoot;
      vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vPosition = worldPos;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
      float baseSize = nodeSize * breathe;
      float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);
      vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);
      vec3 modifiedPosition = position;
      if (nodeType > 0.5) {
        float noise = snoise(position * 0.08 + uTime * 0.08);
        modifiedPosition += normal * noise * 0.15;
      }
      vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
      gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uPulseColors[3];
    varying vec3 vColor;
    varying float vNodeType;
    varying vec3 vPosition;
    varying float vPulseIntensity;
    varying float vDistanceFromRoot;
    varying float vGlow;

    void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0;
      float dist = length(center);
      if (dist > 1.0) discard;
      float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
      float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
      float glowStrength = pow(glow1, 1.2) + glow2 * 0.3;
      float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
      vec3 baseColor = vColor * breatheColor;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.4);
        finalColor = mix(baseColor, pulseColor, vPulseIntensity * 0.8);
        finalColor *= (1.0 + vPulseIntensity * 1.2);
        glowStrength *= (1.0 + vPulseIntensity);
      }
      float coreBrightness = smoothstep(0.4, 0.0, dist);
      finalColor += vec3(1.0) * coreBrightness * 0.3;
      float alpha = glowStrength * (0.95 - 0.3 * dist);
      float camDistance = length(vPosition - cameraPosition);
      float distanceFade = smoothstep(100.0, 15.0, camDistance);
      if (vNodeType > 0.5) {
        finalColor *= 1.1;
        alpha *= 0.9;
      }
      finalColor *= (1.0 + vGlow * 0.1);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
    }
  `,
};

const connectionShader = {
  vertexShader: `${noiseFunctions}
    attribute vec3 startPoint;
    attribute vec3 endPoint;
    attribute float connectionStrength;
    attribute float pathIndex;
    attribute vec3 connectionColor;
    
    uniform float uTime;
    uniform vec3 uPulsePositions[3];
    uniform float uPulseTimes[3];
    uniform float uPulseSpeed;
    
    varying vec3 vColor;
    varying float vConnectionStrength;
    varying float vPulseIntensity;
    varying float vPathPosition;
    varying float vDistanceFromCamera;

    float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
      if (pulseTime < 0.0) return 0.0;
      float timeSinceClick = uTime - pulseTime;
      if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
      float pulseRadius = timeSinceClick * uPulseSpeed;
      float distToClick = distance(worldPos, pulsePos);
      float pulseThickness = 3.0;
      float waveProximity = abs(distToClick - pulseRadius);
      return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
    }

    void main() {
      float t = position.x;
      vPathPosition = t;
      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      float pathOffset = sin(t * 3.14159) * 0.15;
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
      midPoint += perpendicular * pathOffset;
      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t);
      float noiseTime = uTime * 0.15;
      float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
      finalPos += perpendicular * noise * 0.12;
      vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      float totalPulseIntensity = 0.0;
      for (int i = 0; i < 3; i++) {
        totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
      }
      vPulseIntensity = min(totalPulseIntensity, 1.0);
      vColor = connectionColor;
      vConnectionStrength = connectionStrength;
      vDistanceFromCamera = length(worldPos - cameraPosition);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uPulseColors[3];
    varying vec3 vColor;
    varying float vConnectionStrength;
    varying float vPulseIntensity;
    varying float vPathPosition;
    varying float vDistanceFromCamera;

    void main() {
      float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
      float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
      float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;
      vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
      float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;
      vec3 finalColor = baseColor;
      if (vPulseIntensity > 0.0) {
        vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
        finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
        flowIntensity += vPulseIntensity * 0.8;
      }
      finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);
      float baseAlpha = 0.7 * vConnectionStrength;
      float flowAlpha = combinedFlow * 0.3;
      float alpha = baseAlpha + flowAlpha;
      alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);
      float distanceFade = smoothstep(100.0, 15.0, vDistanceFromCamera);
      gl_FragColor = vec4(finalColor, alpha * distanceFade);
    }
  `,
};

class Node {
  constructor(position, level = 0, type = 0) {
    this.position = position;
    this.connections = [];
    this.level = level;
    this.type = type;
    this.size = type === 0 ? THREE.MathUtils.randFloat(0.8, 1.3) : THREE.MathUtils.randFloat(0.5, 0.9);
    this.distanceFromRoot = 0;
  }
  addConnection(node, strength = 1.0) {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }
  isConnectedTo(node) {
    return this.connections.some((conn) => conn.node === node);
  }
}

function generateNeuralNetwork(densityFactor = 0.85) {
  let nodes = [];
  const rootNode = new Node(new THREE.Vector3(0, 0, 0), 0, 0);
  rootNode.size = 2.0;
  nodes.push(rootNode);

  const layers = 5;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let layer = 1; layer <= layers; layer++) {
    const radius = layer * 4;
    const numPoints = Math.floor(layer * 12 * densityFactor);
    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
      const theta = (2 * Math.PI * i) / goldenRatio;
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      const isLeaf = layer === layers || Math.random() < 0.3;
      const node = new Node(pos, layer, isLeaf ? 1 : 0);
      node.distanceFromRoot = radius;
      nodes.push(node);

      if (layer > 1) {
        const prevLayerNodes = nodes.filter((n) => n.level === layer - 1 && n !== rootNode);
        prevLayerNodes.sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
        for (let j = 0; j < Math.min(3, prevLayerNodes.length); j++) {
          const dist = pos.distanceTo(prevLayerNodes[j].position);
          const strength = 1.0 - dist / (radius * 2);
          node.addConnection(prevLayerNodes[j], Math.max(0.3, strength));
        }
      } else {
        rootNode.addConnection(node, 0.9);
      }
    }

    const layerNodes = nodes.filter((n) => n.level === layer && n !== rootNode);
    for (let i = 0; i < layerNodes.length; i++) {
      const node = layerNodes[i];
      const nearby = layerNodes
        .filter((n) => n !== node)
        .sort((a, b) => node.position.distanceTo(a.position) - node.position.distanceTo(b.position))
        .slice(0, 4);
      for (const nearNode of nearby) {
        const dist = node.position.distanceTo(nearNode.position);
        if (dist < radius * 0.8 && !node.isConnectedTo(nearNode)) {
          node.addConnection(nearNode, 0.55);
        }
      }
    }
  }

  return { nodes, rootNode };
}

let neuralNetwork = null;
let nodesMesh = null;
let connectionsMesh = null;

function createNetworkVisualization() {
  if (nodesMesh) {
    scene.remove(nodesMesh);
    nodesMesh.geometry.dispose();
    nodesMesh.material.dispose();
  }
  if (connectionsMesh) {
    scene.remove(connectionsMesh);
    connectionsMesh.geometry.dispose();
    connectionsMesh.material.dispose();
  }

  neuralNetwork = generateNeuralNetwork(config.densityFactor);
  if (!neuralNetwork || neuralNetwork.nodes.length === 0) return;

  const nodesGeometry = new THREE.BufferGeometry();
  const nodePositions = [];
  const nodeTypes = [];
  const nodeSizes = [];
  const nodeColors = [];
  const distancesFromRoot = [];
  const palette = colorPalettes[config.activePaletteIndex];

  neuralNetwork.nodes.forEach((node) => {
    nodePositions.push(node.position.x, node.position.y, node.position.z);
    nodeTypes.push(node.type);
    nodeSizes.push(node.size);
    distancesFromRoot.push(node.distanceFromRoot);
    const colorIndex = Math.min(node.level, palette.length - 1);
    const baseColor = palette[colorIndex % palette.length].clone();
    baseColor.offsetHSL(
      THREE.MathUtils.randFloatSpread(0.02),
      THREE.MathUtils.randFloatSpread(0.06),
      THREE.MathUtils.randFloatSpread(0.06)
    );
    nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
  });

  nodesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
  nodesGeometry.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1));
  nodesGeometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
  nodesGeometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
  nodesGeometry.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distancesFromRoot, 1));

  const nodesMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: nodeShader.vertexShader,
    fragmentShader: nodeShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  nodesMesh = new THREE.Points(nodesGeometry, nodesMaterial);
  scene.add(nodesMesh);

  const connectionsGeometry = new THREE.BufferGeometry();
  const connectionColors = [];
  const connectionStrengths = [];
  const connectionPositions = [];
  const startPoints = [];
  const endPoints = [];
  const pathIndices = [];
  const processedConnections = new Set();
  let pathIndex = 0;

  neuralNetwork.nodes.forEach((node, nodeIndex) => {
    node.connections.forEach((connection) => {
      const connectedNode = connection.node;
      const connectedIndex = neuralNetwork.nodes.indexOf(connectedNode);
      if (connectedIndex === -1) return;
      const key = [Math.min(nodeIndex, connectedIndex), Math.max(nodeIndex, connectedIndex)].join('-');
      if (!processedConnections.has(key)) {
        processedConnections.add(key);
        const startPoint = node.position;
        const endPoint = connectedNode.position;
        const numSegments = 18;
        for (let i = 0; i < numSegments; i++) {
          const t = i / (numSegments - 1);
          connectionPositions.push(t, 0, 0);
          startPoints.push(startPoint.x, startPoint.y, startPoint.z);
          endPoints.push(endPoint.x, endPoint.y, endPoint.z);
          pathIndices.push(pathIndex);
          connectionStrengths.push(connection.strength);
          const avgLevel = Math.min(Math.floor((node.level + connectedNode.level) / 2), palette.length - 1);
          const baseColor = palette[avgLevel % palette.length].clone();
          baseColor.offsetHSL(
            THREE.MathUtils.randFloatSpread(0.02),
            THREE.MathUtils.randFloatSpread(0.06),
            THREE.MathUtils.randFloatSpread(0.06)
          );
          connectionColors.push(baseColor.r, baseColor.g, baseColor.b);
        }
        pathIndex++;
      }
    });
  });

  connectionsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
  connectionsGeometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
  connectionsGeometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
  connectionsGeometry.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(connectionStrengths, 1));
  connectionsGeometry.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connectionColors, 3));
  connectionsGeometry.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1));

  const connectionsMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(pulseUniforms),
    vertexShader: connectionShader.vertexShader,
    fragmentShader: connectionShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  connectionsMesh = new THREE.LineSegments(connectionsGeometry, connectionsMaterial);
  scene.add(connectionsMesh);

  palette.forEach((color, i) => {
    if (i < 3) {
      connectionsMaterial.uniforms.uPulseColors.value[i].copy(color);
      nodesMaterial.uniforms.uPulseColors.value[i].copy(color);
    }
  });
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const interactionPoint = new THREE.Vector3();
let lastPulseIndex = 0;

function triggerPulse(clientX, clientY) {
  const rect = canvasElement.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  pointer.x = (relX / rect.width) * 2 - 1;
  pointer.y = -(relY / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  interactionPlane.normal.copy(camera.position).normalize();
  interactionPlane.constant = -interactionPlane.normal.dot(camera.position) + camera.position.length() * 0.5;

  if (raycaster.ray.intersectPlane(interactionPlane, interactionPoint)) {
    const time = clock.getElapsedTime();
    if (nodesMesh && connectionsMesh) {
      lastPulseIndex = (lastPulseIndex + 1) % 3;
      nodesMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(interactionPoint);
      nodesMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;
      connectionsMesh.material.uniforms.uPulsePositions.value[lastPulseIndex].copy(interactionPoint);
      connectionsMesh.material.uniforms.uPulseTimes.value[lastPulseIndex] = time;
      const palette = colorPalettes[config.activePaletteIndex];
      const randomColor = palette[Math.floor(Math.random() * palette.length)];
      nodesMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(randomColor);
      connectionsMesh.material.uniforms.uPulseColors.value[lastPulseIndex].copy(randomColor);
    }
  }
}

// Interactive pulse clicks on canvas or empty areas of hero
let downX = 0;
let downY = 0;
heroSection.addEventListener('pointerdown', (e) => {
  downX = e.clientX;
  downY = e.clientY;
}, { passive: true });

const handlePulseEvent = (e) => {
  if (e.target.closest('a, button, input, .hero-links, .masthead')) return;
  const clientX = e.clientX ?? (e.touches ? e.touches[0].clientX : 0);
  const clientY = e.clientY ?? (e.touches ? e.touches[0].clientY : 0);
  const dist = Math.hypot(clientX - downX, clientY - downY);
  // Distinguish click from drag-orbit
  if (dist < 8) {
    triggerPulse(clientX, clientY);
  }
};

heroSection.addEventListener('click', handlePulseEvent);
heroSection.addEventListener('touchstart', (e) => {
  if (e.target.closest('a, button, input, .hero-links, .masthead')) return;
  if (e.touches.length > 0) {
    triggerPulse(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: true });

// PC Cursor Mousemove Parallax Tilt
let mouseX = 0;
let mouseY = 0;
let targetTiltX = 0;
let targetTiltY = 0;

heroSection.addEventListener('mousemove', (e) => {
  const rect = heroSection.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width;
  const relY = (e.clientY - rect.top) / rect.height;
  mouseX = (relX - 0.5) * 2;
  mouseY = (relY - 0.5) * 2;
  targetTiltX = mouseX * 0.08;
  targetTiltY = mouseY * 0.06;
}, { passive: true });

heroSection.addEventListener('mouseleave', () => {
  targetTiltX = 0;
  targetTiltY = 0;
});

const clock = new THREE.Clock();
let isRendering = false;
let animId = null;

function animate() {
  if (!isRendering) return;
  animId = requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  if (!config.paused) {
    if (nodesMesh) {
      nodesMesh.material.uniforms.uTime.value = t;
      nodesMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      nodesMesh.rotation.x += (targetTiltY - nodesMesh.rotation.x) * 0.05;
      nodesMesh.rotation.z += (-targetTiltX - nodesMesh.rotation.z) * 0.05;
    }
    if (connectionsMesh) {
      connectionsMesh.material.uniforms.uTime.value = t;
      connectionsMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
      connectionsMesh.rotation.x += (targetTiltY - connectionsMesh.rotation.x) * 0.05;
      connectionsMesh.rotation.z += (-targetTiltX - connectionsMesh.rotation.z) * 0.05;
    }
  }
  starField.rotation.y += 0.0002;
  starField.material.uniforms.uTime.value = t;
  controls.update();
  composer.render();
}

function onWindowResize() {
  const { width, height } = getHeroBounds();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  bloomPass.resolution.set(width, height);
}

window.addEventListener('resize', onWindowResize);

// IntersectionObserver to auto-sleep rendering when hero is scrolled out of view
const heroObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (!isRendering) {
          isRendering = true;
          animate();
        }
      } else {
        isRendering = false;
        if (animId) cancelAnimationFrame(animId);
      }
    });
  },
  { threshold: 0.05 }
);

heroObserver.observe(heroSection);

function init() {
  createNetworkVisualization();
  isRendering = true;
  animate();
}

init();
