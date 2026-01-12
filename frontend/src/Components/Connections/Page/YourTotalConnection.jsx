import { useContext, useEffect } from "react";
import AppContext from "../../../Context/UseContext";
import { useNavigate } from "react-router-dom";

const YourTotalConnection = () => {
  const { friendList, fetchFriendlist } = useContext(AppContext);
  const navigate = useNavigate();
  console.log("Friend List in YourTotalConnection:", friendList);

  useEffect(() => {
    fetchFriendlist();
  }, []);

  if (!friendList) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-4">
      <h1 className="col-span-full text-2xl font-bold text-white">
        Your Total Connections
      </h1>
      {friendList.length > 0 ? (
        friendList.map((friend) => (
          <div
            key={friend._id}
            className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300"
          >

            <div className="p-4 text-white flex justify-around items-center">
              <div className="flex items-center space-x-3 flex-1/2">
                <img
                  src={friend.profilePic || "/avatar.svg"}
                  alt={friend.fullname}
                  className="w-14 h-14 rounded-full object-cover border-4 border-indigo-400 cursor-pointer hover:scale-105 transition-transform duration-300"
                />
                <div className="flex flex-col">
                  <h3
                    className="font-semibold text-lg cursor-pointer hover:underline"
                    onClick={() => {
                      navigate(`/profile/${friend._id}`);
                    }}
                  >
                    {friend.fullname}
                  </h3>
                  <p
                    className="text-sm text-indigo-400 cursor-pointer hover:underline"
                    onClick={() => {
                      navigate(`/profile/${friend._id}`);
                    }}
                  >
                    @{friend.username}
                  </p>
                </div>
              </div>

              <button className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-400 hover:from-green-600 hover:to-teal-500 text-white py-2 px-4 rounded-xl w-full font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex-1">
                Message
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-400 col-span-full text-center">
          No connection requests.
        </p>
      )}
    </div>
  );
};

export default YourTotalConnection;
