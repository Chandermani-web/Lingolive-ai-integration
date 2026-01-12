import {
  LogOut,
  Home as HomeIcon,
  User as UserIcon,
  Bell,
  MessageSquareMore,
  Network,
  PlusSquare,
  Search,
  Compass,
  Heart,
} from "lucide-react";
import { useContext, useState } from "react";
import AppContext from "../../Context/UseContext";
import { Link, useLocation } from "react-router-dom";

const LeftNavbar = () => {
  const { auth, setUser, notifications } = useContext(AppContext);
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      localStorage.setItem("auth", "false");
      setUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", icon: HomeIcon, label: "Home", color: "text-blue-400" },
    { path: "/connections", icon: Network, label: "Connections", color: "text-purple-400" },
    { path: "/message", icon: MessageSquareMore, label: "Messages", color: "text-green-400" },
    { 
      path: "/notifications", 
      icon: Bell, 
      label: "Notifications", 
      color: "text-yellow-400",
      badge: notifications.filter((u) => u.read === false).length
    },
    { path: "/profile", icon: UserIcon, label: "Profile", color: "text-pink-400" },
  ];

  if (!auth) return null;

  return (
    <>
      {/* Desktop Left Sidebar - Fixed */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-20 lg:w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50 flex-col justify-between py-6 px-3 lg:px-4 z-50 transition-all duration-300 shadow-2xl">
        <div className="space-y-4">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center lg:justify-start lg:px-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden lg:block">
              LingoLive
            </span>
          </Link>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const hovered = hoveredItem === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    group relative flex items-center lg:justify-start justify-center
                    px-3 lg:px-4 py-3.5 rounded-xl transition-all duration-300
                    ${active 
                      ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 shadow-lg' 
                      : 'hover:bg-gray-800/50 border border-transparent'
                    }
                  `}
                >
                  <div className="relative">
                    <Icon 
                      className={`
                        w-6 h-6 transition-all duration-300
                        ${active ? item.color : 'text-gray-400 group-hover:text-white'}
                        ${hovered && !active ? 'scale-110' : ''}
                      `}
                    />
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`
                    ml-4 font-medium hidden lg:block transition-all duration-300
                    ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}
                  `}>
                    {item.label}
                  </span>
                  
                  {/* Tooltip for icon-only view */}
                  <div className="lg:hidden absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                    {item.label}
                  </div>
                </Link>
              );
            })}

            {/* Create Post Button */}
            <Link
              to="/create-post"
              onMouseEnter={() => setHoveredItem('create')}
              onMouseLeave={() => setHoveredItem(null)}
              className="group relative flex items-center lg:justify-start justify-center px-3 lg:px-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <PlusSquare className="w-6 h-6 text-white" />
              <span className="ml-4 font-medium text-white hidden lg:block">
                Create Post
              </span>
              
              {/* Tooltip */}
              <div className="lg:hidden absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
                Create Post
              </div>
            </Link>
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          onMouseEnter={() => setHoveredItem('logout')}
          onMouseLeave={() => setHoveredItem(null)}
          className="group relative flex items-center lg:justify-start justify-center px-3 lg:px-4 py-3.5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all duration-300"
        >
          <LogOut className="w-6 h-6 text-gray-400 group-hover:text-red-400 transition-colors duration-300" />
          <span className="ml-4 font-medium text-gray-400 group-hover:text-red-400 hidden lg:block transition-colors duration-300">
            Logout
          </span>
          
          {/* Tooltip */}
          <div className="lg:hidden absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap">
            Logout
          </div>
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/98 backdrop-blur-xl border-t border-gray-800/50 z-50 shadow-2xl">
        <nav className="flex justify-around items-center py-3 px-4 safe-area-inset-bottom">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  relative flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300
                  ${active ? 'bg-gray-800 scale-105' : ''}
                `}
              >
                <div className="relative">
                  <Icon 
                    className={`
                      w-6 h-6 transition-all duration-300
                      ${active ? item.color : 'text-gray-400'}
                    `}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-xs mt-1 ${active ? 'text-white' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          {/* Mobile Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-300 hover:bg-red-500/10"
          >
            <LogOut className="w-6 h-6 text-gray-400" />
            <span className="text-xs mt-1 text-gray-400">Logout</span>
          </button>
        </nav>
      </div>
    </>
  );
};

export default LeftNavbar;
