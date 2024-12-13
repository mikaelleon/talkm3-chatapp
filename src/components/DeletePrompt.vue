<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">Delete Account</div>
      <div>Are you sure you want to delete your account? This action cannot be undone.</div>
    </q-card-section>

    <q-card-actions>
      <q-btn flat label="Cancel" @click="$emit('close')" />
      <q-btn flat label="Confirm" color="negative" @click="deleteAccount" />
    </q-card-actions>
  </q-card>
</template>

<script>
import { auth } from 'src/boot/firebase';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from 'src/boot/firebase';

export default {
  methods: {
    async deleteAccount() {
      try {
        const user = auth.currentUser;
        if (user) {
          // Delete user data from Firestore
          await deleteDoc(doc(db, 'users', user.uid));

          // Delete user's authentication account
          await deleteUser(user);

          this.$q.notify({
            type: 'positive',
            message: 'Your account has been deleted successfully.',
          });

          // Emit event to close dialog after deletion
          this.$emit('close');

          // Redirect to home page or login after deletion
          this.$router.push({ name: 'LoginPage' });
        } else {
          this.$q.notify({
            type: 'negative',
            message: 'No user is logged in.',
          });
        }
      } catch (error) {
        this.$q.notify({
          type: 'negative',
          message: 'Failed to delete account: ' + error.message,
        });
      }
    },
  },
};
</script>
