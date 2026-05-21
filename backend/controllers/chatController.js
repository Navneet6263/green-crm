const { query } = require("../db/connection");

let activeClients = [];

class ChatController {
  /**
   * SSE Stream endpoint for real-time updates
   */
  async stream(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
    });
    res.write("\n");

    const userId = req.auth.id;
    const client = { userId, res };
    activeClients.push(client);

    req.on("close", () => {
      activeClients = activeClients.filter((c) => c.res !== res);
    });
  }

  /**
   * Broadcast message to relevant clients
   */
  broadcast(message) {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    activeClients.forEach((client) => {
      // Send if recipient is client, sender is client, or it is a group message
      if (
        !message.recipient_id ||
        Number(message.recipient_id) === client.userId ||
        Number(message.sender_id) === client.userId
      ) {
        try {
          client.res.write(payload);
        } catch (err) {
          console.error("SSE send failed", err);
        }
      }
    });
  }

  /**
   * Send a message
   */
  async sendMessage(req, res, next) {
    try {
    const senderId = req.auth.id;
      const { text, groupId } = req.body;
      const recipientId = req.body.recipientId ? Number(req.body.recipientId) : null;

      if (!text) {
        return res.status(400).json({ success: false, message: "Text content is required" });
      }

      // Save to database
      const [insertRes] = await query(
        `INSERT INTO chat_messages (group_id, sender_id, recipient_id, text, created_at) 
         VALUES (?, ?, ?, ?, GETDATE())`,
        [groupId || null, senderId, recipientId, text]
      );

      // Get sender details
      const [userRes] = await query("SELECT name FROM users WHERE id = ?", [senderId]);
      const senderName = userRes[0]?.name || "Anonymous";

      const messageObj = {
        group_id: groupId || null,
        sender_id: senderId,
        sender_name: senderName,
        recipient_id: recipientId || null,
        text,
        created_at: new Date().toISOString(),
      };

      // Broadcast real-time message
      new ChatController().broadcast(messageObj);

      res.status(201).json({
        success: true,
        data: messageObj,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all system users to search/start chat
   */
  async listUsers(req, res, next) {
    try {
      const currentUserId = req.auth.id;
      const [users] = await query(
        "SELECT id, name, email FROM users WHERE id != ? ORDER BY name ASC",
        [currentUserId]
      );
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new group
   */
  async createGroup(req, res, next) {
    try {
      const creatorId = req.auth.id;
      const { name, userIds } = req.body; // array of user IDs

      if (!name) {
        return res.status(400).json({ success: false, message: "Group name is required" });
      }

      // Insert group
      const [groupInsert] = await query(
        "INSERT INTO chat_groups (name, created_by, created_at) VALUES (?, ?, GETDATE())",
        [name, creatorId]
      );

      // We need to fetch the newly created group's ID. Let's select it.
      const [groupRes] = await query("SELECT TOP 1 id FROM chat_groups WHERE name = ? AND created_by = ? ORDER BY created_at DESC", [name, creatorId]);
      const groupId = groupRes[0]?.id;

      if (!groupId) {
        throw new Error("Failed to retrieve created group ID");
      }

      // Add creator to group members
      await query("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [groupId, creatorId]);

      // Add other members to group members
      if (Array.isArray(userIds)) {
        for (const userId of userIds) {
          await query("INSERT INTO chat_group_members (group_id, user_id) VALUES (?, ?)", [groupId, Number(userId)]);
        }
      }

      res.status(201).json({
        success: true,
        data: { id: groupId, name },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List groups and recent DMs for a user
   */
  async listChats(req, res, next) {
    try {
      const userId = req.auth.id;

      // Fetch user's groups
      const [groups] = await query(
        `SELECT cg.id, cg.name, 'group' as chat_type 
         FROM chat_groups cg 
         JOIN chat_group_members cgm ON cg.id = cgm.group_id 
         WHERE cgm.user_id = ?`,
        [userId]
      );

      // Fetch distinct users current user has exchanged direct messages with
      const [directs] = await query(
        `SELECT DISTINCT u.id, u.name, 'direct' as chat_type 
         FROM users u
         JOIN chat_messages cm ON (cm.sender_id = u.id AND cm.recipient_id = ?) 
                              OR (cm.recipient_id = u.id AND cm.sender_id = ?)`,
        [userId, userId]
      );

      res.json({
        success: true,
        data: { groups, directs },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch message history for a chat
   */
  async getMessages(req, res, next) {
    try {
      const userId = req.auth.id;
      const id = Number(req.params.id) || req.params.id; // supports both bigint user IDs and UUID group IDs
      const { type } = req.query; // 'group' or 'direct'

      let messages = [];

      if (type === "group") {
        const [rows] = await query(
          `SELECT cm.id, cm.group_id, cm.sender_id, u.name as sender_name, cm.text, cm.created_at 
           FROM chat_messages cm 
           JOIN users u ON cm.sender_id = u.id 
           WHERE cm.group_id = ? 
           ORDER BY cm.created_at ASC`,
          [id]
        );
        messages = rows;
      } else {
        const [rows] = await query(
          `SELECT cm.id, cm.sender_id, u.name as sender_name, cm.recipient_id, cm.text, cm.created_at 
           FROM chat_messages cm 
           JOIN users u ON cm.sender_id = u.id 
           WHERE (cm.sender_id = ? AND cm.recipient_id = ?) 
              OR (cm.sender_id = ? AND cm.recipient_id = ?) 
           ORDER BY cm.created_at ASC`,
          [userId, id, id, userId]
        );
        messages = rows;
      }

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Broadcast typing status
   */
  async sendTypingStatus(req, res, next) {
    try {
      const senderId = req.auth.id;
      const { recipientId, groupId, isTyping } = req.body;
      const [userRes] = await query("SELECT name FROM users WHERE id = ?", [senderId]);
      const senderName = userRes[0]?.name || "Anonymous";

      const payload = {
        type: "typing",
        sender_id: senderId,
        sender_name: senderName,
        recipient_id: recipientId ? Number(recipientId) : null,
        group_id: groupId || null,
        isTyping: !!isTyping
      };

      // Broadcast real-time typing status
      new ChatController().broadcast(payload);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
