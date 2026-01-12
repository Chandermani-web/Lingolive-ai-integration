import React from "react";
import { useContext } from "react";
import AppContext from "./Context/UseContext.jsx";
import 'remixicon/fonts/remixicon.css';

const ShowImage = () => {
  const { showImage, setShowImage } = useContext(AppContext);

  return (
    <div>
      {showImage && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <button 
          className="absolute top-5 right-5 text-4xl pointer-cursor text-white hover:text-gray-300"
          onClick={() => setShowImage(null)}>
            <i className="ri-close-line"></i>
          </button>
          <img src={showImage} alt="Selected" className="max-h-full max-w-full" />
        </div>
      )}
    </div>
  );
};

export default ShowImage;
