import React from "react";

// [IMPORT] Helpers
import { adjustThemeColor } from "../utils/helpers";

interface PrimaryButtonProps {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    color?: string;
    iconSrc?: string;
}

const PrimaryButton = (props: PrimaryButtonProps) => {
    // If a color is provided, adjust it to ensure it’s not too bright
    const bgColor = props.color ? adjustThemeColor(props.color) : undefined;

    return (
        <button
            onClick={props.onClick}
            disabled={props.disabled}
            style={bgColor ? { backgroundColor: bgColor } : undefined}
            className="flex justify-center items-center gap-x-2 w-full py-3 rounded-md cursor-pointer text-button font-bold text-text-50 transition-all duration-200 hover:brightness-90 disabled:opacity-50"
        >   
            {props.iconSrc && (
                <img src={props.iconSrc} className="size-4" />
            )}
            <p className="button text-text-on-primary">{props.text}</p>
        </button>
    );
};

export default PrimaryButton;