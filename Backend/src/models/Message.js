import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:     { type: String, required: true },
    is_read:     { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

messageSchema.index({ sender_id: 1, receiver_id: 1, created_at: 1 });
messageSchema.index({ receiver_id: 1, is_read: 1 });

const Message = mongoose.model("Message", messageSchema);

function normalize(doc) {
  if (!doc) return null;
  const obj = doc._doc ? { ...doc._doc } : { ...doc };
  obj.id = (obj._id || obj.id).toString();
  obj.sender_id = obj.sender_id?.toString();
  obj.receiver_id = obj.receiver_id?.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export const MessageModel = {
  async create({ senderId, receiverId, content }) {
    const msg = await Message.create({ sender_id: senderId, receiver_id: receiverId, content });
    return normalize(msg);
  },

  async getConversation(userA, userB, { limit = 50, beforeId = null } = {}) {
    const filter = {
      $or: [
        { sender_id: userA, receiver_id: userB },
        { sender_id: userB, receiver_id: userA },
      ],
    };
    if (beforeId) filter._id = { $lt: beforeId };
    const rows = await Message.find(filter).sort({ _id: -1 }).limit(limit).lean();
    return rows.reverse().map(normalize);
  },

  async markAsRead(senderId, receiverId) {
    await Message.updateMany(
      { sender_id: senderId, receiver_id: receiverId, is_read: false },
      { $set: { is_read: true } }
    );
  },

  async getConversationsForUser(userId) {
    const oid = new mongoose.Types.ObjectId(userId);

    const rows = await Message.aggregate([
      { $match: { $or: [{ sender_id: oid }, { receiver_id: oid }] } },
      { $sort: { _id: -1 } },
      {
        $addFields: {
          partnerId: { $cond: [{ $eq: ["$sender_id", oid] }, "$receiver_id", "$sender_id"] },
        },
      },
      {
        $group: {
          _id: "$partnerId",
          lastMessage: { $first: "$content" },
          lastMessageAt: { $first: "$created_at" },
          lastMessageSenderId: { $first: "$sender_id" },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "partner" } },
      { $unwind: "$partner" },
      {
        $lookup: {
          from: "messages",
          let: { partnerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender_id", "$$partnerId"] },
                    { $eq: ["$receiver_id", oid] },
                    { $eq: ["$is_read", false] },
                  ],
                },
              },
            },
            { $count: "n" },
          ],
          as: "unreadInfo",
        },
      },
      {
        $project: {
          partnerId: { $toString: "$_id" },
          partnerUsername: "$partner.username",
          isOnline: "$partner.is_online",
          lastSeen: "$partner.last_seen",
          lastMessage: 1,
          lastMessageAt: 1,
          lastMessageSenderId: { $toString: "$lastMessageSenderId" },
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unreadInfo.n", 0] }, 0] },
        },
      },
    ]);

    return rows;
  },
};

export default Message;
