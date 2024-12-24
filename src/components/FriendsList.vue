<template>
  <div :class="['left-panel', { 'dark-mode': isDarkMode }]">
    <div class="tabs">
      <button :class="{ active: currentTab === 'contacts' }" @click="currentTab = 'contacts'">Contacts</button>
      <button :class="{ active: currentTab === 'requests' }" @click="currentTab = 'requests'">Requests</button>
    </div>

    <!-- Add Friend Section -->
    <div class="add-friend-section" :class="{ 'dark-mode': isDarkMode }">
      <input
        type="text"
        v-model="newFriendUsername"
        placeholder="Add friend with username."
        @keyup.enter="sendFriendRequest"
      />
      <button @click="sendFriendRequest">Add</button>
    </div>

    <!-- Contacts Section -->
<div v-if="currentTab === 'contacts'" class="contacts-container" :class="{ 'dark-mode': isDarkMode }">
  <ul class="contact-list">
    <li v-for="contact in localContacts" :key="contact.id" :class="{ active: contact.id === activeContactId }">
      <div class="contact-info">
        <img :src="contact.photoURL || defaultAvatar" alt="Contact's Avatar" class="contact-avatar" @click="selectContact(contact)" />
        <span @click="selectContact(contact)">{{ contact.username || contact.displayName || 'Unknown' }}</span>
      </div>
      <!-- Replaced Unfriend button with FontAwesome icon -->
      <button class="icon-button" @click="unfriendContact(contact)">
        <i class="fa-solid fa-user-minus"></i> <!-- Unfriend icon -->
      </button>
    </li>
  </ul>
  <div v-if="localContacts.length === 0" class="no-contacts">
    No friends found.
  </div>
</div>


    <!-- Friend Requests Section -->
    <div v-if="currentTab === 'requests'" class="friend-requests-container" :class="{ 'dark-mode': isDarkMode }">
      <div v-if="friendRequests.length > 0" class="friend-requests-list">
        <ul>
          <li v-for="request in friendRequests" :key="request.id">
            <div class="request-info">
              <img :src="request.photoURL || defaultAvatar" alt="Requester's Avatar" class="request-avatar" />
              <span>{{ request.username || 'Unknown' }}</span>
            </div>
            <div class="request-actions">
              <button @click="acceptFriendRequest(request)" class="icon-button">
                <i class="fa-solid fa-check"></i>
              </button>
              <button @click="declineFriendRequest(request)" class="icon-button">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </li>
        </ul>
      </div>
      <div v-else class="no-requests">
        <p>No friend requests pending.</p>
      </div>
    </div>

    <div v-if="feedbackMessage" :class="['feedback', feedbackType]">
      {{ feedbackMessage }}
    </div>
  </div>
</template>

<script>
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from 'src/boot/firebase';

export default {
  name: 'FriendsList',
  props: {
    activeContactId: {
      type: String,
      default: null,
    },
    isDarkMode: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      newFriendUsername: '',
      feedbackMessage: '',
      feedbackType: '',
      friendRequests: [],
      localContacts: [],
      currentTab: 'requests',
      unsubscribeFriendRequests: null,
      unsubscribeContacts: null,
      defaultAvatar: 'https://via.placeholder.com/30?text=Avatar',
    };
  },
  methods: {
    async loadFriendRequests() {
      const currentUserId = auth.currentUser.uid;
      const friendRequestsRef = collection(db, 'users', currentUserId, 'friendRequests');

      this.unsubscribeFriendRequests = onSnapshot(friendRequestsRef, async (snapshot) => {
        const requests = [];

        for (const docSnapshot of snapshot.docs) {
          const request = { id: docSnapshot.id, ...docSnapshot.data() };

          try {
            const userRef = doc(db, 'users', request.id);
            const userData = (await getDoc(userRef)).data();

            if (userData) {
              request.username = userData.username || userData.displayName || 'Unknown';
              request.photoURL = userData.photoURL || this.defaultAvatar;
            } else {
              request.username = 'Unknown';
              request.photoURL = this.defaultAvatar;
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            request.username = 'Unknown';
            request.photoURL = this.defaultAvatar;
          }

          requests.push(request);
        }

        this.friendRequests = requests;
      });
    },

    async loadContacts() {
      const currentUserId = auth.currentUser.uid;
      const contactsRef = collection(db, 'users', currentUserId, 'contacts');

      this.unsubscribeContacts = onSnapshot(contactsRef, async (snapshot) => {
        const contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        for (const contact of contacts) {
          const userRef = doc(db, 'users', contact.id);
          const userData = (await getDoc(userRef)).data();
          contact.username = userData.username || userData.displayName || 'Unknown';
          contact.photoURL = userData.photoURL || this.defaultAvatar;
        }

        this.localContacts = contacts;
      });
    },

    async sendFriendRequest() {
      const username = this.newFriendUsername.trim();
      this.clearFeedback();

      if (!username) {
        this.setFeedback('Please enter a username.', 'error');
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          this.setFeedback('No user found with that username.', 'error');
          return;
        }

        const userDoc = querySnapshot.docs[0];
        const currentUser = auth.currentUser;

        if (userDoc.id === currentUser.uid) {
          this.setFeedback('You cannot add yourself as a friend.', 'error');
          return;
        }

        const friendRequestRef = doc(db, 'users', userDoc.id, 'friendRequests', currentUser.uid);
        await setDoc(friendRequestRef, {
          displayName: currentUser.displayName || 'Unknown',
          photoURL: currentUser.photoURL || '',
          username: currentUser.displayName || currentUser.email.split('@')[0],
        });

        this.setFeedback(`Friend request sent to ${userDoc.data().username || userDoc.data().displayName}.`, 'success');
        this.newFriendUsername = '';
      } catch (error) {
        this.setFeedback('Error sending friend request: ' + error.message, 'error');
        console.error('Error sending friend request:', error);
      }
    },

    async unfriendContact(contact) {
      const currentUserId = auth.currentUser.uid;
      const contactId = contact.id;

      try {
        await deleteDoc(doc(db, 'users', currentUserId, 'contacts', contactId));
        await deleteDoc(doc(db, 'users', contactId, 'contacts', currentUserId));
        this.setFeedback(`Unfriended ${contact.username || contact.displayName}.`, 'success');
      } catch (error) {
        console.error('Error unfriending contact:', error);
        this.setFeedback('Error unfriending contact: ' + error.message, 'error');
      }
    },

    async acceptFriendRequest(request) {
      const currentUserId = auth.currentUser.uid;
      const requestSenderId = request.id;

      try {
        await setDoc(doc(db, 'users', currentUserId, 'contacts', requestSenderId), {
          displayName: request.displayName,
          photoURL: request.photoURL,
          username: request.username,
        });

        await setDoc(doc(db, 'users', requestSenderId, 'contacts', currentUserId), {
          displayName: auth.currentUser.displayName || 'Unknown',
          photoURL: auth.currentUser.photoURL || '',
          username: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        });

        await deleteDoc(doc(db, 'users', currentUserId, 'friendRequests', requestSenderId));

        this.setFeedback(`You are now friends with ${request.username || request.displayName}.`, 'success');
      } catch (error) {
        console.error('Error accepting friend request:', error);
        this.setFeedback('Error accepting friend request: ' + error.message, 'error');
      }
    },

    async declineFriendRequest(request) {
      const currentUserId = auth.currentUser.uid;

      try {
        await deleteDoc(doc(db, 'users', currentUserId, 'friendRequests', request.id));
        this.setFeedback(`Declined friend request from ${request.username || request.displayName}.`, 'success');
      } catch (error) {
        console.error('Error declining friend request:', error);
        this.setFeedback('Error declining friend request: ' + error.message, 'error');
      }
    },

    selectContact(contact) {
      this.$emit('open-chat', contact);
    },

    setFeedback(message, type) {
      this.feedbackMessage = message;
      this.feedbackType = type;
      setTimeout(() => {
        this.clearFeedback();
      }, 3000);
    },

    clearFeedback() {
      this.feedbackMessage = '';
      this.feedbackType = '';
    },
  },

  async created() {
    await this.loadFriendRequests();
    await this.loadContacts();
  },

  beforeUnmount() {
    if (this.unsubscribeFriendRequests) this.unsubscribeFriendRequests();
    if (this.unsubscribeContacts) this.unsubscribeContacts();
  },
};
</script>

<style scoped>
.left-panel {
  background-color: #f7f7f7;
  padding: 20px;
  width: 300px;
  border-radius: 10px;
  transition: background-color 0.3s, width 0.3s;
}

.left-panel.dark-mode {
  background-color: #0A0A0A;
  color: #fff;
}

.tabs {
  display: flex;
  justify-content: space-between;
}

.tabs button {
  flex: 1;
  background-color: transparent;
  border: none;
  padding: 10px;
  cursor: pointer;
  border-radius: 5px;
  color: #005945; /*  */
  transition: background-color 0.2s, color 0.2s;
}

.tabs button:hover {
  background-color: #e6e6e6; /* Light hover effect */
}

.dark-mode .tabs button:hover {
  background-color: #141414; /* Dark mode hover effect */
}

.tabs button.active { /*  */
  background-color: #005945; /*  */
  color: white;
}

.friend-requests-container,
.contacts-container {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 10px;
  transition: background-color 0.3s;
}

.friend-requests-container.dark-mode,
.contacts-container.dark-mode {
  background-color: #141414;
}

.friend-requests-list,
.contact-list {
  list-style-type: none;
  padding: 0;
}

.friend-requests-list li,
.contact-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 5px;
  border-radius: 5px;
  transition: background-color 0.2s;
}

.friend-requests-list li:hover,
.contact-list li:hover {
  background-color: #005945; /* Highlight on hover */
}

.request-info,
.contact-info {
  display: flex;
  align-items: center;
}

.request-avatar,
.contact-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 10px;
}

.request-actions {
  display: flex;
  gap: 10px; /* Space between action buttons */
}

.no-requests,
.no-contacts {
  text-align: center;
  color: #888;
}

.add-friend-section {
  display: flex;
  align-items: center; /* Center items vertically */
  margin-top: 15px; /* Space above Add Friend section */
  margin-bottom: 15px;
}

.add-friend-section input {
  flex: 1; /* Allow the input to grow */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px; /* Space between input and button */
  transition: border-color 0.2s; /* Smooth border color transition */
}

.add-friend-section button { 
  padding: 10px 15px;
  border-radius: 5px;
  background-color: #005945; /*  */
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.feedback {
  margin-top: 10px;
  padding: 10px;
  border-radius: 5px;
}

.feedback.success {
  background-color: #d4edda;
  color: #FF9000; /*  */
}

.feedback.error {
  background-color: #f8d7da;
  color: #721c24;
}

.unfriend-btn {
  background-color: #ff3b5f;
  color: white;
  border: none;
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.2s;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 0.9rem;
  margin-left: 10px;
  transition: color 0.2s;
}

.icon-button:hover {
  color: #FF9000; /* Change icon color on hover */
}

.dark-mode .icon-button:hover {
  color: #000000;
}

/* Mobile view: Make the left panel take the entire screen */
@media only screen and (max-width: 600px) {
  .left-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw; /* Full width of the viewport */
    height: 100vh; /* Full height of the viewport */
    padding: 15px;
    z-index: 100;
    border-radius: 0;
    background-color: #f7f7f7;
    overflow-y: auto;
    transition: transform 0.3s ease;
  }

  .left-panel.dark-mode {
    background-color: #0A0A0A;
  }

  /* Adjust other elements for better mobile experience */
  .tabs button {
    padding: 12px;
  }

  .add-friend-section input {
    padding: 12px;
  }

  .add-friend-section button {
    padding: 12px 18px;
  }

  .contact-list li {
    padding: 15px;
  }

  .request-avatar,
  .contact-avatar {
    width: 40px;
    height: 40px;
  }
}
</style>

