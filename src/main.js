import './assets/main.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';

import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);

app.directive('katex', {
  mounted(el, binding) {
    katex.render(binding.value, el, {
      throwOnError: false,
      displayMode: false,
    });
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      katex.render(binding.value, el, {
        throwOnError: false,
        displayMode: false,
      });
    }
  }
});

app.mount('#app');
