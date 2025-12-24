<script setup>
const emit = defineEmits(['add-random', 'sample-gp', 'clear-all']);
</script>

<template>
  <div class="actions-container">
    <button class="btn-primary" @click="emit('add-random')">
      <span>✦</span> Add Random Points
    </button>
    <button class="btn-secondary" @click="emit('sample-gp')">
      <span>〰</span> Sample GP
    </button>
    <button class="btn-danger" @click="emit('clear-all')">
      <span>✕</span> Clear All
    </button>
  </div>
</template>

<style scoped>
.actions-container {
  display: flex;
  gap: 12px;
}

button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 212, 255, 0.3);
}

.btn-secondary {
  background: #1e1e2e;
  color: #888;
  border: 1px solid #2a2a3a;
}

.btn-secondary:hover {
  background: #2a2a3a;
  color: #fff;
}

.btn-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}
</style>
