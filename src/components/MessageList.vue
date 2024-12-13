<template>
  <div class="messages" ref="messages" :class="{ 'has-messages': localMessages.length > 0, dark: isDark }">
    <div v-for="message in localMessages" :key="message.id" class="message-wrapper">
      <div class="message-avatar">
        <img :src="message.photoURL || defaultAvatar" alt="avatar" />
      </div>
      <div :class="['message', { dark: isDark }]">
        <strong class="username">{{ message.username || 'User' }}:</strong>
        <p class="message-text">{{ message.text }}</p>
        <!-- Display the formatted timestamp -->
        <small class="timestamp">{{ formatTimestamp(message.timestamp) }}</small>
      </div>
    </div>
  </div>
</template>

<script>
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from 'src/boot/firebase';

export default {
  props: {
    messages: {
      type: Array,
      required: true,
    },
    isDark: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localMessages: [], // Store the local version of the messages with additional data
      defaultAvatar: 'https://via.placeholder.com/40?text=Avatar',
      unsubscribe: null, // Store the unsubscribe function for Firestore listener
    };
  },
  watch: {
    messages: {
      immediate: true,
      handler(newMessages) {
        this.updateLocalMessages(newMessages); // Update messages when prop changes
      },
    },
  },
  created() {
    this.updateLocalMessages(this.messages); // Update messages on component creation
    this.listenForMessages(); // Start listening for message updates
  },
  beforeUnmount() {
    if (this.unsubscribe) this.unsubscribe(); // Unsubscribe from Firestore updates
  },
  methods: {
    async updateLocalMessages(newMessages) {
      this.localMessages = await this.fetchUserProfiles(newMessages); // Fetch user profiles for messages
    },
    async fetchUserProfiles(messages) {
      const currentUser = auth.currentUser;
      if (!currentUser) return messages;

      // Fetch the current user's data
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const currentUserData = (await getDoc(currentUserRef)).data();

      const updatedMessages = messages.map((message) => ({
        ...message,
        username: message.senderId === currentUser.uid ? currentUserData?.username || 'You' : message.username,
        photoURL: message.senderId === currentUser.uid ? currentUserData?.photoURL || this.defaultAvatar : message.photoURL,
      }));

      // Fetch the chat partner's profile
      const chatPartnerId = updatedMessages.find(msg => msg.senderId !== currentUser.uid)?.senderId;
      if (chatPartnerId) {
        const chatPartnerRef = doc(db, 'users', chatPartnerId);
        const chatPartnerData = (await getDoc(chatPartnerRef)).data();

        return updatedMessages.map((message) => ({
          ...message,
          username: message.senderId === chatPartnerId ? chatPartnerData?.username || 'User' : message.username,
          photoURL: message.senderId === chatPartnerId ? chatPartnerData?.photoURL || this.defaultAvatar : message.photoURL,
        }));
      }
      return updatedMessages;
    },
    listenForMessages() {
      // Listen for real-time updates to messages from Firestore
      const messagesCollection = collection(db, 'messages');
      this.unsubscribe = onSnapshot(messagesCollection, (snapshot) => {
        const loadedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        this.updateLocalMessages(loadedMessages); // Update the local messages with new data
      });
    },
    formatTimestamp(timestamp) {
      // Format the timestamp into a readable date-time format
      if (!timestamp) return '';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString(); // Format using the user's locale
    },
  },
};
</script>

<style scoped>
.messages {
  flex-grow: 1;
  padding: 15px;
  background-color: var(--bg-color-light);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.messages.has-messages {
  overflow-y: auto;
}

.message-wrapper {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
}

.message-avatar {
  margin-right: 10px;
}

.message-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.message {
  padding: 10px 15px;
  border-radius: 15px;
  max-width: 75%;
  background-color: #E0E0E0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.message.dark {
  background-color: #141414;
}

.username {
  font-size: 0.9rem;
  margin-bottom: 5px;
  color: var(--text-color-dark);
}

.message-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-color-light);
}

.timestamp {
  font-size: 0.75rem;
  color: gray;
  margin-top: 3px;
}

/* Mobile phones (up to 600px wide) */
@media (max-width: 600px) {
  .message {
    max-width: 90%;
    padding: 8px 12px;
    font-size: 0.8rem; /* Adjust font size for mobile readability */
  }

  .message-avatar img {
    width: 30px;
    height: 30px;
  }

  .username {
    font-size: 0.8rem;
  }

  .message-text {
    font-size: 0.8rem;
  }

  .timestamp {
    font-size: 0.7rem;
  }
}

/* Tablets (601px to 1024px wide) */
@media (min-width: 601px) and (max-width: 1024px) {
  .message {
    max-width: 85%;
    padding: 9px 14px;
    font-size: 0.85rem;
  }

  .message-avatar img {
    width: 35px;
    height: 35px;
  }

  .username {
    font-size: 0.85rem;
  }

  .message-text {
    font-size: 0.85rem;
  }

  .timestamp {
    font-size: 0.75rem;
  }
}

</style>
