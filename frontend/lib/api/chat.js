import { apiClient } from "./client.js";

export const chatApi = {
  /**
   * List active direct messages and group chats
   */
  async listChats() {
    return apiClient.get("/chat/active");
  },

  /**
   * Fetch messages for a specific group or direct recipient
   */
  async getMessages(chatId, type) {
    return apiClient.get(`/chat/messages/${chatId}?type=${type}`);
  },

  /**
   * Fetch all system users to start a new chat
   */
  async getUsers() {
    return apiClient.get("/chat/users");
  },

  /**
   * Send a message
   */
  async sendMessage(data) {
    return apiClient.post("/chat/send", data);
  },

  /**
   * Create a new group chat
   */
  async createGroup(data) {
    return apiClient.post("/chat/group", data);
  },
};
