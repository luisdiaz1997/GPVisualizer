<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { computePosterior, linspace } from '@/utils/gp';

const props = defineProps({
  points: Array,
  samples: Array,
  params: Object,
});

const emit = defineEmits(['add-point']);

// Canvas ref and context
const canvasRef = ref(null);
let ctx = null;
let width = 0;
let height = 0;

// Coordinate bounds
const defaultBounds = { xMin: -3, xMax: 3, yMin: -2, yMax: 2 };
const bounds = ref({ ...defaultBounds });
const numTest = 300;
const testX = computed(() => linspace(bounds.value.xMin, bounds.value.xMax, numTest));

// Zoom and pan state
const zoomLevel = ref(1.0);
const panOffset = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const hasDragged = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const initialTouchDistance = ref(0);

// Zoom limits
const MAX_SCALE_FACTOR = 4; // World is 4x the default view
const MIN_ZOOM = 1 / MAX_SCALE_FACTOR;
const MAX_ZOOM = 3.0;

// Coordinate transforms
const toCanvasX = (x) => ((x - bounds.value.xMin) / (bounds.value.xMax - bounds.value.xMin)) * width;
const toCanvasY = (y) => height - ((y - bounds.value.yMin) / (bounds.value.yMax - bounds.value.yMin)) * height;
const toDataX = (cx) => bounds.value.xMin + (cx / width) * (bounds.value.xMax - bounds.value.xMin);
const toDataY = (cy) => bounds.value.yMax - (cy / height) * (bounds.value.yMax - bounds.value.yMin);

// Helper for dynamic grid spacing
function calculateGridStep(range) {
  if (range < 0.25) return 0.05;
  if (range < 0.5) return 0.1;
  if (range < 1) return 0.25;
  if (range < 2) return 0.5;
  return 1;
}

// Drawing functions
function drawGrid() {
  if (!ctx) return;

  ctx.strokeStyle = '#1e1e2e';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#666';

  const zeroX = toCanvasX(0);
  const zeroY = toCanvasY(0);

  // Calculate appropriate grid spacing based on zoom level
  const xRange = bounds.value.xMax - bounds.value.xMin;
  const yRange = bounds.value.yMax - bounds.value.yMin;

  const xStep = calculateGridStep(xRange);
  const yStep = calculateGridStep(yRange);

  // Draw vertical lines and labels
  const startX = Math.ceil(bounds.value.xMin / xStep) * xStep;
  const endX = Math.floor(bounds.value.xMax / xStep) * xStep;

  for (let x = startX; x <= endX; x += xStep) {
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // X-axis labels
    if (Math.abs(x) > 0.001) { // Avoid showing 0 label
      const label = xStep === 1 ? x.toString() : x.toFixed(2);
      // Clamp label Y position to keep it visible
      const labelY = Math.max(20, Math.min(height - 20, zeroY + 15));
      ctx.fillText(label, cx, labelY);
    }
  }

  // Draw horizontal lines and labels
  const startY = Math.ceil(bounds.value.yMin / yStep) * yStep;
  const endY = Math.floor(bounds.value.yMax / yStep) * yStep;

  for (let y = startY; y <= endY; y += yStep) {
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Y-axis labels
    if (Math.abs(y) > 0.001) { // Avoid showing 0 label
      const label = yStep === 1 ? y.toString() : y.toFixed(2);
      // Clamp label X position to keep it visible
      const labelX = Math.max(25, Math.min(width - 25, zeroX - 15));
      ctx.textAlign = 'right';
      ctx.fillText(label, labelX, cy);
    }
  }

  // Axes
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, zeroY);
  ctx.lineTo(width, zeroY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(zeroX, 0);
  ctx.lineTo(zeroX, height);
  ctx.stroke();
}

function drawConfidenceBand(mean, variance) {
  if (!ctx) return;
  
  ctx.beginPath();
  for (let i = 0; i < testX.value.length; i++) {
    const x = toCanvasX(testX.value[i]);
    const y = toCanvasY(mean[i] + 2 * Math.sqrt(variance[i]));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  for (let i = testX.value.length - 1; i >= 0; i--) {
    const x = toCanvasX(testX.value[i]);
    const y = toCanvasY(mean[i] - 2 * Math.sqrt(variance[i]));
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
  grad.addColorStop(0.5, 'rgba(124, 58, 237, 0.15)');
  grad.addColorStop(1, 'rgba(124, 58, 237, 0.3)');
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawMeanLine(mean) {
  if (!ctx) return;
  
  // Glow effect
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < testX.value.length; i++) {
    const x = toCanvasX(testX.value[i]);
    const y = toCanvasY(mean[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Main line
  ctx.beginPath();
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 3;
  for (let i = 0; i < testX.value.length; i++) {
    const x = toCanvasX(testX.value[i]);
    const y = toCanvasY(mean[i]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSamples() {
  if (!ctx) return;
  
  const colors = [
    'rgba(255, 150, 150, 0.5)',
    'rgba(150, 255, 150, 0.5)',
    'rgba(150, 150, 255, 0.5)',
    'rgba(255, 255, 150, 0.5)',
    'rgba(255, 150, 255, 0.5)',
  ];
  
  props.samples.forEach((sample, s) => {
    ctx.beginPath();
    ctx.strokeStyle = colors[s % colors.length];
    ctx.lineWidth = 2;
    sample.x.forEach((xi, i) => {
      const x = toCanvasX(xi);
      const y = toCanvasY(sample.y[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function drawPoints() {
  if (!ctx) return;
  
  props.points.forEach(pt => {
    const x = toCanvasX(pt.x);
    const y = toCanvasY(pt.y);

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 114, 182, 0.3)';
    ctx.fill();

    // Main dot
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f472b6';
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.5, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  });
}

function render() {
  if (!ctx) return;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, width, height);

  drawGrid();
  drawSamples();

  const { mean, variance } = computePosterior(props.points, testX.value, props.params);
  drawConfidenceBand(mean, variance);
  drawMeanLine(mean);
  drawPoints();
}

function setupCanvas() {
  if (!canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasRef.value.width = rect.width * dpr;
  canvasRef.value.height = rect.height * dpr;
  ctx = canvasRef.value.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  width = rect.width;
  height = rect.height;
  render();
}

// Zoom and pan functions
function clampPanOffset(offset) {
  const worldWidth = (defaultBounds.xMax - defaultBounds.xMin) * MAX_SCALE_FACTOR;
  const worldHeight = (defaultBounds.yMax - defaultBounds.yMin) * MAX_SCALE_FACTOR;
  
  const viewWidth = (defaultBounds.xMax - defaultBounds.xMin) / zoomLevel.value;
  const viewHeight = (defaultBounds.yMax - defaultBounds.yMin) / zoomLevel.value;

  // Max pan is half the difference between world size and view size
  const maxPanX = Math.max(0, (worldWidth - viewWidth) / 2);
  const maxPanY = Math.max(0, (worldHeight - viewHeight) / 2);
  
  return {
    x: Math.max(-maxPanX, Math.min(maxPanX, offset.x)),
    y: Math.max(-maxPanY, Math.min(maxPanY, offset.y))
  };
}

function updateBounds() {
  const centerX = (defaultBounds.xMin + defaultBounds.xMax) / 2 + panOffset.value.x;
  const centerY = (defaultBounds.yMin + defaultBounds.yMax) / 2 + panOffset.value.y;

  const rangeX = (defaultBounds.xMax - defaultBounds.xMin) / (2 * zoomLevel.value);
  const rangeY = (defaultBounds.yMax - defaultBounds.yMin) / (2 * zoomLevel.value);

  bounds.value = {
    xMin: centerX - rangeX,
    xMax: centerX + rangeX,
    yMin: centerY - rangeY,
    yMax: centerY + rangeY
  };
}

function handleWheel(e) {
  e.preventDefault();

  const rect = canvasRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldX = toDataX(mouseX);
  const worldY = toDataY(mouseY);

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.value * zoomFactor));

  if (newZoom !== zoomLevel.value) {
    zoomLevel.value = newZoom;

    // Calculate center point before zoom
    const centerX = (defaultBounds.xMin + defaultBounds.xMax) / 2 + panOffset.value.x;
    const centerY = (defaultBounds.yMin + defaultBounds.yMax) / 2 + panOffset.value.y;

    // Adjust pan to zoom towards mouse position
    panOffset.value.x += (worldX - centerX) * (1 - zoomFactor);
    panOffset.value.y += (worldY - centerY) * (1 - zoomFactor);
    
    panOffset.value = clampPanOffset(panOffset.value);

    updateBounds();
    render();
  }
}

function handleMouseDown(e) {
  if (e.detail === 2) return; // Skip if it's a double-click (handled separately)

  isDragging.value = true;
  hasDragged.value = false;
  lastMousePos.value = { x: e.offsetX, y: e.offsetY };
  canvasRef.value.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
  if (!isDragging.value) return;

  const deltaX = e.offsetX - lastMousePos.value.x;
  const deltaY = e.offsetY - lastMousePos.value.y;

  // Mark that we've dragged
  if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
    hasDragged.value = true;
  }

  panOffset.value.x -= (deltaX / width) * (bounds.value.xMax - bounds.value.xMin);
  panOffset.value.y += (deltaY / height) * (bounds.value.yMax - bounds.value.yMin);
  
  panOffset.value = clampPanOffset(panOffset.value);

  lastMousePos.value = { x: e.offsetX, y: e.offsetY };
  updateBounds();
  render();
}

function handleMouseUp() {
  isDragging.value = false;
  canvasRef.value.style.cursor = 'crosshair';
}

function handleDoubleClick() {
  zoomLevel.value = 1.0;
  panOffset.value = { x: 0, y: 0 };
  updateBounds();
  render();
}

// Touch handlers
function handleTouchStart(e) {
  e.preventDefault();

  if (e.touches.length === 1) {
    // Single touch - pan
    isDragging.value = true;
    lastMousePos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.touches.length === 2) {
    // Pinch to zoom
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialTouchDistance.value = Math.sqrt(dx * dx + dy * dy);
  }
}

function handleTouchMove(e) {
  e.preventDefault();

  if (e.touches.length === 1 && isDragging.value) {
    // Pan
    const rect = canvasRef.value.getBoundingClientRect();
    const deltaX = e.touches[0].clientX - lastMousePos.value.x;
    const deltaY = e.touches[0].clientY - lastMousePos.value.y;

    panOffset.value.x -= (deltaX / width) * (bounds.value.xMax - bounds.value.xMin);
    panOffset.value.y += (deltaY / height) * (bounds.value.yMax - bounds.value.yMin);
    
    panOffset.value = clampPanOffset(panOffset.value);

    lastMousePos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    updateBounds();
    render();
  } else if (e.touches.length === 2 && initialTouchDistance.value > 0) {
    // Pinch to zoom
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    const zoomFactor = currentDistance / initialTouchDistance.value;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel.value * zoomFactor));

    if (newZoom !== zoomLevel.value) {
      zoomLevel.value = newZoom;
      initialTouchDistance.value = currentDistance;
      updateBounds();
      render();
    }
  }
}

function handleTouchEnd() {
  isDragging.value = false;
  initialTouchDistance.value = 0;
}

function handleClick(e) {
  // Don't add points if we dragged during this mouse down
  if (hasDragged.value) {
    hasDragged.value = false;
    return;
  }

  const x = toDataX(e.offsetX);
  const y = toDataY(e.offsetY);
  emit('add-point', { x, y });
}

// Lifecycle
let resizeObserver = null;

onMounted(() => {
  setupCanvas();
  
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });
    resizeObserver.observe(canvasRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// Watch for changes
watch(() => props.points, render, { deep: true });
watch(() => props.samples, render, { deep: true });
watch(() => props.params, render, { deep: true });

// Computed for point count display
const pointCount = computed(() => props.points.length);
</script>

<template>
  <div class="canvas-wrapper">
    <div class="canvas-header">
      <div class="canvas-title">Posterior Visualization</div>
      <div class="status">
        <div class="status-dot"></div>
        <span>Rendering</span>
      </div>
    </div>
    <canvas
      ref="canvasRef"
      @click="handleClick"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @dblclick="handleDoubleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    ></canvas>
    <div class="canvas-footer">
      <div class="point-count">Observations: <span>{{ pointCount }}</span></div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-line" style="background: #00d4ff;"></div>
          <span>Mean</span>
        </div>
        <div class="legend-item">
          <div class="legend-line" style="background: rgba(124, 58, 237, 0.4);"></div>
          <span>±2σ</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #f472b6;"></div>
          <span>Data</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  height: fit-content;
  background: #12121a;
  border-radius: 16px;
  border: 1px solid #1e1e2e;
  overflow: hidden;
}

.canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #1e1e2e;
  background: #0d0d12;
}

.canvas-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #888;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

canvas {
  width: 100%;
  height: 500px;
  display: block;
  cursor: crosshair;
}

.canvas-footer {
  padding: 12px 20px;
  border-top: 1px solid #1e1e2e;
  background: #0d0d12;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.point-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #666;
}

.point-count span {
  color: #00d4ff;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}
</style>
