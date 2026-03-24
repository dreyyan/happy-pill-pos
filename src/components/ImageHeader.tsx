// [IMPORT] React Navigation
import React from "react";
import { useNavigate } from "react-router-dom";

const ImageHeader = () => {
    const navigate = useNavigate();

    return (
        <button onClick={() => navigate("/")} className="relative flex flex-col justify-center items-center space-y-2 bg-gradient-to-tr from-primary-500 to-primary-700 w-full px-4 py-8 cursor-pointer">
            <h1 className="text-text-50">Happy-Pill Cafe</h1>
            <p className="text-h5 text-text-200">"Powerful POS for seamless sales and operations"</p>
        </button>
    );
};

export default ImageHeader;