import { useEffect, useState } from "react";
import api from "../utils/api.js";

export default function Sidebar({ activePartnerId, onSelectUser, refreshKey }) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load existing conversations
  useEffect(() => {
    api
      .get("/messages/conversations")
      .then(({ data }) => setConversations(data.conversations))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Live user search (debounced)
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api.get(`/users?search=${encodeURIComponent(search)}`).then(({ data }) => {
        setSearchResults(data.users);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const listToShow = search.trim() ? searchResults : null;

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {listToShow ? (
          <>
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400 uppercase">
              Search results
            </p>
            {listToShow.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No users found</p>
            )}
            {listToShow.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                username={u.username}
                isOnline={!!u.is_online}
                subtitle={u.is_online ? "Online" : formatLastSeen(u.last_seen)}
                active={activePartnerId === u.id}
                onClick={() => onSelectUser({ id: u.id, username: u.username })}
              />
            ))}
          </>
        ) : (
          <>
            {loading && <p className="px-4 py-3 text-sm text-gray-400">Loading...</p>}
            {!loading && conversations.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">
                No conversations yet. Search for a user to start chatting.
              </p>
            )}
            {conversations.map((c) => (
              <UserRow
                key={c.partnerId}
                id={c.partnerId}
                username={c.partnerUsername}
                isOnline={!!c.isOnline}
                subtitle={c.lastMessage}
                unreadCount={c.unreadCount}
                active={activePartnerId === c.partnerId}
                onClick={() =>
                  onSelectUser({ id: c.partnerId, username: c.partnerUsername })
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function UserRow({ id, username, isOnline, subtitle, unreadCount, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
        active ? "bg-blue-50" : ""
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium uppercase">
          {username[0]}
        </div>
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-gray-300"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-800 truncate">{username}</p>
          {!!unreadCount && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-2 shrink-0">
              {unreadCount}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
    </button>
  );
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen + "Z");
  return `Last seen ${date.toLocaleString()}`;
}
