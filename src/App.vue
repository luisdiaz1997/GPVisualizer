<script setup>
import { reactive, computed, ref, watch } from 'vue';
import { computePosterior, sampleFromGP, linspace } from 'gpzoo';
import GPCanvas from '@/components/GPCanvas.vue';
import KernelParameters from '@/components/KernelParameters.vue';
import ActionsPanel from '@/components/ActionsPanel.vue';

// Reactive state
const points = reactive([]);
const selectedKernel = ref('rbf');

const params = reactive([
  { key: 'lengthScale', label: 'Length Scale (ℓ)', value: 1.0, min: 0.1, max: 3, step: 0.05 },
  { key: 'signalVariance', label: 'Signal Variance (σ²)', value: 1.0, min: 0.1, max: 3, step: 0.05 },
  { key: 'noiseLevel', label: 'Noise Level (σₙ)', value: 0.1, min: 0.01, max: 0.5, step: 0.01 },
]);

// Computed GP params - reactive to changes
const gpParams = computed(() => ({
  lengthScale: params.find(p => p.key === 'lengthScale').value,
  signalVariance: params.find(p => p.key === 'signalVariance').value,
  noiseLevel: params.find(p => p.key === 'noiseLevel').value,
  kernel: selectedKernel.value,
}));

// Bounds from GPCanvas (updated via events)
const bounds = ref({ xMin: -3, xMax: 3, yMin: -2, yMax: 2 });

// Samples state (moved from GPCanvas)
const samples = reactive([]);

// Number of test points for GP computation
const numTest = 300;

// Test points based on current bounds
const testX = computed(() => linspace(bounds.value.xMin, bounds.value.xMax, numTest));

// Compute GP posterior reactively
const posterior = computed(() => {
  return computePosterior(points, testX.value, gpParams.value);
});

const mean = computed(() => posterior.value.mean);
const variance = computed(() => posterior.value.variance);

// Clear samples reactively when GP inputs change
// This ensures samples clear even if params/points are modified directly (e.g., by a trainer)
watch([points, params, selectedKernel], () => {
  samples.length = 0;
}, { deep: true });

// Event handlers
function addPoint(point) {
  points.push(point);
  // Watcher clears samples automatically when points change
}

function addRandomPoints() {
  for (let i = 0; i < 5; i++) {
    const x = bounds.value.xMin + Math.random() * (bounds.value.xMax - bounds.value.xMin);
    const y = bounds.value.yMin + Math.random() * (bounds.value.yMax - bounds.value.yMin);
    points.push({ x, y });
  }
  // Watcher clears samples automatically when points change
}

function sampleGP() {
  const sampleY = sampleFromGP(points, testX.value, gpParams.value);
  samples.push({ x: testX.value, y: sampleY }); // Store x and y for plotting
  if (samples.length > 5) samples.shift();
}

function clearAll() {
  points.length = 0;
  samples.length = 0;
}

function updateParamValue(index, value) {
  params[index].value = value;
  // Watcher clears samples automatically when params change
}

function updateKernel(kernel) {
  selectedKernel.value = kernel;
  // Watcher clears samples automatically when kernel changes
}

function handleBoundsChange(newBounds) {
  bounds.value = newBounds;
  // Don't clear samples - they persist during zoom/pan
}
</script>

<template>
  <div class="container">
    <header>
      <div class="logo">𝒢</div>
      <div>
        <h1>Gaussian Process Visualizer</h1>
        <div class="subtitle">Interactive posterior inference</div>
      </div>
    </header>

    <div class="main-grid">
      <div class="canvas-area">
        <GPCanvas
          :points="points"
          :testX="testX"
          :mean="mean"
          :variance="variance"
          :samples="samples"
          @add-point="addPoint"
          @bounds-change="handleBoundsChange"
        />
        <ActionsPanel
          @add-random="addRandomPoints"
          @sample-gp="sampleGP"
          @clear-all="clearAll"
        />
        <div class="info-message">
          Click on the canvas to add observations. The GP posterior updates in real-time.
        </div>
      </div>

      <div class="sidebar">
        <KernelParameters
          :params="params"
          @update-param="updateParamValue"
          @update-kernel="updateKernel"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-message {
  font-size: 13px;
  color: #666;
  text-align: center;
  padding: 12px;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.1);
  border-radius: 12px;
}
</style>
