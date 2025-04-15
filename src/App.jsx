import { useState, useRef, useEffect } from "react";
import { IoSend } from "react-icons/io5";
import { BsCircleFill } from "react-icons/bs";
import { HiMenuAlt2 } from "react-icons/hi";
import { FiSun, FiMoon, FiX } from "react-icons/fi";
import { FaSlideshare, FaPlay, FaPause } from "react-icons/fa";
import {
  AiFillEyeInvisible,
  AiFillEye,
  AiFillExclamationCircle,
} from "react-icons/ai";
import { io } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";
import joinSound from "./assets/join.mp3";
import leaveSound from "./assets/leave.mp3";
import messageSound from "./assets/message.mp3";
import logo from "./assets/logo.png";

const socket = io(import.meta.env.VITE_SOCKET_SERVER_URL);

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const [username, setUsername] = useState("");
  const [users, setUsers] = useState([]);
  const [isUserJoined, setIsUserJoined] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [showFilePreviewTab, setShowFilePreviewTab] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const videoRef = useRef();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const passwordRef = useRef(null);
  const [usernameError, setUsernameError] = useState("");

  //toggle password
  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  // Audio notifications
  const audioPlay = (audioFile) => {
    const audio = new Audio(audioFile);
    audio.play();
  };

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for events from the server
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
      audioPlay(messageSound);
    });

    socket.on("user_joined", (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { message: data.message, username: "system" },
      ]);
      audioPlay(joinSound);
    });

    socket.on("user_left", (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { message: data.message, username: "system" },
      ]);
      audioPlay(leaveSound);
    });

    socket.on("current_users", (usersList) => {
      setUsers(usersList);
    });

    socket.on("user_exists", (data) => {
      setError(data.message);
      setTimeout(() => setError(""), 3000);
    });

    socket.on("error_message", (data) => {
      setError(data.message);
    });

    socket.on("username_exists", (data) => {
      if (data.exists) {
        setUsernameError(
          "This username is already taken. Please choose another one."
        );
      } else {
        // If username is available, proceed with joining the chat
        setUsername(data.username);
        socket.emit("join_chat", data.username);
        setIsUserJoined(true);
        localStorage.setItem("username", data.username);
      }
    });

    socket.on("load_messages", (messages) => {
      setMessages(messages);
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("current_users");
      socket.off("user_exists");
      socket.off("error_message");
      socket.off("username_exists");
      socket.off("load_messages");
    };
  }, []);

  //Handle Join chat
  const handleJoinChat = () => {
    if (username.trim() && password.trim()) {
      const capitalizedUsername = username
        .trim()
        .replace(/^[a-zA-Z]/, (char) => char.toUpperCase());

      // Verify password
      const correctPassword = import.meta.env.VITE_CHAT_PASSWORD;

      if (password !== correctPassword) {
        setError("Incorrect password!");
        setTimeout(() => setError(""), 3000);
        return;
      }

      // Emit event to check if the username is already taken
      socket.emit("check_username", capitalizedUsername);

      // If the username is unique, proceed with joining the chat
      socket.emit("join_chat", capitalizedUsername, (response) => {
        if (response.success) {
          setUsername(capitalizedUsername);
          setIsUserJoined(true);
          localStorage.setItem("username", capitalizedUsername);
          setError("");
          setUsernameError(""); // Ensure error is cleared on success
        } else {
          setUsernameError(response.message);
          setTimeout(() => setUsernameError(""), 3000);
        }
      });
    } else {
      setError("Please enter both a username and a password.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSendMessageClick = (e) => {
    e.preventDefault();
    if (newMessage.trim() || file) {
      const newMsg = {
        username: username, // Ensure that the username is passed
        message: newMessage || "", // Ensure message is passed even if it's null or empty string
        id: Date.now(),
        text: newMessage || null,
        file: file ? URL.createObjectURL(file) : null,
        fileType: fileType || null,
        sender: username,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
      };

      socket.emit("send_message", newMsg);
      setNewMessage("");
      setShowEmojiPicker(false);
      setFile(null);
      setFileType(null);
      setPreviewFile(null);
      setShowFilePreviewTab(false);
    }
  };

  const handleFileUpload = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      const type = selectedFile.type.startsWith("image") ? "image" : "video";
      setFileType(type);

      const fileURL = URL.createObjectURL(selectedFile);
      setPreviewFile(fileURL);
      setShowFilePreviewTab(true);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
        setTimeout(() => setShowButton(false), 3000); // Hide button after 3 seconds
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getUserColor = (username) => {
    // A simple hash function to generate a color based on the username
    const hashCode = (str) => {
      if (!str || typeof str !== "string") return 0; // <== Add this line
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    };

    // Generate a number between 0 and 360 for a hue value
    const hue = Math.abs(hashCode(username) % 360);
    return `hsl(${hue}, 70%, 50%)`; // Generate a color using HSL
  };

  const handleUsernameEnter = (e) => {
    if (e.key === "Enter" && passwordRef.current) {
      // Focus on the password input if it's not null
      passwordRef.current.focus();
    }
  };

  return (
    <div
      className={`flex h-screen ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* Username Input */}
      {!isUserJoined && (
        <div
          className={`fixed inset-0 ${
            !isUserJoined ? "bg-opacity-60 bg-black backdrop-blur-md" : ""
          } `}
          style={{ zIndex: 999 }}
        >
          <div
            className={`absolute w-[70%]  lg:w-[50%] md:w-[50%] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 md:p-6 shadow-lg rounded-lg ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            }`}
          >
            <img
              src={logo}
              alt="logo"
              className="w-[70%] h-[70%] lg:w-[50%] lg:h-[50%] mx-auto py-2"
            />
            <div className=" mx-auto justify-center w-[80%]  ">
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.replace(/^\w/, (char) => char.toUpperCase())
                  )
                }
                onKeyDown={handleUsernameEnter}
                placeholder="Enter your username"
                className={`px-4 py-2  border rounded-lg mb-4 w-full  md:w-[300px] lg:w-full ${
                  darkMode
                    ? "bg-gray-800 text-white border-gray-600"
                    : "bg-white text-black border-gray-300"
                }`}
              />
              <div className="relative ">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinChat();
                  }}
                  ref={passwordRef}
                  placeholder="Enter password"
                  className={`px-4 py-2  border rounded-lg mb-4 w-full md:w-[300px] lg:w-full ${
                    darkMode
                      ? "bg-gray-800 text-white border-gray-600"
                      : "bg-white text-black border-gray-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  aria-label="Toggle password visibility"
                  className="absolute top-2.5 right-2 text-xl text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                </button>
              </div>
              {/* Error Message */}
              <div className="text-red-500 flex items-center mb-2">
                {usernameError && (
                  <>
                    <AiFillExclamationCircle className="mr-2" />
                    <p>{usernameError}</p>
                  </>
                )}
              </div>
              <div className="text-red-500 flex items-center mb-2">
                {error && (
                  <>
                    <AiFillExclamationCircle className="mr-2" />
                    <p>{error}</p>
                  </>
                )}
              </div>

              <button
                onClick={handleJoinChat}
                className={`px-4 py-2 w-full lg:w-[50%] lg:flex justify-self-center justify-center rounded-lg  ${
                  darkMode
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                Join Chat
              </button>
              {isUserJoined && <div>Welcome to the chat, {username}!</div>}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "w-64" : "w-0"
        } hidden md:flex flex-col transition-width duration-300 ${
          darkMode ? "bg-gray-900 text-gray-200" : "bg-gray-100 text-gray-800"
        }`}
      >
        <div
          className={`flex justify-between items-center p-4 border-b ${
            darkMode ? "border-gray-700" : "border-gray-300"
          }`}
        >
          <h2 className="text-xl font-semibold">Active Users</h2>
          <button
            className={`hover:text-red-500 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <FiX className="text-2xl" />
          </button>
        </div>
        <ul className="p-4 space-y-2">
          {users.map((user) => (
            <li
              key={user.socketId}
              className={`flex items-center space-x-2 p-2 rounded-md ${
                darkMode ? "bg-gray-800" : "bg-gray-200"
              }`}
            >
              <BsCircleFill
                className={darkMode ? "text-green-400" : "text-green-600"}
              />
              <span>{user.username}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div
          className={`fixed inset-0 z-50 md:hidden ${
            darkMode ? "bg-black bg-opacity-50" : "bg-gray-800 bg-opacity-30"
          }`}
        >
          <div
            className={`fixed left-0 top-0 bottom-0 w-64 shadow-lg ${
              darkMode
                ? "bg-gray-900 text-gray-200"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <div
              className={`flex justify-between items-center p-4 border-b ${
                darkMode ? "border-gray-700" : "border-gray-300"
              }`}
            >
              <h2 className="text-xl font-semibold">Active Users</h2>
              <button
                className={`hover:text-red-500 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <ul className="p-4 space-y-2">
              {users.map((user) => (
                <li
                  key={user.socketId}
                  className={`flex items-center space-x-2 p-2 rounded-md ${
                    darkMode ? "bg-gray-800" : "bg-gray-200"
                  }`}
                >
                  <BsCircleFill
                    className={darkMode ? "text-green-400" : "text-green-600"}
                  />
                  <span>{user.username}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {/* Header Section */}
        <div
          className={`shadow-sm p-4 flex items-center ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg "
            aria-label="Toggle sidebar"
          >
            <HiMenuAlt2 className="text-2xl" />
          </button>
          <div className="ml-4 flex-1">
            <h2 className="font-semibold text-lg sm:text-xl">Chat Room</h2>
            <p className="text-sm text-green-500">Online</p>
          </div>
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className="p-2 rounded-lg"
          >
            {darkMode ? (
              <FiSun className="text-xl" />
            ) : (
              <FiMoon className="text-xl" />
            )}
          </button>
        </div>

        {/* Messages Section */}
        <div
          // className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 md:bg-transparent"
          className={`flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 md:bg-transparent message-area ${
            darkMode ? "dark-mode" : "light-mode"
          }`}
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                message.username === "system"
                  ? "items-center"
                  : message.sender === username
                  ? "items-end"
                  : "items-start"
              }`}
            >
              {message.username !== "system" && (
                <span
                  className="text-sm mb-1"
                  style={{
                    color: getUserColor(message.sender),
                    fontWeight: "bold",
                    fontSize: "17px",
                  }}
                >
                  ~{message.username === username ? "" : message.username}
                </span>
              )}
              <div
                className={`max-w-xs px-4 py-2 rounded-lg relative ${
                  //
                  message.username === "system"
                    ? `text-gray-800 text-center italic ${
                        darkMode ? "bg-yellow-600" : "bg-yellow-300"
                      }`
                    : message.username === username
                    ? `${
                        darkMode
                          ? "bg-blue-700 text-white"
                          : "bg-blue-500 text-white"
                      }`
                    : `${darkMode ? "bg-gray-600 text-white" : "bg-gray-200"}`
                }`}
              >
                {/* Image Message */}
                {message.file && message.fileType === "image" && (
                  <img
                    src={message.file}
                    alt="shared"
                    className="rounded mt-2 max-w-full"
                  />
                )}

                {/* Video Message */}
                {message.file && message.fileType === "video" && (
                  <div className="relative rounded mt-2 max-w-full">
                    {/* Video */}
                    <video
                      ref={videoRef}
                      src={message.file}
                      onClick={handleVideoClick}
                      className="rounded w-full"
                    />

                    {/* Play/Pause Button */}
                    <button
                      onClick={handleVideoClick}
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded"
                      aria-label={isPlaying ? "Pause Video" : "Play Video"}
                    >
                      {isPlaying ? (
                        <FaPause className="text-white text-4xl" />
                      ) : (
                        <FaPlay className="text-white text-4xl" />
                      )}
                    </button>
                  </div>
                )}

                {/* Message Text */}
                <p>{message.message}</p>

                {/* Timestamp */}
                {message.sender !== "system" && (
                  <span
                    className={`text-xs block mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {message.timestamp}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Section */}
        <form
          onSubmit={handleSendMessageClick}
          className=" p-4 border-t bg-gray-50 md:bg-transparent"
          // style={{
          //   backdropFilter: "blur(10px)", // Apply blur effect
          //   WebkitBackdropFilter: "blur(10px)", // For Safari support
          // }}
        >
          <div className="flex flex-wrap justify-center items-center space-y-2 md:space-y-0 md:space-x-2 w-full">
            {/* File Upload */}
            <div className="flex space-x-4 md:w-auto w-full">
              {showFilePreviewTab && (
                <div
                  className={`w-full h-[50%] p-4 rounded-lg shadow-lg z-10 ${
                    darkMode
                      ? "bg-gray-800 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  <div className="flex justify-center">
                    {fileType === "image" ? (
                      <img
                        src={previewFile}
                        alt="Preview"
                        className="max-w-[70%] max-h-[50%] rounded"
                      />
                    ) : (
                      <video
                        src={previewFile}
                        controls
                        className="max-w-[50%] max-h-[50%] rounded"
                      />
                    )}
                  </div>

                  <div className="flex justify-center mt-3 space-x-2">
                    <input
                      type="file"
                      accept="image/*, video/*"
                      id="file-upload"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`px-4 py-2 rounded-lg ${
                        darkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <FaSlideshare className="text-xl align-items-center" />
                    </label>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className={`flex-1 px-4 py-2 border rounded-lg w-full md:w-auto ${
                        darkMode ? "bg-gray-800 text-white" : ""
                      }`}
                      aria-label="Message input field"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className={`px-4 py-2 rounded-lg ${
                        darkMode ? "bg-gray-700" : "bg-gray-200"
                      }`}
                      aria-label="Toggle emoji picker"
                    >
                      😀
                    </button>

                    <button
                      type="submit"
                      onClick={handleSendMessageClick}
                      className={`px-4 py-2 rounded-lg ${
                        darkMode
                          ? "bg-blue-600 text-white"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      <IoSend className="text-xl" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-14">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!showFilePreviewTab && (
                <>
                  <input
                    type="file"
                    accept="image/*, video/*"
                    id="file-upload"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`px-4 py-2 rounded-lg ${
                      darkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}
                  >
                    <FaSlideshare className="text-xl align-items-center" />
                  </label>
                  {/* Message Input and Buttons */}
                  <div className="relative flex space-x-2 w-full md:w-auto items-center">
                    <input
                      type="text"
                      value={newMessage}
                      // onClick={handleSendMessageClick}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault(); // Prevent form submission if inside a form
                          handleSendMessageClick(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className={`w-full md:w-[500px] flex-grow px-4 py-2 border rounded-lg pr-12 ${
                        darkMode ? "bg-gray-800 text-white" : ""
                      }`}
                      aria-label="Message input field"
                    />

                    {/* Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker((prev) => !prev)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl text-gray-500 hover:text-gray-700"
                      aria-label="Toggle emoji picker"
                    >
                      😀
                    </button>

                    {/* Emoji Picker Dropdown */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-14 left-0">
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    onClick={handleSendMessageClick}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    <IoSend className="text-xl" />
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatApp;
