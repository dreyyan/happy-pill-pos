import React from "react";

interface PrimaryButtonProps {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    color?: string;
    iconSrc?: string;
}

const PrimaryButton = (props: PrimaryButtonProps) => {
    return (
        <button
            onClick={props.onClick}
            disabled={props.disabled}
            style={props.color ? { backgroundColor: `#${props.color}` } : undefined}
            className="flex justify-center items-center w-full py-2 rounded-md cursor-pointer text-button font-bold bg-primary-600 text-text-50 transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        >   
            { props.iconSrc && (
                <img src={props.iconSrc} className="" />
            )}
            <p className="button text-text-on-primary">{props.text}</p>
        </button>
    );
};

export default PrimaryButton;