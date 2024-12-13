<template>
  <q-page class="login-root" :class="{ 'dark-mode': isDarkMode }">
    <div class="box-root flex flex-direction--column" style="min-height: 100vh; flex-grow: 1;">
      <div class="box-root padding-top--24 flex flex-direction--column" style="flex-grow: 1; z-index: 9;">
        <div class="formbg-outer">
          <div class="formbg">
            <div class="formbg-inner padding-horizontal--48">
              <!-- Profile Setup Header -->
              <div class="flex-between padding-bottom--15">
                <span>Edit Profile</span>

                <!-- Dark Mode Toggle Button -->
                <q-btn class="dark-mode-toggle q-ml-sm" icon="brightness_6" flat @click="toggleDarkMode" style="border-radius: 20px;" />
              </div>

              <!-- Profile Setup Form -->
              <q-form @submit.prevent="saveProfile" class="q-gutter-md">

                <!-- Profile Picture Upload -->
                <div class="text-center q-mb-md">
                  <q-avatar size="100px" class="q-mb-sm">
                    <img v-if="profilePictureURL" :src="profilePictureURL" alt="Profile Picture" />
                    <i v-else class="fas fa-user" style="font-size: 50px;"></i>
                  </q-avatar>
                  <q-btn label="Upload Profile Picture" @click="triggerFileInput" color="primary" flat :disable="isSubmitting" />
                  <input type="file" ref="fileInput" @change="onFileChange" accept="image/*" class="hidden" />
                </div>

                <!-- New Username Field -->
                <div class="field padding-bottom--24">
                  <label for="newUsername">New Username</label>
                  <q-input v-model="newUsername" filled placeholder="Enter your new username" clearable />
                </div>

                <!-- Form Actions -->
                <div class="field padding-bottom--24">
                  <q-btn flat label="Cancel" class="full-width rounded-corner" @click="$emit('close')" />
                  <q-btn type="submit" label="Save" color="primary" class="full-width rounded-corner" :loading="isSubmitting" />
                </div>

                <q-banner v-if="errorMessage" dense class="q-mt-md text-negative">
                  {{ errorMessage }}
                </q-banner>
              </q-form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script>
import { auth, db, storage } from 'src/boot/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default {
  data() {
    return {
      newUsername: '',
      profilePictureFile: null,
      profilePictureURL: '',
      errorMessage: '',
      isSubmitting: false,
      isDark: this.$q.dark.isActive,
    };
  },
  methods: {
    async saveProfile() {
      const currentUser = auth.currentUser;
      if (currentUser) {
        this.isSubmitting = true;
        try {
          // Update Profile Picture if changed
          let photoURL = this.profilePictureURL;
          if (this.profilePictureFile) {
            photoURL = await this.uploadProfilePicture();
          }

          // Update Firestore user document with new username and profile picture
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            username: this.newUsername || currentUser.displayName,
            photoURL: photoURL
          });

          this.$emit('close');
          this.$q.notify({ type: 'positive', message: 'Profile updated successfully.' });
        } catch (error) {
          this.errorMessage = 'Error updating profile.';
        } finally {
          this.isSubmitting = false;
        }
      }
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    onFileChange(event) {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        this.profilePictureFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.profilePictureURL = e.target.result; // Preview the image
        };
        reader.readAsDataURL(file);
      } else {
        this.$q.notify({ type: 'negative', message: 'Invalid file type. Please upload an image.' });
      }
    },

    async uploadProfilePicture() {
      return new Promise((resolve, reject) => {
        const storageReference = storageRef(storage, `profilePictures/${auth.currentUser.uid}/${this.profilePictureFile.name}`);
        const uploadTask = uploadBytesResumable(storageReference, this.profilePictureFile);

        uploadTask.on(
          'state_changed',
          null,
          (error) => {
            this.$q.notify({ type: 'negative', message: `Upload failed: ${error.message}` });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    },

    toggleDarkMode() {
      this.$q.dark.toggle();
      this.isDark = this.$q.dark.isActive;
    }
  }
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

.login-root {
  display: flex;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background-color: var(--background-color);
}

.formbg {
  margin: 0 auto;
  width: 100%;
  max-width: 448px;
  border-radius: 10px;
  background-color: var(--bg-color-light);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px); /* Glass effect */
  -webkit-backdrop-filter: blur(10px); /* Safari support for blur */
  border: 1px solid rgba(255, 255, 255, 0.081); /* Semi-transparent border */
}

.formbg-inner {
  padding: 48px;
}

.padding-bottom--15 {
  padding-bottom: 15px;
  color: #FF9000;
  font-weight: bold;
  text-transform: uppercase;
}

.q-btn {
  margin-top: 10px;
}

.full-width {
  width: 100%;
}

.rounded-corner {
  border-radius: 20px;
}

.field {
  display: flex;
  flex-direction: column;
}

label {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.q-input {
  padding: 12px;
  border-radius: 30px;
}

.dark-mode .formbg {
  background-color: #1a1f36;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dark-mode .padding-bottom--15 {
  color: #FF9000;
}

</style>
