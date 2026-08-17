"use client";

import { useState } from "react";
import ChatInterface from "./ChatInterface";
import Icon from "@/components/Icon";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-ai-gradient-start to-ai-gradient-end text-white rounded-full shadow-btn-primary flex items-center justify-center transition-all hover:scale-105"
        aria-label="Open DOCTAR AI Chat"
      >
        {open ? (
          <Icon name="close" className="text-[24px]" />
        ) : (
          /* pointer-events-none so the click always reaches the button, and
             draggable={false} so the icon can't be dragged out of it (dropping
             it back on the tab would navigate to the raw SVG). */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/doctar-logo.svg"
            alt="DOCTAR"
            draggable={false}
            className="w-8 h-8 pointer-events-none select-none"
          />
        )}
      </button>

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-24 right-6 left-6 sm:left-auto z-50 w-auto sm:w-96 h-[min(520px,calc(100dvh-7rem))] rounded-3xl shadow-glass overflow-hidden border border-white/50 flex flex-col bg-background">
          <div className="bg-tertiary text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/doctar-logo.svg"
                alt="DOCTAR"
                draggable={false}
                className="w-7 h-7 pointer-events-none select-none rounded-full"
              />
              <div>
                <p className="font-label-md text-label-md font-semibold leading-tight">DOCTAR AI</p>
                <p className="text-white/70 font-caption-sm text-caption-sm">Health Assistant</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <Icon name="close" className="text-[20px]" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface compact />
          </div>
        </div>
      )}
    </>
  );
}
