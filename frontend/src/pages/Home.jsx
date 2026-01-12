import { useContext } from "react";
import { User, MessageSquare, Plus, Camera, Loader, Sparkles } from "lucide-react";
import AppContext from "../Context/UseContext";
import { useNavigate } from "react-router-dom";
import LeftSideBar from "../Components/Home/LeftSideBar";
import RightSideBar from "../Components/Home/RightSideBar";
import ShowPost from "../Components/Post/ShowPost";

const Home = () => {
  const navigate = useNavigate();
  const { user, posts, auth } = useContext(AppContext);

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-4 h-4 bg-blue-400 rounded-full animate-ping"></div>
          <div className="absolute bottom-40 right-32 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Welcome to Your Dashboard
          </h1>
          <p className="text-gray-400 mb-8 text-lg">
            Please log in to access your personalized home page
          </p>
          <a
            href="/login"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-xl inline-block font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <Loader className="w-8 h-8 text-blue-500 animate-pulse absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-400 mt-4">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white relative">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-9xl mx-auto md:px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 lg:block hidden space-y-6">
             <LeftSideBar />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl md:rounded-2xl md:p-8 p-4 md:mb-8 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="md:text-3xl text-2xl font-bold mb-3">
                    Welcome back, {user.fullname || user.username || "User"}! 👋
                  </h1>
                  <p className="text-blue-200/80 md:text-lg text-sm">
                    Here's what's happening in your world today.
                  </p>
                </div>
                <div className="md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl md:flex items-center justify-center hidden">
                  <Sparkles className="md:w-8 md:h-8 text-white" />
                </div>
              </div>
            </div>
            
            {/* Create Post */}
            <div
              className="bg-gray-800/40 backdrop-blur-xl md:rounded-2xl lg:p-6 p-2 md:mb-8 border border-gray-700/50 shadow-xl cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
              onClick={() => navigate("/create-post")}
            >
              <div className="flex items-center space-x-2">
                <button className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-2xl px-6 py-4 text-left text-gray-300 border border-gray-600/50 transition-all duration-300">
                  What's on your mind?
                </button>
                <button className="p-3 text-gray-400 hover:text-white bg-gray-700/50 rounded-xl hover:bg-gray-600/50 transition-all duration-300">
                  <Camera className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/40 backdrop-blur-xl md:rounded-2xl lg:p-8 md:p-2 border border-gray-700/50 shadow-xl">
              <div className="flex items-center justify-between md:mb-6">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Recent Activity
                </h3>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-700/50 to-gray-600/50 md:rounded-2xl md:border border-gray-600/50">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">You joined the platform!</p>
                    <p className="text-gray-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                {posts.length > 0 ? (
                  <ShowPost />
                ) : (
                  <div className="text-center py-12 text-gray-400 bg-gray-700/30 rounded-2xl border border-gray-600/50">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No posts yet. Create the first post!</p>
                    <button 
                      onClick={() => navigate("/create-post")}
                      className="mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      Create Post
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="lg:col-span-1 lg:block hidden space-y-6">
            <RightSideBar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;