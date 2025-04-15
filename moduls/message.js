const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  file: {
    type: String, // File path or file URL
    default: "", // If no file is attached
  },
  fileType: {
    type: String,
    enum: ["image", "video", "none"], // Supported file types
    default: "none",
  },
}
 
);

module.exports = mongoose.model("Message", messageSchema);
