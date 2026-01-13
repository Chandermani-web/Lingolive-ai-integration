import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, trim: true },
  translatedText: { type: String, trim: true },
  sourceLang: { type: String, default: 'auto' },
  targetLang: { type: String },
  isTranslated: { type: Boolean, default: false },
  image: { type: String },
  video: { type: String },
  audio: { type: String },
  file: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;