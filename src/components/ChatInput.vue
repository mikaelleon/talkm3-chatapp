<template>
  <form
    @submit.prevent="sendMessage"
    :class="['message-form', { dark: isDark }]"
  >
    <textarea
      v-model="newMessage"
      @keydown="handleKeydown"
      placeholder="Type your message here..."
      :class="{ dark: isDark }"
      ref="messageInput"
      rows="1"
    ></textarea>

    <!-- Hidden File Input for Images/GIFs -->
    <input
      type="file"
      @change="handleFileInput"
      accept="image/*, .gif"
      ref="fileInput"
      style="display: none"
    />

    <!-- Attachment Button -->
    <button type="button" @click="triggerFileInput">📎</button>

    <!-- Send Button -->
    <button type="submit">Send</button>
  </form>
</template>

<script>
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../boot/firebase';

export default {
  props: {
    isDark: {
      type: Boolean,
      default: false,
    },
    currentChatRoomId: {
      type: String,
      required: true,
    },
    currentUser: {
      type: Object,
      required: true,
    },
    activeContactId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      newMessage: '',
      selectedFile: null,
    };
  },
  methods: {
    // Handle sending messages and file uploads
    async sendMessage() {
      if (!this.newMessage.trim() && !this.selectedFile) return;

      let fileUrl = null;

      // Upload file if selected
      if (this.selectedFile) {
        fileUrl = await this.uploadFile(this.selectedFile);
        if (!fileUrl) {
          console.error('Failed to upload file.');
          return;
        }
      }

      // Construct message payload
      const messageData = {
        text: this.newMessage.trim() || null, // Include text only if it exists
        fileUrl: fileUrl, // File URL if file was uploaded
        senderId: this.currentUser.uid,
        receiverId: this.activeContactId,
        timestamp: new Date().toISOString(),
      };

      // Emit message to parent component
      this.$emit('send-message', messageData);

      // Reset input fields
      this.newMessage = '';
      this.selectedFile = null;
      this.$refs.fileInput.value = ''; // Clear file input
      this.resetTextarea();
    },

    // Upload file to Firebase Storage
    async uploadFile(file) {
      try {
        const fileRef = ref(
          storage,
          `uploads/${this.currentChatRoomId}/${file.name}`
        );
        const snapshot = await uploadBytes(fileRef, file);
        return await getDownloadURL(snapshot.ref); // Get the file URL
      } catch (error) {
        console.error('File upload failed:', error);
        return null;
      }
    },

    // Handle file selection
    handleFileInput(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
      }
    },

    // Trigger file input click
    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    // Handle textarea behavior
    handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
      }
      this.autoResize();
    },

    autoResize() {
      const textarea = this.$refs.messageInput;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    },

    resetTextarea() {
      const textarea = this.$refs.messageInput;
      textarea.style.height = 'auto';
    },
  },
};
</script>

<style scoped>
.message-form {
  display: flex;
  padding: 12px;
  border-top: 2px solid var(--border-color-light);
  background-color: var(--bg-color-light);
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
}

.message-form.dark {
  background-color: var(--bg-color-dark);
  border-top: 2px solid var(--border-color-dark);
  border-radius: 15px;
}

.message-form textarea {
  flex-grow: 1;
  padding: 15px;
  border: 1px solid var(--border-color-light);
  border-radius: 30px;
  font-size: 0.9rem;
  outline: none;
  margin-right: 12px;
  color: var(--text-color-dark);
  resize: none;
  overflow-y: auto;
  max-height: 200px;
  transition: border-color 0.3s;
}

.message-form textarea.dark {
  background-color: #141414;
  border-color: var(--border-color-dark);
  color: white;
}

.message-form textarea:focus {
  border-color: #ff9000;
}

.message-form button {
  padding: 12px 24px;
  background-color: var(--border-color-dark);
  color: #ff9000;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-weight: bold;
}

.message-form button:active {
  background-color: #c76b00;
  transform: scale(0.95);
}
</style>
