<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useViewport } from '@/composables/useViewport';
import {
  drawGrid,
  drawMeanLine,
  drawConfidenceBand,
  drawSamples,
  drawPoints
} from '@/utils/canvasDrawing';

const props = defineProps({
  points: Array,      // [{ x, y }, ...] observation points
  testX: Array,       // number[] x-coordinates for plotting
  mean: Array,        // number[] posterior mean
  variance: Array,    // number[] posterior variance
  samples: Array,     // [{ x: [], y: [] }, ...] samples with x and y values
});

const emit = defineEmits(['add-point', 'bounds-change']);

// Canvas ref and context
const canvasRef = ref(null);
let ctx = null;
let width = 0;
let height = 0;

// Initialize Viewport logic
const viewport = useViewport();
const {
  bounds, zoomLevel, isDragging, hasDragged,
  toCanvasX, toCanvasY, toDataX, toDataY,
  handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
  handleDoubleClick, handleTouchStart, handleTouchMove, handleTouchEnd
} = viewport;

// Emit bounds changes to parent
watch(bounds, (newBounds) => {
  emit('bounds-change', { ...newBounds });
}, { deep: true, immediate: true });

// Render Loop
function render() {
  if (!ctx) return;

  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, width, height, bounds.value, toCanvasX, toCanvasY);
  drawSamples(ctx, props.samples || [], toCanvasX, toCanvasY, width, height);
  drawConfidenceBand(ctx, props.testX, props.mean, props.variance, toCanvasX, toCanvasY, height, width);
  drawMeanLine(ctx, props.testX, props.mean, toCanvasX, toCanvasY, width, height);
  drawPoints(ctx, props.points, toCanvasX, toCanvasY, width, height);
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

// Event Wrappers to pass dimensions
function onWheel(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  if (handleWheel(e, rect)) render();
}

function onMouseDown(e) {
  if (handleMouseDown(e)) render();
}

function onMouseMove(e) {
  if (handleMouseMove(e, width, height)) render();
}

function onMouseUp() {
  if (handleMouseUp()) render();
}

function onDoubleClick() {
  if (handleDoubleClick()) render();
}

function onTouchStart(e) {
  handleTouchStart(e);
}

function onTouchMove(e) {
  if (handleTouchMove(e, width, height)) render();
}

function onRequestAddPoint(e) {
    // Don't add points if we dragged
    if (hasDragged.value) {
      hasDragged.value = false;
      return;
    }
    const x = toDataX(e.offsetX, width);
    const y = toDataY(e.offsetY, height);
    emit('add-point', { x, y });
}

// Lifecycle
let resizeObserver = null;

onMounted(() => {
  setupCanvas();
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => setupCanvas());
    resizeObserver.observe(canvasRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
});

// Watch for changes
watch([() => props.points, () => props.mean, () => props.variance, () => props.samples], () => {
  render();
}, { deep: true });

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
      @click="onRequestAddPoint"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @dblclick="onDoubleClick"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
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
