require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const Message = require("./moduls/message");

const app = express();
app.use(cors());

const server = http.createServer(app);
//For both local and client url
const allowedOrigins = ["http://localhost:5173", process.env.CLIENT_URL];
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGOOSE_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

let users = [];

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on("join_chat", (username, callback) => {
    // Check if the username already exists
    const userExists = users.some((user) => user.username === username);

    if (!userExists) {
      // Add the user to the list if not already in the chat
      users.push({ username, socketId: socket.id });
      console.log(`${username} joined the chat`);

      // Notify all users about the new user joining
      io.emit("user_joined", {
        username,
        message: `${username} has joined the chat.`,
      });

      // Send the updated list of users to the new user
      io.emit("current_users", users);

      // Acknowledge successful join
      callback({ success: true, message: "Joined the chat successfully." });
    } else {
      // Handle the case where the username already exists
      callback({
        success: false,
        message: "Username already taken. Please choose a different username.",
      });
    }
  });

  // Handle user sending a message
  socket.on("send_message", async (data) => {
    const user = users.find((u) => u.socketId === socket.id);
    if (user) {
      io.emit("receive_message", data);

      // Save the message to MongoDB
      try {
        const newMessage = new Message({
          username: data.username,
          message: data.message,
          // file: data.file || null,
          // fileType: data.fileType || null,
        });
        await newMessage.save();
      } catch (err) {
        console.error("Error saving message:", err);
      }
    }
  });
  // socket.on("send_message", (data) => {
  //   const user = users.find((u) => u.socketId === socket.id);
  //   if (user) {
  //     io.emit("receive_message", data); // Broadcast the message to all clients
  //   } else {
  //     socket.emit("error_message", {
  //       message: "You need to join the chat first.",
  //     });
  //   }
  // });

  // Send all previous messages to the newly connected user
  Message.find()
    .sort({ _id: 1 }) // optional: oldest to newest
    .limit(100) // optional: limit number of messages
    .then((messages) => {
      socket.emit("load_messages", messages);
    })
    .catch((err) => {
      console.error("Error loading messages from DB:", err);
    });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const user = users.find((u) => u.socketId === socket.id);
    if (user) {
      // Remove the user from the users list
      users = users.filter((u) => u.socketId !== socket.id);

      // Notify all users that someone has left
      io.emit("user_left", {
        username: user.username,
        message: `${user.username} has left the chat.`,
      });

      // Send the updated users list
      io.emit("current_users", users);

      console.log(`${user.username} left the chat`);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
