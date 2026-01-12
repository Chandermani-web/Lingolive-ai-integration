import {
  LogOut,
  Home as HomeIcon,
  User as UserIcon,
  Bell,
  MessageSquareMore,
  Network,
  Menu,
  X,
  Eye,
} from "lucide-react";
import { useContext, useState } from "react";
import AppContext from "../../Context/UseContext";
import { Link } from "react-router-dom";

const Navbar = () => {
  const { auth, setUser, notifications } = useContext(AppContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="flex items-center justify-between p-4 bg-gray-800">
      <div className="w-full">
        <div className="flex justify-between items-center h-10">
          {/* <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-amber-500">LingOLive</h1> */}

          <svg
            width="320"
            height="100"
            viewBox="0 0 320 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            }}
          >
            <text x="20" y="65" fontSize="55" fill="#2c3e50" fontWeight="bold">
              Lingo
            </text>
            <text x="175" y="65" fontSize="55" fill="#1abc9c" fontWeight="bold">
              live
            </text>

            <path
              d="M 10 75 Q 70 45 150 70 C 180 80 220 70 280 50 Q 300 40 310 45"
              stroke="#1abc9c"
              strokeWidth="4"
              fill="none"
              opacity="0.7"
            />
            <circle cx="285" cy="48" r="8" fill="#1abc9c" />
          </svg>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            {auth ? (
              <div className="flex space-x-6 text-sm font-medium">
                <Link
                  to="/"
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  <HomeIcon className="w-5 h-5" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/connections"
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-400 transition-colors duration-200"
                >
                  <Network className="w-5 h-5" />
                  <span>Connection</span>
                </Link>
                <Link
                  to="/message"
                  className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors duration-200"
                >
                  <MessageSquareMore className="w-5 h-5" />
                  <span>Messages</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors duration-200"
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    <div className="h-2 w-2 bg-green-400 rounded-full absolute top-0 right-0 animate-bounce"></div>
                  </div>
                  <div className="">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {notifications.filter((u) => u.read === false).length}
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors duration-200"
                >
                  <UserIcon className="w-5 h-5 bg-white text-black rounded-full" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              null
            )}
          </div>
          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 bg-gray-700 rounded-lg p-4 animate-fade-in">
            {auth ? (
              <div className="flex flex-col space-y-4">
                <Link
                  to="/"
                  className="flex items-center space-x-3 p-3 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded-lg transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span>Home</span>
                </Link>
                <Link
                  to="/connections"
                  className="flex items-center space-x-3 p-3 text-purple-400 hover:text-purple-300 hover:bg-gray-600 rounded-lg transition-all duration-200 text-left"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Network className="w-5 h-5" />
                  <span>Connection</span>
                </Link>
                <Link
                  to="/message"
                  className="flex items-center space-x-3 p-3 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-lg transition-all duration-200 text-left"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <MessageSquareMore className="w-5 h-5" />
                  <span>Messages</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex items-center space-x-3 p-3 text-yellow-400 hover:text-yellow-300 hover:bg-gray-600 rounded-lg transition-all duration-200 text-left"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="relative">
                    <Bell className="w-5 h-5" />
                    <div className="h-2 w-2 bg-green-400 rounded-full absolute top-0 right-0 animate-bounce"></div>
                  </div>
                  <div className="">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        {notifications.filter((u) => u.read === false).length}
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 p-3 text-pink-400 hover:text-pink-300 hover:bg-gray-600 rounded-lg transition-all duration-200"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <UserIcon className="w-5 h-5 bg-white text-black rounded-full" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 p-3 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-all duration-200 text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              null
            )
            }
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
