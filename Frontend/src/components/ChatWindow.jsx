import { useEffect, useRef, useState } from "react";
import api from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ChatWindow({ partner, onMessageSent }) {
  const { user, socket } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load message history whenever the selected partner changes
  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    setMessages([]);
    api.get(`/messages/${partner.id}`).then(({ data }) => {
      setMessages(data.messages);
      setLoading(false);
    });
  }, [partner?.id]);

  // Track partner's online status
  useEffect(() => {
    if (!partner) return;
    api.get(`/users?search=${encodeURIComponent(partner.username)}`).then(({ data }) => {
      const match = data.users.find((u) => u.id === partner.id);
      if (match) setPartnerOnline(!!match.is_online);
    });
  }, [partner?.id]);

  // Wire up socket listeners
  useEffect(() => {
    if (!socket || !partner) return;

    function handleNewMessage(message) {
      const isRelevant =
        (message.sender_id === partner.id && message.receiver_id === user.id) ||
        (message.sender_id === user.id && message.receiver_id === partner.id);
      if (!isRelevant) return;
      setMessages((prev) => [...prev, message]);
      onMessageSent?.();
    }

    function handleOnline({ userId }) {
      if (userId === partner.id) setPartnerOnline(true);
    }
    function handleOffline({ userId }) {
      if (userId === partner.id) setPartnerOnline(false);
    }
    function handleTypingStart({ userId }) {
      if (userId === partner.id) setPartnerTyping(true);
    }
    function handleTypingStop({ userId }) {
      if (userId === partner.id) setPartnerTyping(false);
    }

    socket.on("message:new", handleNewMessage);
    socket.on("user:online", handleOnline);
    socket.on("user:offline", handleOffline);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("user:online", handleOnline);
      socket.off("user:offline", handleOffline);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, partner?.id, user.id]);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  function handleSend(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !socket) return;

    socket.emit("message:send", { receiverId: partner.id, content }, (res) => {
      if (res?.error) console.error(res.error);
    });
    socket.emit("typing:stop", { receiverId: partner.id });
    setText("");
  }

  function handleTextChange(e) {
    setText(e.target.value);
    if (!socket || !partner) return;

    socket.emit("typing:start", { receiverId: partner.id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { receiverId: partner.id });
    }, 1500);
  }

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Select a conversation to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium uppercase">
          {partner.username[0]}
        </div>
        <div>
          <p className="font-medium text-gray-800">{partner.username}</p>
          <p className="text-xs text-gray-500">
            {partnerTyping ? (
              <span className="text-blue-600">typing...</span>
            ) : partnerOnline ? (
              "Online"
            ) : (
              "Offline"
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-gray-50">
        {loading && <p className="text-sm text-gray-400 text-center">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center">
            No messages yet. Say hello to {partner.username}!
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isMine={m.sender_id === user.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white flex gap-2">
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bg-blue-600 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isMine }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl text-sm ${
          isMine
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? "text-blue-100" : "text-gray-400"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
