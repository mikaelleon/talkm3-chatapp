<template>
  <transition name="slide">
    <div v-if="isVisible" :class="['settings-panel', { dark: isDark }]">
      <h2>Settings</h2>
      <div class="profile">
        <img :src="profilePic" alt="Profile" class="profile-pic" />
        <p class="username">{{ username }}</p>
      </div>
      <div class="toggle-dark-mode">
        <label>
          <input type="checkbox" v-model="isDarkMode" @change="toggleDarkMode" />
          <span class="toggle-label">Dark Mode</span>
        </label>
      </div>
      <button @click="$emit('logout')">Logout</button>
      <!-- Add Delete Account Button -->
      <button class="delete-account-btn" @click="$emit('delete-account')">Delete Account</button>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    profilePic: String,
    username: String,
    isDark: Boolean,
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    isDarkMode: {
      get() {
        return this.isDark;
      },
      set(value) {
        this.$emit('toggle-dark-mode', value);
      },
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap');

* {
  padding: 0;
  margin: 0;
  color: var(--text-color);
  box-sizing: border-box;
  word-wrap: break-word;
  font-family: 'Quicksand', sans-serif;
}

/* FontAwesome icons */
.fa,
.fas,
.far,
.fab {
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
}

.fab {
  font-family: 'Font Awesome 6 Brands';
  font-weight: 400;
}

/* Main settings panel container */
.settings-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background-color: #F5F5F5;
  padding: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s, box-shadow 0.3s;
  z-index: 10;
}

.settings-panel.dark {
  background-color: #0A0A0A;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
}

h2 {
  font-size: 24px;
  margin-bottom: 20px;
  color: var(--text-color);
}

.profile {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
}

.profile-pic {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.toggle-dark-mode {
  margin-bottom: 25px;
}

.toggle-dark-mode label {
  display: flex;
  align-items: center;
}

.toggle-dark-mode input {
  margin-right: 10px;
}

.toggle-label {
  font-size: 16px;
  color: var(--text-color);
}

button {
  padding: 12px 18px;
  background-color: #005945; /*  */
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-weight: bold;
}

button:hover {
  background-color: #6cc26c; /*  */
  transform: scale(1.02);
}

button:active {
  background-color: #6cc26c; /*  */
  transform: scale(0.98);
}

.delete-account-btn {
  background-color: #005945; /*  */
  border: solid 1px #005945; /*  */
  color: #ffffff;
  margin-top: 15px;
}

.dark-mode .delete-account-btn {
  background-color: #005945; /*  */
  border: solid 1px #005945; /*  */
  color: #ffffff;
  margin-top: 15px;
}

.delete-account-btn:hover {
  background-color: #6cc26c; /*  */
  color: #F5F5F5;
}

.dark-mode .delete-account-btn:hover {
  background-color: #6cc26c; /*  */
}

.delete-account-btn:active {
  background-color: #6cc26c; /*  */
}

/* Sliding effect styles */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter,
.slide-leave-to {
  transform: translateX(100%);
}

/* Responsive design for smaller screens */

/* Mobile phones (up to 600px wide) */
@media only screen and (max-width: 600px) {
  .settings-panel {
    width: 100%;
    padding: 15px;
  }

  h2 {
    font-size: 20px;
  }

  .profile-pic {
    width: 40px;
    height: 40px;
  }

  .username {
    font-size: 16px;
  }

  .toggle-label {
    font-size: 14px;
  }

  button {
    padding: 10px 15px;
    font-size: 14px;
  }

  .delete-account-btn {
    padding: 10px 15px;
    font-size: 14px;
  }
}

/* Tablets (601px to 1024px wide) */
@media only screen and (min-width: 601px) and (max-width: 1024px) {
  .settings-panel {
    width: 350px;
    padding: 20px;
  }

  h2 {
    font-size: 22px;
  }

  .profile-pic {
    width: 45px;
    height: 45px;
  }

  .username {
    font-size: 17px;
  }

  .toggle-label {
    font-size: 15px;
  }

  button {
    padding: 11px 17px;
    font-size: 15px;
  }

  .delete-account-btn {
    padding: 11px 17px;
    font-size: 15px;
  }
}

</style>
