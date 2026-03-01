import React, { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { Lottie } from "@remotion/lottie";

export const RemoteLottie = ({ url, style, speed = 1, delay = 0 }: { url: string, style?: React.CSSProperties, speed?: number, delay?: number }) => {
    const [animationData, setAnimationData] = useState<any>(null);
    const [handle] = useState(() => delayRender());

    useEffect(() => {
        if (!url) {
            continueRender(handle);
            return;
        }

        fetch(url)
            .then((data) => data.json())
            .then((json) => {
                setAnimationData(json);
                continueRender(handle);
            })
            .catch((err) => {
                console.error("Failed to load Lottie:", url, err);
                continueRender(handle);
            });
    }, [handle, url]);

    if (!animationData) return null;

    return (
        <div style={style}>
            {/* @ts-ignore: Prop casting to avoid strict typing issues with remotion-lottie versions */}
            <Lottie animationData={animationData} {...({ speed } as any)} />
        </div>
    );
};
