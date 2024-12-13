<template>
  <div :class="['chat-app', darkModeClass, { 'mobile-chat': isMobileChat }]">
    <!-- Back to Contacts button for mobile view, visible in the chat panel -->
    <q-icon v-if="isMobileChat" name="fas fa-chevron-left" class="back-to-contacts-icon" @click="closeChat" />

    <!-- Friends List Section -->
    <FriendsList
      v-if="!isMobileChat"
      :contacts="contacts"
      :activeContactId="activeContactId"
      :isDarkMode="isDarkMode"
      @open-chat="openChat"
    />

    <!-- Settings Panel with Delete Account button -->
    <SettingsPanel
      v-if="isSettingsVisible"
      :profilePic="profilePic"
      :username="username"
      :isDark="isDarkMode"
      :isVisible="isSettingsVisible"
      @toggle-dark-mode="darkModeStore.toggleDarkMode"
      @logout="logout"
      @delete-account="showDeletePrompt"
    />

    <!-- Chat area -->
    <div :class="['chat-container', { dark: isDarkMode, 'settings-open': isSettingsVisible }]">
      <MessageList
        v-if="currentChatRoomId"
        :messages="messages"
        :currentUserId="currentUser.uid"
        :isDark="isDarkMode"
        ref="messages"
      />
      <ChatInput
        v-if="currentChatRoomId"
        v-model="newMessage"
        @send-message="handleSendMessage"
        :currentChatRoomId="currentChatRoomId"
        :currentUser="currentUser"
        :activeContactId="activeContactId"
        :isDark="isDarkMode"
      />
    </div>

    <!-- Settings Icon, always visible in mobile view -->
    <q-icon name="fas fa-gear" class="settings-icon" @click="toggleSettingsPanel" />

    <!-- Delete Account Prompt Dialog -->
    <q-dialog v-model="isDeletePromptVisible">
      <DeletePrompt @confirm="confirmDeleteAccount" @close="isDeletePromptVisible = false" />
    </q-dialog>
  </div>
</template>

<script>
import { auth, db, realtimeDb } from 'src/boot/firebase'; // Import Firebase services for authentication, Firestore, and Realtime Database.
import { ref, set, push, onValue } from 'firebase/database'; // Import Firebase Realtime Database methods.
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth'; // Import necessary Firebase Auth methods.
import { doc, getDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore'; // Import Firestore methods for interacting with Firestore documents and collections.
import darkModeStore from 'src/store/darkModeStore'; // Import a Vuex store module for dark mode state management.
import MessageList from 'components/MessageList.vue'; // Import the message list component for displaying chat messages.
import ChatInput from 'components/ChatInput.vue'; // Import the chat input component for sending messages.
import SettingsPanel from 'components/SettingsPanel.vue'; // Import the settings panel component.
import FriendsList from 'components/FriendsList.vue'; // Import the friends list component.
import DeletePrompt from 'components/DeletePrompt.vue'; // Import the delete account confirmation prompt.

export default {
  components: {
    MessageList,
    ChatInput,
    SettingsPanel,
    FriendsList,
    DeletePrompt,
  },
  setup() {
    return {
      darkModeStore, // Set up dark mode store so it can be accessed within the template.
    };
  },
  data() {
    return {
      messages: [], // Store for chat messages.
      newMessage: '', // Store for a new message being typed.
      profilePic: '', // Store the current user's profile picture URL.
      username: '', // Store the current user's username.
      contacts: [], // Store the user's contacts list.
      currentChatRoomId: null, // Store the current chat room ID.
      activeContactId: null, // Store the ID of the currently active contact.
      currentUser: null, // Store the currently authenticated user.
      isSettingsVisible: false, // Track whether the settings panel is visible.
      isDeletePromptVisible: false, // Track visibility of the delete account confirmation prompt.
      defaultAvatar: 'https://ui-avatars.com/api/?name=User', // Default avatar URL if the user doesn't have a profile picture.
      isMobileChat: false, // New data property to track mobile chat state
    };
  },
  computed: {
    isDarkMode() {
      return this.darkModeStore.state.isDarkMode; // Compute whether dark mode is enabled.
    },
    darkModeClass() {
      return this.isDarkMode ? 'dark-mode' : 'light-mode'; // Apply appropriate CSS class based on dark mode state.
    },
  },
  created() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user; // Set the authenticated user.
        await this.fetchUserProfiles(); // Fetch the user's profile information.
        await this.loadContacts(); // Load the user's contacts list.
      } else {
        this.$router.push({ name: 'LoginPage' }); // Redirect to login page if no user is logged in.
      }
    });
  },
  methods: {
    async fetchUserProfiles() {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const currentUserRef = doc(db, 'users', currentUser.uid); // Get reference to the current user's Firestore document.
      const currentUserData = (await getDoc(currentUserRef)).data(); // Fetch the current user's profile data from Firestore.

      this.profilePic = currentUserData?.photoURL || this.defaultAvatar; // Set the profile picture, or default avatar if none exists.
      this.username = currentUserData?.username || currentUser.email.split('@')[0]; // Set the username, or use email prefix if no username exists.
    },

    toggleSettingsPanel() {
      this.isSettingsVisible = !this.isSettingsVisible; // Toggle the visibility of the settings panel.
    },

    async openChat(contact) {
      this.activeContactId = contact.id; // Set the active contact ID.
      const sortedIds = [this.currentUser.uid, contact.id].sort(); // Sort the user and contact IDs to form a consistent chat room ID.
      this.currentChatRoomId = `${sortedIds[0]}_${sortedIds[1]}`; // Set the current chat room ID.
      this.listenForMessages(); // Start listening for messages in this chat room.

      // Open chat in mobile view
      if (window.innerWidth <= 600) {
        this.isMobileChat = true;
      }
    },

    closeChat() {
      this.isMobileChat = false; // Close the chat in mobile view, return to FriendsList
    },

    listenForMessages() {
      if (!this.currentChatRoomId) return;

      const roomRef = ref(realtimeDb, `chatRooms/${this.currentChatRoomId}/messages`); // Get a reference to the current chat room's messages in Realtime Database.
      onValue(roomRef, (snapshot) => {
        const loadedMessages = snapshot.val() ? Object.values(snapshot.val()) : []; // Load messages from the database snapshot.
        this.messages = loadedMessages; // Update the messages array.

        this.$nextTick(() => {
          const messagesContainer = this.$refs.messages; // Access the messages container DOM element.
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom of the messages container to show the latest messages.
          }
        });
      });
    },

    handleSendMessage(messageData) {
      if (this.currentChatRoomId && messageData.text.trim()) {
        const roomRef = ref(realtimeDb, `chatRooms/${this.currentChatRoomId}/messages`); // Get a reference to the current chat room's messages in Realtime Database.
        const newMessageRef = push(roomRef); // Create a new message reference in the database.
        set(newMessageRef, { ...messageData, status: 'sent' }); // Save the new message to the database with a 'sent' status.
      }
    },

    async logout() {
      try {
        await auth.signOut(); // Sign the user out of Firebase Authentication.
        this.$router.push({ name: 'LoginPage' }); // Redirect to the login page after logging out.
      } catch (error) {
        console.error('Logout error:', error); // Log any errors that occur during logout.
      }
    },

    async loadContacts() {
      const userId = this.currentUser.uid; // Get the current user's ID.
      const contactsRef = collection(db, 'users', userId, 'contacts'); // Get a reference to the current user's contacts collection in Firestore.

      onSnapshot(contactsRef, (snapshot) => {
        this.contacts = snapshot.docs.map((doc) => ({
          id: doc.id, // Set the contact ID.
          username: doc.data().username || doc.data().displayName || doc.data().email.split('@')[0], // Set the contact's username or display name.
          ...doc.data(), // Spread the remaining contact data.
        }));
      });
    },

    showDeletePrompt() {
      this.isDeletePromptVisible = true; // Show the delete account confirmation prompt.
    },

    async confirmDeleteAccount() {
      const user = auth.currentUser;

      if (user) {
        try {
          // Prompt the user to re-enter their password for re-authentication
          const credential = EmailAuthProvider.credential(user.email, prompt('Please enter your password to proceed with account deletion:')); // Get the user's password

          // Re-authenticate the user
          await reauthenticateWithCredential(user, credential);

          // Proceed with account deletion after successful re-authentication
          await deleteDoc(doc(db, 'users', user.uid)); // Delete user's data from Firestore
          await deleteUser(user); // Delete user from Firebase Authentication

          this.$q.notify({
            type: 'positive',
            message: 'Account successfully deleted.',
          });

          this.$router.push({ name: 'LoginPage' }); // Redirect to login page after account deletion
        } catch (error) {
          // Handle any errors that may occur during re-authentication or deletion
          this.$q.notify({
            type: 'negative',
            message: 'Failed to delete account: ' + error.message,
          });
        } finally {
          this.isDeletePromptVisible = false; // Close the delete account prompt
        }
      }
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

.fa,
.fas,
.far,
.fab {
  font-family: 'Font Awesome 6 Free'; /* For solid and regular icons */
  font-weight: 900;
}

.fab {
  font-family: 'Font Awesome 6 Brands';
  font-weight: 400;
}

.chat-app {
  display: flex;
  height: 100vh;
  width: 100vw;
  transition: background-color 0.3s, color 0.3s;
  position: relative;
  padding: 20px;
  gap: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  background-color: #f9f9f9;
  box-sizing: border-box;
}

.light-mode {
  background-color: #f9f9f9;
  color: #0A0A0A;
}

.dark-mode {
  background-color: #000000;
  color: #f1f1f1;
}

.chat-app > * {
  border-radius: 15px;
  overflow: hidden;
}

.dark-mode .chat-app > * {
  background-color: #0A0A0A;
}

.settings-icon {
  position: fixed;
  right: 2rem;
  top: 2rem;
  cursor: pointer;
  font-size: 28px;
  z-index: 10;
  color: var(--text-color);
  border-radius: 50%;
  padding: 10px;
  background-color: var(--bg-color-light);
  transition: transform 0.3s;
}

.settings-icon:hover {
  transform: scale(1.1);
}

/* Back to contacts button (Chevron Icon) */
.back-to-contacts-icon {
  position: fixed;
  top: 1rem;
  left: 1rem;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
  z-index: 11; /* Higher z-index to be visible above other elements */
}

/* Chat container */
.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  transition: width 0.3s ease, margin-right 0.3s ease;
  width: calc(100% - 320px);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  border-radius: 15px;
  background: #F5F5F5;
}

.chat-container.dark {
  background: #0A0A0A;
}

.message {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  max-width: 80%;
  padding: 12px;
  border-radius: 20px;
  background-color: var(--bubble-bg-light);
  color: var(--text-color);
  word-wrap: break-word;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.message.dark {
  background-color: var(--bubble-bg-dark);
}

.message-text {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  max-width: 100%;
}

.message-avatar {
  margin-right: 12px;
}

.message-avatar img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.settings-open {
  margin-right: 320px;
}

/* Mobile adjustments */
@media only screen and (max-width: 600px) {
  .chat-app {
    flex-direction: column;
    padding: 0;
    gap: 0;
  }

  /* Full-screen FriendsList */
  .friends-list {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 100;
    background-color: #f9f9f9;
  }

  .chat-container {
    width: 100%;
    height: 100%;
    padding: 10px;
    margin-right: 0;
  }

  .settings-icon {
    right: 1rem;
    top: 1rem;
    font-size: 24px;
  }

  .message {
    max-width: 95%;
  }

  .message-avatar img {
    width: 40px;
    height: 40px;
  }
}

/* Tablet adjustments */
@media only screen and (min-width: 601px) and (max-width: 1024px) {
  .chat-app {
    padding: 15px;
  }

  .chat-container {
    width: calc(100% - 320px);
    padding: 15px;
  }

  .message {
    max-width: 85%;
  }

  .settings-open {
    margin-right: 320px;
  }

  .message-avatar img {
    width: 45px;
    height: 45px;
  }
}

/* Scrollbar customization */
.chat-container::-webkit-scrollbar {
  width: 12px;
}

.chat-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-container::-webkit-scrollbar-thumb {
  background-color: #FF9000;
  border-radius: 10px;
  border: 3px solid transparent;
  background-clip: padding-box;
}

.chat-container {
  scrollbar-color: #FF9000 transparent;
  scrollbar-width: thin;
}

.chat-container.dark::-webkit-scrollbar-thumb {
  background-color: #FF9000;
}

.chat-container.dark {
  scrollbar-color: #FF9000 #0A0A0A;
}
</style>



