import { useContext, useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  User,
  MapPin,
  Globe,
  Calendar,
  Camera,
  Edit3,
  Save,
  X,
  MessageCircle,
  Loader,
  ThumbsUp,
  Share,
  Download,
  MoreHorizontal,
  Sparkles,
  Heart,
  MessageSquare,
  BarChart3,
  Users,
  Link2,
  Bookmark
} from "lucide-react";
import AppContext from "../../Context/UseContext.jsx";
import { Link } from "react-router-dom";
import Comment from "../Post/Service/Comment.jsx";

const ProfileUpdate = () => {
  const {
    user,
    setUser,
    posts,
    setPosts,
    fetchUser,
    fetchComments,
    fetchPosts,
    setCommentIdForFetching,
    setShowImage
  } = useContext(AppContext);

  const [expandedPostId, setExpandedPostId] = useState(null)
  const [openCommentBoxId, setOpenCommentBoxId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    bio: "",
    location: "",
    username: "",
    website: "",
    phone: "",
    dateOfBirth: "",
    interests: "",
    socialLinks: {
      twitter: "",
      instagram: "",
      linkedin: "",
      github: "",
    },
  });

  const [openMenuId, setOpenMenuId] = useState(null);
  const [editOn, setEditOn] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [editdata, seteditdata] = useState({
    content: "",
    video: "",
    image: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullname: user.fullname || "",
        bio: user.bio || "",
        location: user.location || "",
        username: user.username || "",
        website: user.website || "",
        phone: user.phone || "",
        dateOfBirth: user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "",
        interests: user.interests ? user.interests.join(", ") : "",
        socialLinks: {
          twitter: user.socialLinks?.twitter || "",
          instagram: user.socialLinks?.instagram || "",
          linkedin: user.socialLinks?.linkedin || "",
          github: user.socialLinks?.github || "",
        },
      });
    }
  }, [user]);

  const handleEdit = (id, currentContent, currentImage, currentVideo) => {
    setOpenMenuId(null);
    setEditOn(true);
    setEditPostId(id);
    seteditdata({
      content: currentContent || "",
      image: currentImage || "",
      video: currentVideo || "",
    });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        seteditdata((prev) => ({ ...prev, image: reader.result, video: "" }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        seteditdata((prev) => ({ ...prev, video: reader.result, image: "" }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async () => {
    if (!editPostId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${editPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editdata),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("🎉 Post updated successfully");
        const updatedPosts = posts.map((p) =>
          p._id === editPostId ? { ...p, ...data.post } : p
        );
        setPosts(updatedPosts);
        setEditOn(false);
        setEditPostId(null);
        fetchPosts();
      } else {
        toast.error(data.message || "Failed to update post");
      }
    } catch (err) {
      toast.error("Error updating post: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("🗑️ Post deleted successfully");
        setPosts(posts.filter((p) => p._id !== id));
      } else {
        toast.error(data.message || "Failed to delete post");
      }
    } catch (err) {
      toast.error("Error deleting post: " + err.message);
    }
  };

  const handleShare = (id) => {
    navigator.clipboard.writeText(`${window.location.origin}/posts/${id}`);
    toast.success("🔗 Link copied to clipboard!");
  };

  const handleSave = (id) => {
    console.log("Save post:", id);
    toast.success("💾 Post saved to your collection");
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/posts/${postId}/likeandunlike`,
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("socialLinks.")) {
      const socialKey = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [socialKey]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        interests: formData.interests
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item),
      };

      const response = await fetch(
        "http://localhost:5000/api/auth/updateprofile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(submitData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setIsEditing(false);
        toast.success("✨ Profile updated successfully!");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error(`Error updating profile, ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append(type === "profile" ? "profilePic" : "coverPic", file);

    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/upload-${type}-pic`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        setUser((prev) => ({
          ...prev,
          [type === "profile" ? "profilePic" : "coverPic"]:
            data[type === "profile" ? "profilePic" : "coverPic"],
        }));
        toast.success(
          `${
            type === "profile" ? "🎯 Profile" : "🖼️ Cover"
          } picture updated successfully!`
        );
      } else {
        toast.error(data.message || "Failed to upload image");
      }
    } catch (error) {
      toast.error(`Error uploading image, ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    if (openCommentBoxId) {
      fetchUser();
    }
  }, [openCommentBoxId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
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

  const userPosts = posts?.filter((post) => post.user._id === user._id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-6xl mx-auto p-2 md:p-6 relative z-10">
        {/* Cover Photo */}
        <div className="relative h-80 md:rounded-3xl mb-8 overflow-hidden border border-gray-700/50 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
          {user.coverPic && (
            <img
              src={user.coverPic}
              alt="Cover"
              className="w-full h-full object-cover"
              onClick={()=>setShowImage(user.coverPic)}
            />
          )}
          <label className={`absolute top-6 right-6 bg-black/50 backdrop-blur-sm p-3 rounded-2xl cursor-pointer hover:bg-black/70 transition-all duration-300 transform hover:scale-105 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Camera className="w-6 h-6" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e, "cover")}
              className="hidden"
              disabled={uploading}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </div>
            )}
          </label>
        </div>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end gap-8 mb-12 -mt-20 md:-mt-24 relative z-20">
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-r from-blue-500 to-purple-600 p-1.5 shadow-2xl">
              <div className="w-full h-full rounded-2xl bg-gray-800 flex items-center justify-center overflow-hidden">
                {user.profilePic ? (
                  <img
                    src={user.profilePic || "/defaultProfile.png"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onClick={()=>setShowImage(user.profilePic)}
                  />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
            </div>
            <label className={`absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, "profile")}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {user.isVerified && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                ✓ Verified
              </div>
            )}
          </div>

          <div className="flex-1 bg-gray-800/40 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {user.fullname || user.username || "Anonymous User"}
                  </h1>
                </div>
                <p className="text-gray-400 text-lg mb-4">@{user.username || "username"}</p>
                {user.bio && <p className="text-gray-300 text-lg leading-relaxed mb-6">{user.bio}</p>}

                <div className="flex flex-wrap gap-6 text-sm">
                  {user.location && (
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-700/50 px-4 py-2 rounded-xl border border-gray-600/50">
                      <MapPin className="w-4 h-4" />
                      {user.location}
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-700/50 px-4 py-2 rounded-xl border border-gray-600/50">
                      <Globe className="w-4 h-4" />
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-400 transition-colors"
                      >
                        Website
                      </a>
                    </div>
                  )}
                  {user.dateOfBirth && (
                    <div className="flex items-center gap-2 text-gray-400 bg-gray-700/50 px-4 py-2 rounded-xl border border-gray-600/50">
                      <Calendar className="w-4 h-4" />
                      {new Date(user.dateOfBirth).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Edit3 className="w-5 h-5" />
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-2">
          {[
            { label: "Posts", value: user.posts?.length || 0, icon: BarChart3, color: "from-blue-500 to-cyan-500" },
            { label: "Friends", value: user.friends?.length || 0, icon: Users, color: "from-green-500 to-emerald-500" },
            { label: "Followers", value: user.followers?.length || 0, icon: Heart, color: "from-purple-500 to-pink-500" },
            { label: "Following", value: user.following?.length || 0, icon: User, color: "from-orange-500 to-red-500" }
          ].map((stat, index) => (
            <div key={index} className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="bg-gray-800/40 backdrop-blur-xl md:rounded-3xl p-8 border border-gray-700/50 shadow-2xl mb-2">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Edit Your Profile
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      value={formData.fullname}
                      onChange={handleInputChange}
                      className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                      placeholder="Choose a username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      maxLength={500}
                      className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <div className="text-sm text-gray-400 mt-2 text-right">
                      {formData.bio.length}/500
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                        placeholder="Your city"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3 text-gray-300">
                      Interests (comma-separated)
                    </label>
                    <input
                      type="text"
                      name="interests"
                      value={formData.interests}
                      onChange={handleInputChange}
                      className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300"
                      placeholder="Technology, Music, Travel, Art..."
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-gray-700/30 rounded-2xl p-6 border border-gray-600/30">
                <h3 className="text-lg font-semibold mb-4 text-gray-300">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "socialLinks.twitter", placeholder: "Twitter URL", color: "border-blue-400/50" },
                    { name: "socialLinks.instagram", placeholder: "Instagram URL", color: "border-pink-400/50" },
                    { name: "socialLinks.linkedin", placeholder: "LinkedIn URL", color: "border-blue-500/50" },
                    { name: "socialLinks.github", placeholder: "GitHub URL", color: "border-gray-400/50" }
                  ].map((social, index) => (
                    <input
                      key={index}
                      type="url"
                      name={social.name}
                      value={formData.socialLinks[social.name.split('.')[1]]}
                      onChange={handleInputChange}
                      placeholder={social.placeholder}
                      className={`w-full p-4 bg-gray-700/50 border ${social.color} rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 px-8 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-700/50 hover:bg-gray-600/50 px-8 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 border border-gray-600/50"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Social Links Display */}
        {user.socialLinks && Object.values(user.socialLinks).some((link) => link) && (
          <div className="bg-gray-800/40 backdrop-blur-xl md:rounded-3xl p-8 border border-gray-700/50 shadow-xl mb-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center">
                <Link2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
                Connect With Me
              </h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { platform: 'twitter', url: user.socialLinks.twitter, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { platform: 'instagram', url: user.socialLinks.instagram, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
                { platform: 'linkedin', url: user.socialLinks.linkedin, color: 'bg-blue-600/20 text-blue-500 border-blue-600/30' },
                { platform: 'github', url: user.socialLinks.github, color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' }
              ].map((social) => (
                social.url && (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl border ${social.color} hover:scale-105 transition-all duration-300 font-semibold`}
                  >
                    <span>{social.platform.charAt(0).toUpperCase() + social.platform.slice(1)}</span>
                  </a>
                )
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div className="bg-gray-800/40 backdrop-blur-xl md:rounded-3xl p-8 border border-gray-700/50 shadow-xl mb-3">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">
                Interests & Passions
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {user.interests.map((interest, index) => (
                <span
                  key={index}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg hover:scale-105 transition-transform duration-300"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        <div className="bg-gray-800/40 backdrop-blur-xl md:rounded-3xl p-2 md:p-8 border border-gray-700/50 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                My Posts
              </h3>
              <p className="text-gray-400">
                {userPosts?.length || 0} posts created
              </p>
            </div>
            <Link
              to="/create-post"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl flex items-center gap-3 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Sparkles className="w-5 h-5" />
              Create New Post
            </Link>
          </div>

          <div className="space-y-6">
            {userPosts?.length > 0 ? (
              userPosts.map((post) => (
                <div
                  key={post._id}
                  className="bg-gray-700/30 backdrop-blur-xl rounded-2xl p-2 md:p-6 border border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {/* User Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                          <img
                            src={post.profilePic || "/avatar.svg"}
                            alt="Profile"
                            className="w-full h-full rounded-2xl object-cover bg-gray-800"
                          />
                        </div>
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

                    {/* Menu Button */}
                    <div className="relative">
                      <button
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-xl transition-all duration-300"
                        onClick={() =>
                          setOpenMenuId(openMenuId === post._id ? null : post._id)
                        }
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {openMenuId === post._id && (
                        <div className="absolute right-0 top-12 w-48 bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-700/50 shadow-2xl z-10 overflow-hidden">
                          <button
                            onClick={() =>
                              handleEdit(
                                post._id,
                                post.content,
                                post.image,
                                post.video
                              )
                            }
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm hover:bg-gray-700/50 text-gray-200 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Post
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Delete
                          </button>
                          <button
                            onClick={() => handleShare(post._id)}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm hover:bg-gray-700/50 text-gray-200 transition-colors"
                          >
                            <Share className="w-4 h-4" />
                            Share
                          </button>
                          <button
                            onClick={() => handleSave(post._id)}
                            className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm hover:bg-gray-700/50 text-gray-200 transition-colors"
                          >
                            <Bookmark className="w-4 h-4" />
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editing Interface */}
                  {editOn && editPostId === post._id ? (
                    <div className="bg-gray-800/50 rounded-2xl p-6 space-y-4 border border-gray-600/50">
                      <textarea
                        className="w-full p-4 bg-gray-700/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 resize-none"
                        value={editdata.content}
                        onChange={(e) =>
                          seteditdata({ ...editdata, content: e.target.value })
                        }
                        rows={6}
                        placeholder="What's on your mind?"
                      />

                      {/* Media Preview */}
                      {editdata.image && (
                        <div className="relative">
                          <img
                            src={editdata.image}
                            alt="Preview"
                            className="w-full max-h-96 object-contain rounded-2xl border border-gray-600/50"
                          />
                          <button
                            onClick={() =>
                              seteditdata({ ...editdata, image: "" })
                            }
                            className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-300 transform hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {editdata.video && (
                        <div className="relative">
                          <video
                            src={editdata.video}
                            controls
                            className="w-full max-h-96 rounded-2xl border border-gray-600/50"
                          />
                          <button
                            onClick={() =>
                              seteditdata({ ...editdata, video: "" })
                            }
                            className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-all duration-300 transform hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Upload Buttons */}
                      <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-2xl transition-all duration-300 transform hover:scale-105">
                          <Camera className="w-5 h-5 text-blue-400" />
                          <span className="text-sm ml-2 text-gray-300">Add Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageChange}
                            className="hidden"
                          />
                        </label>

                        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-2xl transition-all duration-300 transform hover:scale-105">
                          <Download className="w-5 h-5 text-pink-400" />
                          <span className="text-sm ml-2 text-gray-300">Add Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleEditVideoChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={handleSaveEdit}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setEditOn(false);
                            setEditPostId(null);
                            seteditdata({ content: "", image: "", video: "" });
                          }}
                          className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-2xl text-white font-semibold transition-all duration-300 transform hover:scale-105"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <div className="mb-4 rounded-2xl overflow-hidden border border-gray-600/50">
                          <img
                            src={post.image}
                            alt="Post"
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      )}

                      {post.video && (
                        <div className="mb-4 rounded-2xl overflow-hidden border border-gray-600/50">
                          <video
                            src={post.video}
                            controls
                            className="w-full h-auto max-h-96 object-cover"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-600/50">
                        <div className="flex items-center space-x-6">
                          <button
                            className="flex items-center space-x-2 group transition-all duration-300"
                            onClick={() => handleLike(post._id)}
                          >
                            <div className={`p-2 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                              post.likes?.includes(user._id) 
                                ? "bg-red-500/20 text-red-400" 
                                : "bg-gray-600/50 text-gray-400 group-hover:bg-red-500/20 group-hover:text-red-400"
                            }`}>
                              <ThumbsUp className="w-5 h-5" />
                            </div>
                            <span className={`font-medium ${
                              post.likes?.includes(user._id) ? "text-red-400" : "text-gray-400"
                            }`}>
                              {post.likes?.length || 0}
                            </span>
                          </button>

                          <button
                            className="flex items-center space-x-2 group transition-all duration-300"
                            onClick={() => {
                              setOpenCommentBoxId(
                                openCommentBoxId === post._id ? null : post._id
                              );
                              setCommentIdForFetching(post._id);
                            }}
                          >
                            <div className="p-2 rounded-xl bg-gray-600/50 text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all duration-300 group-hover:scale-110">
                              <MessageCircle className="w-5 h-5" />
                            </div>
                            <span className="text-gray-400 font-medium group-hover:text-blue-400 transition-colors">
                              {post.comments?.length || 0}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Comment Section */}
                      {openCommentBoxId === post._id && (
                        <div className="mt-6 pt-6 border-t border-gray-600/50">
                          <Comment id={post._id} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-gray-700/30 rounded-2xl border border-gray-600/50">
                <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-400 mb-2">No posts yet</h4>
                <p className="text-gray-500 mb-6">Start sharing your thoughts with the world!</p>
                <Link
                  to="/create-post"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-2xl inline-flex items-center gap-3 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Your First Post
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <ToastContainer 
        position="top-right"
        theme="dark"
        toastClassName="bg-gray-800/95 backdrop-blur-xl border border-gray-700/50"
      />
    </div>
  );
};

export default ProfileUpdate;