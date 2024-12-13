<template>
  <q-page class="login-root" :class="{ 'dark-mode': isDarkMode }">
    <div class="box-root flex flex-direction--column" style="min-height: 100vh; flex-grow: 1;">
      <div class="box-root padding-top--24 flex flex-direction--column" style="flex-grow: 1; z-index: 9;">

        <div class="formbg-outer">
          <div class="formbg">
            <div class="formbg-inner padding-horizontal--48">
              <!-- Flex container for title and dark mode toggle button -->
              <div class="flex-between padding-bottom--15">
                <span>{{ isLogin ? 'Sign in to your account' : 'Create your account' }}</span>
                <!-- Dark Mode Toggle Button -->
                <q-btn class="dark-mode-toggle q-ml-sm" icon="brightness_6" flat @click="toggleDarkMode" style="border-radius: 20px;" />
              </div>

              <q-form @submit.prevent="isLogin ? login() : signUp()" class="q-gutter-md">
                <div class="field padding-bottom--24">
                  <label for="email">Email</label>
                  <q-input v-model="email" filled type="email" :rules="emailRules" placeholder="Enter your email" clearable />
                </div>
                <div class="field padding-bottom--24">
                  <div class="grid--50-50">
                    <label for="password">Password</label>
                    <!-- Conditionally render "Forgot your password?" only on the login page -->
                    <div class="reset-pass" v-if="isLogin">
                      <a href="#">Forgot your password?</a>
                    </div>
                  </div>
                  <q-input v-model="password" filled type="password" :rules="passwordRules" placeholder="Enter your password" clearable />
                </div>

                <div v-if="!isLogin" class="field padding-bottom--24">
                  <label for="dob">Date of Birth</label>
                  <q-input v-model="dob" filled type="date" :rules="dobRules" placeholder="Enter your date of birth" clearable />
                </div>

                <div class="field padding-bottom--24">
                  <q-btn type="submit" label="Continue" color="primary" class="full-width rounded-corner" />
                </div>
                <q-banner v-if="errorMessage" dense class="q-mt-md text-negative">
                  {{ errorMessage }}
                </q-banner>
              </q-form>
            </div>
          </div>
          <div class="footer-link padding-top--24">
            <span>{{ isLogin ? "Don't have an account?" : "Already have an account?" }} <a class="ssolink" href="#" @click="toggleForm">{{ isLogin ? 'Sign up' : 'Login' }}</a></span>
          </div>
        </div>

      </div>
    </div>
  </q-page>
</template>

<script>
import { auth } from 'src/boot/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default {
  data() {
    return {
      email: '',
      password: '',
      dob: '',
      errorMessage: '',
      isLogin: true,
      isDark: this.$q.dark.isActive,
    };
  },
  computed: {
    emailRules() {
      return [val => !!val || 'Email is required'];
    },
    passwordRules() {
      return [val => val.length >= 8 || 'Password must be at least 8 characters'];
    },
    dobRules() {
      return [val => this.isOldEnough(val) || 'You must be at least 13 years old'];
    },
  },
methods: {
    // Function to handle user login
    async login() {
      try {
        // Sign in the user using their email and password
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password);
        const user = userCredential.user;

        // Import Firestore methods to fetch user's profile data
        const { db } = await import('src/boot/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        // If the user profile document exists and has a username, redirect to the main app
        if (userDoc.exists() && userDoc.data().username) {
          this.$q.notify({ type: 'positive', message: 'Login successful!' });
          this.$router.push({ name: 'MainApp', path: '/main-app' });
        } else {
          // If no username, redirect the user to the profile setup page
          this.$router.push({ name: 'ProfileSetup', path: '/profile-setup' });
        }
      } catch (error) {
        // Set the error message if login fails
        this.errorMessage = error.message;
      }
    },

    // Function to handle user sign-up
    async signUp() {
      try {
        // Create a new user with the provided email and password
        const userCredential = await createUserWithEmailAndPassword(auth, this.email, this.password);
        this.$q.notify({ type: 'positive', message: 'Sign-up successful!' });

        // Store additional user data (e.g., email, date of birth) in Firestore
        await this.storeUserData(userCredential.user);

        // Redirect to the profile setup page after successful sign-up
        this.$router.push({ name: 'ProfileSetup', path: '/profile-setup' });
      } catch (error) {
        // Set the error message if sign-up fails
        this.errorMessage = error.message;
      }
    },

    // Function to store user data in Firestore after sign-up
    async storeUserData(user) {
      // Import Firestore methods to set user data
      const { db } = await import('src/boot/firebase');
      const { setDoc, doc } = await import('firebase/firestore');

      try {
        // Store the user's email, date of birth, and account creation time in the database
        await setDoc(doc(db, 'users', user.uid), {
          email: this.email,
          dob: this.dob,
          createdAt: new Date(),
        });
      } catch (error) {
        // Set the error message if there is an issue storing the data
        this.errorMessage = 'Error storing user data.';
      }
    },

    isOldEnough(dob) {
      if (!dob) return false;
      const birthDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      return age - (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? 1 : 0) >= 13;
    },

    toggleForm() {
      this.isLogin = !this.isLogin;
      this.errorMessage = '';
      this.email = '';
      this.password = '';
      this.dob = '';
    },

    toggleDarkMode() {
      this.$q.dark.toggle();
      this.isDark = this.$q.dark.isActive;
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

/* Ensure FontAwesome icons use the correct font-family */
.fa,
.fas,
.far,
.fab {
  font-family: 'Font Awesome 6 Free'; /* For solid and regular icons */
  font-weight: 900; /* Ensure correct weight for FontAwesome solid icons */
}

.fab {
  font-family: 'Font Awesome 6 Brands'; /* For brand icons */
  font-weight: 400; /* Ensure correct weight for FontAwesome brand icons */
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--background-color);
}

.login-root {
  display: flex;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background-color: var(--background-color);
}

h1 {
  letter-spacing: -1px;
}

a {
  color: #FF9000;
  text-decoration: unset;
}

.login-root {
  display: flex;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
}

.loginbackground {
  min-height: 692px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  z-index: 0;
  overflow: hidden;
}

.flex-flex {
  display: flex;
}

.align-center {
  align-items: center;
}

.center-center {
  align-items: center;
  justify-content: center;
}

.box-root {
  box-sizing: border-box;
}

.flex-direction--column {
  flex-direction: column;
}


.padding-top--64 {
  padding-top: 64px;
}

.padding-top--24 {
  padding-top: 24px;
}

.padding-top--48 {
  padding-top: 48px;
}

.padding-bottom--24 {
  padding-bottom: 24px;
}

.padding-horizontal--48 {
  padding: 48px;
}

.padding-bottom--15 {
  padding-bottom: 15px;
  color: #FF9000;
  font-weight: bold;
  text-transform: uppercase
}

.flex-justifyContent--center {
  justify-content: center;
}

.formbg {
  margin: 0 auto;
  width: 100%;
  max-width: 448px;
  border-radius: 10px;
  background-color: var(--bg-color-light);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px); /* Blur for the glass effect */
  -webkit-backdrop-filter: blur(10px); /* Safari support for blur */
  border: 1px solid rgba(255, 255, 255, 0.081); /* Semi-transparent background */
}


span {
  display: block;
  font-size: 20px;
  line-height: 28px;
}

label {
  margin-bottom: 10px;
}

.reset-pass a,
label {
  font-size: 14px;
  font-weight: 600;
  display: block;
}

.reset-pass>a {
  text-align: right;
  margin-bottom: 10px;
}

.grid--50-50 {
  display: grid;
  grid-template-columns: 50% 50%;
  align-items: center;
}

.field input {
  font-size: 16px;
  line-height: 28px;
  padding: 8px 16px;
  width: 100%;
  min-height: 44px;
  border: unset;
  border-radius: 4px;
  outline-color: rgb(84 105 212 / 0.5);
  background-color: rgb(255, 255, 255);
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(60, 66, 87, 0.16) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px;
}

input[type="submit"] {
  background-color: rgb(84, 105, 212);
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0.12) 0px 1px 1px 0px,
    rgb(84, 105, 212) 0px 0px 0px 1px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(0, 0, 0, 0) 0px 0px 0px 0px,
    rgba(60, 66, 87, 0.08) 0px 2px 5px 0px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.field-checkbox input {
  width: 20px;
  height: 15px;
  margin-right: 5px;
  box-shadow: unset;
  min-height: unset;
}

.field-checkbox label {
  display: flex;
  align-items: center;
  margin: 0;
}

a.ssolink {
  display: block;
  text-align: center;
  font-weight: 600;
}

.footer-link span {
  font-size: 14px;
  text-align: center;
}

.listing a {
  color: #697386;
  font-weight: 600;
  margin: 0 10px;
}

.animationRightLeft {
  animation: animationRightLeft 2s ease-in-out infinite;
}

.animationLeftRight {
  animation: animationLeftRight 2s ease-in-out infinite;
}

.tans3s {
  animation: animationLeftRight 3s ease-in-out infinite;
}

.tans4s {
  animation: animationLeftRight 4s ease-in-out infinite;
}

.full-width {
  width: 100%;
}

.rounded-corner {
  border-radius: 20px;
}

.q-card {
  border-radius: 20px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}


/* Default styles are kept intact */

/* Mobile phones (up to 600px wide) */
@media only screen and (max-width: 600px) {
  .login-root {
    padding: 10px;
  }

  .formbg {
    padding: 20px;
    max-width: 100%; /* Ensure form takes up full width on small screens */
  }

  .padding-horizontal--48 {
    padding: 20px; /* Reduce padding on smaller screens */
  }

  .field input {
    font-size: 14px; /* Adjust input field font size for readability */
    padding: 6px 12px; /* Smaller padding for input fields */
  }

  .footer-link span {
    font-size: 12px; /* Adjust footer text size */
  }

  .q-btn.full-width {
    font-size: 14px; /* Reduce button text size for smaller screens */
  }

  .padding-top--24, .padding-bottom--24 {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .dark-mode-toggle {
    font-size: 12px;
  }

  .flex-between {
    align-items: flex-start;
  }

  .reset-pass a {
    font-size: 12px; /* Adjust link font size */
  }
}

/* Tablets (601px to 1024px) */
@media only screen and (min-width: 601px) and (max-width: 1024px) {
  .login-root {
    padding: 20px;
  }

  .formbg {
    max-width: 75%;
  }

  .padding-horizontal--48 {
    padding: 30px;
  }

  .footer-link span {
    font-size: 13px;
  }

  .field input {
    font-size: 15px;
    padding: 10px 15px;
  }

  .q-btn.full-width {
    font-size: 16px;
  }
}

/* Desktops and larger screens (1025px and up) */
@media only screen and (min-width: 1025px) {


  .field input {
    font-size: 16px;
    padding: 12px 16px;
  }

  .q-btn.full-width {
    font-size: 18px;
  }

  .padding-horizontal--48 {
    padding: 48px;
  }
}

</style>
