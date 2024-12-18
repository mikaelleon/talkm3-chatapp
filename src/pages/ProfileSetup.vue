<template>
  <q-page class="login-root" :class="{ 'dark-mode': isDarkMode }">
    <div class="box-root flex flex-direction--column" style="min-height: 100vh; flex-grow: 1;">
      <div class="box-root padding-top--24 flex flex-direction--column" style="flex-grow: 1; z-index: 9;">

        <div class="formbg-outer">
          <div class="formbg">
            <div class="formbg-inner padding-horizontal--48">
              <!-- Title and Back Button -->
              <div class="flex-between padding-bottom--15 align-center">
                <span><i class="fas fa-chevron-left" @click="goBack" style="cursor: pointer; margin-right: 10px; "
                  ></i>Complete Your Profile</span>
              </div>

              <!-- Profile Setup Form -->
              <q-form @submit.prevent="submitProfile" class="q-gutter-md">

                <!-- Profile Picture Upload -->
                <div class="text-center q-mb-md">
                  <q-avatar size="100px" class="q-mb-sm">
                    <img v-if="profilePictureURL" :src="profilePictureURL" alt="Profile Picture" />
                    <i v-else class="fas fa-user" style="font-size: 50px;"></i>
                  </q-avatar>
                  <q-btn label="Upload Profile Picture" @click="triggerFileInput" color="primary" flat :disable="isSubmitting" />
                  <input type="file" ref="fileInput" @change="onFileChange" accept="image/*" class="hidden" />
                </div>

                <!-- First Name -->
                <div class="field padding-bottom--24">
                  <label for="firstName">First Name</label>
                  <q-input v-model="firstName" filled type="text" :rules="nameRules"
                    placeholder="Enter your first name" clearable :disable="isSubmitting" />
                </div>

                <!-- Last Name -->
                <div class="field padding-bottom--24">
                  <label for="lastName">Last Name</label>
                  <q-input v-model="lastName" filled type="text" :rules="nameRules"
                    placeholder="Enter your last name" clearable :disable="isSubmitting" />
                </div>

                <!-- Username -->
                <div class="field padding-bottom--24">
                  <label for="username">Username</label>
                  <q-input v-model="username" filled type="text" :rules="usernameRules"
                    placeholder="Enter your username" clearable @blur="checkUsernameAvailability"
                    :loading="isCheckingUsername" :error="usernameError" :error-message="usernameErrorMessage"
                    :disable="isSubmitting" />
                </div>

                <!-- Progress Bar for File Upload -->
                <q-linear-progress v-if="uploadProgress > 0 && uploadProgress < 100" :value="uploadProgress" color="primary" />

                <!-- Submit Button -->
                <div class="field padding-bottom--24">
                  <q-btn type="submit" label="Save Profile" color="primary" class="full-width rounded-corner"
                    :loading="isSubmitting" :disable="isSubmitting || usernameError" />
                </div>

              </q-form>
            </div>
          </div>
        </div>

        <div class="footer-link padding-top--24"></div>

      </div>
    </div>
  </q-page>
</template>


<script>
import { ref, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { db, storage, auth } from 'src/boot/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default {
  name: 'ProfileSetup',
  setup() {
    const $q = useQuasar();
    const router = useRouter();

    const firstName = ref('');
    const lastName = ref('');
    const username = ref('');
    const profilePictureFile = ref(null);
    const profilePictureURL = ref('');
    const isCheckingUsername = ref(false);
    const usernameError = ref(false);
    const usernameErrorMessage = ref('');
    const isSubmitting = ref(false);
    const uploadProgress = ref(0);
    const fileInput = ref(null);

    const nameRules = computed(() => [val => !!val || 'This field is required']);
    const usernameRules = computed(() => [
      val => !!val || 'Username is required',
      val => /^[a-zA-Z0-9_]{3,20}$/.test(val) || 'Username must be 3-20 characters and include only letters, numbers, and underscores.',
    ]);

    const triggerFileInput = () => {
      fileInput.value && fileInput.value.click();
    };

    const onFileChange = (event) => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/') && file.size <= 20 * 1024 * 1024) {
        profilePictureFile.value = file;

        const reader = new FileReader();
        reader.onload = (e) => {
          profilePictureURL.value = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        $q.notify({ type: 'negative', message: 'Invalid file. Please select a valid image under 20MB.' });
        profilePictureFile.value = null;
      }
    };

    const checkUsernameAvailability = async () => {
      const enteredUsername = username.value.trim();
      if (!enteredUsername) {
        usernameError.value = true;
        usernameErrorMessage.value = 'Username is required.';
        return;
      }

      if (!/^[a-zA-Z0-9_]{3,20}$/.test(enteredUsername)) {
        usernameError.value = true;
        usernameErrorMessage.value = 'Username must be 3-20 characters and include only letters, numbers, and underscores.';
        return;
      }

      isCheckingUsername.value = true;
      usernameError.value = false;
      usernameErrorMessage.value = '';

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', enteredUsername));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          usernameError.value = true;
          usernameErrorMessage.value = 'Username is already taken.';
        }
      } catch (error) {
        usernameError.value = true;
        usernameErrorMessage.value = `Error checking username: ${error.message}`;
      } finally {
        isCheckingUsername.value = false;
      }
    };

    const submitProfile = async () => {
      if (!firstName.value || !lastName.value || usernameError.value) {
        $q.notify({ type: 'negative', message: 'Please fill in all required fields correctly.' });
        return;
      }

      isSubmitting.value = true;

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('User is not authenticated.');

        await checkUsernameAvailability();
        if (usernameError.value) throw new Error('Username is not available.');

        let photoURL = profilePictureFile.value ? await uploadProfilePicture() : DEFAULT_AVATAR;

        const userData = {
          createdAt: new Date(),
          email: currentUser.email,
          firstName: firstName.value.trim(),
          lastName: lastName.value.trim(),
          photoURL,
          username: username.value.trim(),
        };

        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, userData, { merge: true });

        $q.notify({ type: 'positive', message: 'Profile saved successfully!' });
        router.push({ name: 'MainApp', path: '/main-app' });
      } catch (error) {
        $q.notify({ type: 'negative', message: `Error saving profile: ${error.message}` });
      } finally {
        isSubmitting.value = false;
        uploadProgress.value = 0;
      }
    };

    const uploadProfilePicture = async () => {
      return new Promise((resolve, reject) => {
        const storageReference = storageRef(storage, `profilePictures/${auth.currentUser.uid}/${profilePictureFile.value.name}`);
        const uploadTask = uploadBytesResumable(storageReference, profilePictureFile.value);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            uploadProgress.value = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          },
          (error) => {
            $q.notify({ type: 'negative', message: `File upload failed: ${error.message}` });
            reject(error);
          },
          async () => {
            const photoURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(photoURL);
          }
        );
      });
    };

    const goBack = () => {
      router.push({ name: 'LoginPage' });
    };

    return {
      firstName,
      lastName,
      username,
      profilePictureURL,
      triggerFileInput,
      onFileChange,
      submitProfile,
      fileInput,
      isCheckingUsername,
      usernameError,
      usernameErrorMessage,
      isSubmitting,
      uploadProgress,
      nameRules, // Fix: Ensure this is returned for template usage
      usernameRules, // Fix: Ensure this is returned for template usage
      goBack, // Back button function
    };
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
  color: #6cc26c; /* */
}

.fab {
  font-family: 'Font Awesome 6 Brands'; /* For brand icons */
  font-weight: 400; /* Ensure correct weight for FontAwesome brand icons */
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
  color: #6cc26c;
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


.formbg {
  margin: 0 auto;
  width: 100%;
  max-width: 448px;
  border-radius: 10px;
  background-color: var(--bg-color-light);
  box-shadow: 0 2px 15px #6cc26c; /* */
  backdrop-filter: blur(10px); /* Blur for the glass effect */
  -webkit-backdrop-filter: blur(10px); /* Safari support for blur */
  border: 1px solid #6cc26c; /* Semi-transparent background */ /* */
}

span {
  display: block;
  font-size: 20px;
  line-height: 28px;
}

/* Center the form container both horizontally and vertically */
.profile-setup-root {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background-color);
}

.form-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 500px;
}

.formbg-inner {
  padding: 24px;
}

.full-width {
  width: 100%;
}

.rounded-corner {
  border-radius: 20px;
}

.padding-horizontal--48 {
  padding: 48px;
}

.padding-bottom--15 {
  padding-bottom: 15px;
  color: #6cc26c; /* */
  font-weight: bold;
  text-transform: uppercase;
}

.padding-bottom--24 {
  padding-bottom: 24px;
}

.hidden {
  display: none;
}

.q-btn {
  font-weight: 600;
  border-radius: 20px;
}

.q-avatar img {
  border-radius: 50%;
}

.q-avatar {
  margin-right: 20px;
  margin-bottom: 20px;
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

  .formbg-inner {
    padding: 20px;
  }

  .field input {
    font-size: 14px; /* Adjust input field font size for readability */
    padding: 6px 12px; /* Smaller padding for input fields */
  }

  .q-btn.full-width {
    font-size: 14px; /* Reduce button text size for smaller screens */
  }

  .q-avatar {
    width: 80px; /* Smaller avatar size on mobile */
    height: 80px;
  margin-right: 2%;
  margin-bottom: 0px;

  }

  .padding-top--24, .padding-bottom--24 {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .flex-between {
    flex-direction: column; /* Stack elements vertically */
    align-items: flex-start;
  }

  .padding-horizontal--48 {
    padding: 20px;
  }

  .footer-link span {
    font-size: 12px; /* Adjust footer text size */
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

  .formbg-inner {
    padding: 30px;
  }

  .padding-horizontal--48 {
    padding: 30px;
  }

  .field input {
    font-size: 15px;
    padding: 10px 15px;
  }

  .q-btn.full-width {
    font-size: 16px;
  }

  .q-avatar {
    width: 90px; /* Medium avatar size */
    height: 90px;
  }

  .footer-link span {
    font-size: 13px;
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
