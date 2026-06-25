import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
    email:    { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    is_online: { type: Boolean, default: false },
    last_seen: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

const User = mongoose.model("User", userSchema);

// Converts _id -> id so the frontend works without any changes
function normalize(doc) {
  if (!doc) return null;
  const obj = doc._doc ? { ...doc._doc } : { ...doc };
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export const UserModel = {
  async create({ username, email, passwordHash }) {
    const user = await User.create({ username, email, password_hash: passwordHash });
    return normalize(user);
  },

  async findByEmail(email) {
    return normalize(await User.findOne({ email }).lean());
  },

  async findByUsername(username) {
    return normalize(await User.findOne({ username }).lean());
  },

  async findById(id) {
    return normalize(await User.findById(id).lean());
  },

  async publicById(id) {
    return normalize(await User.findById(id).select("-password_hash").lean());
  },

  async searchOthers(currentUserId, query) {
    const filter = { _id: { $ne: currentUserId } };
    if (query) {
      filter.username = { $regex: query, $options: "i" };
      return (await User.find(filter).select("_id username is_online last_seen").sort({ username: 1 }).limit(20).lean()).map(normalize);
    }
    return (await User.find(filter).select("_id username is_online last_seen").sort({ is_online: -1, username: 1 }).limit(50).lean()).map(normalize);
  },

  async setOnlineStatus(id, isOnline) {
    await User.findByIdAndUpdate(id, { is_online: isOnline, last_seen: new Date() });
  },
};

export default User;
