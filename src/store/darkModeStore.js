import { reactive } from 'vue';

const state = reactive({
  isDarkMode: false,
});

const toggleDarkMode = () => {
  state.isDarkMode = !state.isDarkMode;
};

export default {
  state,
  toggleDarkMode,
};
