<template>
  <form
    @submit.prevent="sendMessage"
    :class="['message-form', { dark: isDark }]">
    <textarea
      v-model="newMessage"
      @keydown="handleKeydown"
      placeholder="Type your message here..."
      required
      :class="{ dark: isDark }"
      ref="messageInput"
      rows="1"
    ></textarea>
    <button type="submit">Send</button>
  </form>
</template>

<script>
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
    };
  },
  methods: {
    async sendMessage() {
      const trimmedMessage = this.newMessage.trim();
      if (trimmedMessage) {
        this.$emit('send-message', {
          text: trimmedMessage,
          senderId: this.currentUser.uid,
          receiverId: this.activeContactId,
          timestamp: new Date().toISOString(),
        });
        this.newMessage = ''; // Clear the message input
        this.resetTextarea(); // Reset the textarea size after sending the message
      }
    },
    handleKeydown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage(); // Send message on Enter
      }
      this.autoResize(); // Resize the textarea as the user types
    },
    autoResize() {
      const textarea = this.$refs.messageInput;
      textarea.style.height = 'auto'; // Reset the height to auto to calculate the new height
      textarea.style.height = textarea.scrollHeight + 'px'; // Set the height to fit the content
    },
    resetTextarea() {
      const textarea = this.$refs.messageInput;
      textarea.style.height = 'auto'; // Reset the height to its default
    }
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
  resize: none; /* Disable manual resizing */
  overflow-y: auto;
  max-height: 200px; /* Limit the height of the textarea */
  transition: border-color 0.3s;
}

.message-form textarea.dark {
  background-color: #141414;
  border-color: var(--border-color-dark);
  color: white;
}

.message-form textarea:focus {
  border-color: #FF9000; /* Orange border on focus */
}

.message-form button {
  padding: 12px 24px;
  background-color: var(--border-color-dark);
  color: #FF9000;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-weight: bold;
}

.message-form button:active {
  background-color: #c76b00; /* Even darker orange on active */
  transform: scale(0.95);
}
</style>
