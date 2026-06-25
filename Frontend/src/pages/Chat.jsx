import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";

export default function Chat() {
  const { user, logout } = useAuth();
  const [activePartner, setActivePartner] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="h-screen flex flex-col">
      <header className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="font-semibold text-gray-800">ChatApp</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Signed in as <strong>{user.username}</strong>
          </span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:underline"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activePartnerId={activePartner?.id}
          onSelectUser={setActivePartner}
          refreshKey={refreshKey}
        />
        <ChatWindow
          partner={activePartner}
          onMessageSent={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
