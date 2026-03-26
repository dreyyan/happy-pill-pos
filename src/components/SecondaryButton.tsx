import React from "react";

interface SecondaryButtonButtonProps {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    color?: string;
    iconSrc?: string;
}

const SecondaryButton = (props: SecondaryButtonButtonProps) => {
    return (
        <button
            onClick={props.onClick}
            disabled={props.disabled}
            style={props.color ? { backgroundColor: `#${props.color}` } : undefined}
            className="flex justify-center items-center gap-x-2 w-full py-3 rounded-md cursor-pointer text-button font-semibold bg-bg-50 text-text-700 transition-all duration-200 hover:bg-bg-300 disabled:opacity-50"
        >   
            { props.iconSrc && (
                <img src={props.iconSrc} className="size-4" />
            )}
            <p className="button text-text-on-primary">{props.text}</p>
        </button>
    );
};

export default SecondaryButton;