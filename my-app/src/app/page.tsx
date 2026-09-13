"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function Home() {
    const [message, setMessage] = useState("");
    const [imgSrc, setImgSrc] = useState("/person.png");

    const handleClick = async () => {
        try {
            const response = await fetch("/api/msg");

            const data = await response.json();

            setMessage(data.message);
        } catch (error) {
            console.error("Error:", error);

            setMessage("Something went wrong.");
        }
    };

    const handleActiveClick = () => {
        setImgSrc("/person_blink.png");

        setTimeout(() => {
            setImgSrc("/person_hi.png");

            const speech = new SpeechSynthesisUtterance("Hi");

            const voices = window.speechSynthesis.getVoices();

            const maleVoice = voices.find(
                (voice) =>
                    voice.lang.startsWith("en") &&
                    /male|david|mark|daniel|alex/i.test(voice.name),
            );

            if (maleVoice) {
                speech.voice = maleVoice;
            }

            speech.rate = 0.85;
            speech.pitch = 0.9;
            speech.volume = 1;

            window.speechSynthesis.cancel();

            window.speechSynthesis.speak(speech);
            setTimeout(() => {
                setImgSrc("/person.png");
            }, 800);
        }, 200);
    };

    return (
        <main className="flex min-h-screen flex-col justify-evenly items-center">
            <h1 className="text-3xl">Hi, this side maiyu</h1>

            <button
                onClick={handleClick}
                className="border border-green-500 bg-green-500 px-4 py-2 rounded-md text-purple-500 font-bold"
            >
                How to use
            </button>

            <Image src={imgSrc} alt="person image" height={400} width={400} />

            <button
                onClick={handleActiveClick}
                className="border border-green-500 bg-green-500 px-4 py-2 rounded-md text-purple-500 font-bold"
            >
                Active
            </button>

            <p className="text-xl">{message}</p>
        </main>
    );
}
