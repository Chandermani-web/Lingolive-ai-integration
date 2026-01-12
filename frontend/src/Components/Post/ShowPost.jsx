import { useContext, useEffect, useState } from "react";
import AppContext from "../../Context/UseContext";
import { MessageCircle, ThumbsUp, Share, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import Comment from "./Service/Comment";

const ShowPost = () => {
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const {
    posts,
    user,
    setPosts,
    fetchPosts,
    fetchComments,
    setCommentIdForFetching,
  } = useContext(AppContext);

  const handleLike = async (postId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${encodeURIComponent(postId)}/likeandunlike`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      const data = await response.json();
      console.log("Like response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to like post");
      }

      if (data.success) {
        const updatedPosts = posts.map((post) =>
          post._id === postId ? { ...post, likes: data.updatedLikes } : post
        );
        setPosts(updatedPosts);
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  useEffect(() => {
    if (openCommentBoxId) {
      fetchComments();
    }
    fetchPosts();
  }, [openCommentBoxId]);

  if (!posts) {
    return (
      <div className="flex justify-center items-center h-64 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:space-y-6 space-y-2">
      {posts?.length > 0 ? (
        posts.map((post) => (
          <div
            key={post._id}
            className="bg-gray-800/40 backdrop-blur-xl md:rounded-2xl p-6 border border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            {/* User Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                    <img
                      src={post.profilePic || "/avatar.svg"}
                      alt="Profile"
                      className="w-full h-full rounded-2xl object-cover bg-gray-800"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-gray-900 rounded-full"></div>
                </div>
                <div>
                  <Link
                    to={`/profile/${post.user._id}`}
                    className="font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    @{post.user.username}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Post Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === post._id ? null : post._id)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                
                {menuOpenId === post._id && (
                  <div className="absolute right-0 top-12 w-48 bg-gray-800/90 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl z-10">
                    <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700/50 rounded-t-xl transition-colors">
                      Save Post
                    </button>
                    <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">
                      Report
                    </button>
                    <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-b-xl transition-colors">
                      Hide
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p
                className={`text-gray-200 leading-relaxed ${
                  expandedPostId === post._id ? "" : "line-clamp-3"
                }`}
              >
                {post.content}
              </p>
              {post.content.length > 150 && (
                <button
                  className="text-blue-400 hover:text-blue-300 font-medium text-sm mt-2 transition-colors"
                  onClick={() =>
                    setExpandedPostId(
                      expandedPostId === post._id ? null : post._id
                    )
                  }
                >
                  {expandedPostId === post._id ? "See Less" : "See More"}
                </button>
              )}
            </div>

            {/* Media */}
            {post.image && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-gray-700/50">
                <img
                  src={post.image}
                  alt="Post"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            {post.video && (
              <div className="mb-4 rounded-2xl overflow-hidden border border-gray-700/50">
                <video
                  src={post.video}
                  controls
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <div className="flex items-center space-x-6">
                {/* Like Button */}
                <button
                  className="flex items-center space-x-2 group transition-all duration-300"
                  onClick={() => handleLike(post._id)}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                    post.likes?.includes(user?._id) 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-gray-700/50 text-gray-400 group-hover:bg-red-500/20 group-hover:text-red-400"
                  }`}>
                    <ThumbsUp className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${
                    post.likes?.includes(user?._id) ? "text-red-400" : "text-gray-400"
                  }`}>
                    {post.likes?.length || 0}
                  </span>
                </button>

                {/* Comment Button */}
                <button
                  className="flex items-center space-x-2 group transition-all duration-300"
                  onClick={() => {
                    setOpenCommentBoxId(
                      openCommentBoxId === post._id ? null : post._id
                    );
                    setCommentIdForFetching(post._id);
                  }}
                >
                  <div className="p-2 rounded-xl bg-gray-700/50 text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-gray-400 font-medium group-hover:text-blue-400 transition-colors">
                    {post.comments?.length || 0}
                  </span>
                </button>
              </div>

              {/* Share Button */}
              <button className="flex items-center space-x-2 group p-2 rounded-xl bg-gray-700/50 text-gray-400 hover:bg-green-500/20 hover:text-green-400 transition-all duration-300">
                <Share className="w-5 h-5" />
                <span className="font-medium">Share</span>
              </button>
            </div>

            {/* Comment Section */}
            {openCommentBoxId === post._id && (
              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <Comment id={post._id} />
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-12 bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50">
          <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-lg">No posts to show yet.</p>
          <p className="text-gray-500 text-sm mt-2">Be the first to create a post!</p>
        </div>
      )}
    </div>
  );
};

export default ShowPost;