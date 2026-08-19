"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SessionSummary } from "@/lib/chatSessions";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/Icon";

/** No date library in this project — a small hand-rolled formatter matches
 * the codebase's existing preference for that over adding a dependency. */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = diffSec / 60;
  if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
  const diffHr = diffMin / 60;
  if (diffHr < 24) return `${Math.floor(diffHr)}h ago`;
  const diffDay = diffHr / 24;
  if (diffDay < 7) return `${Math.floor(diffDay)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface ChatSidebarProps {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onRetry: () => void;
  /** Mobile-only drawer state — ignored above the md breakpoint, where the
   * sidebar is always visible inline (see the wrapper's md: classes below). */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function ChatSidebar({
  sessions,
  currentSessionId,
  loading,
  error,
  onNewChat,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onRetry,
  mobileOpen,
  onMobileClose,
}: ChatSidebarProps) {
  const { user, logout } = useAuth();

  // Recents' own chevron drives its expand/collapse — the "History" nav item
  // below is a shortcut that jumps straight to it (there's no separate
  // history page in this app; recents *is* the history), not a second,
  // independent toggle over different state.
  const [recentsExpanded, setRecentsExpanded] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const recentsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  // Close the row menu on outside click.
  useEffect(() => {
    if (!openMenuId) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openMenuId]);

  function startRename(session: SessionSummary) {
    setOpenMenuId(null);
    setRenamingId(session.id);
    setRenameValue(session.title);
  }

  function submitRename() {
    const id = renamingId;
    const value = renameValue.trim();
    setRenamingId(null);
    if (id && value) onRenameSession(id, value);
  }

  // On mobile the drawer should get out of the way once its job is done;
  // on desktop onMobileClose is a no-op visually (md:translate-x-0 keeps the
  // sidebar shown regardless of mobileOpen), so wrapping unconditionally is safe.
  function handleNewChat() {
    onNewChat();
    onMobileClose();
  }
  function handleSelectSession(id: string) {
    onSelectSession(id);
    onMobileClose();
  }
  function goToHistory() {
    setRecentsExpanded(true);
    recentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* Backdrop — mobile drawer only. md:hidden guarantees it never shows
          on desktop even if mobileOpen is stale from a resize. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Below md: fixed-position slide-in drawer, translated off-screen
          unless mobileOpen. At md and up: back to a normal static flex
          child, always visible — md:translate-x-0 cancels the transform
          regardless of mobileOpen, and md:static takes it out of the
          fixed-overlay stacking context entirely. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 h-full flex flex-col bg-primary-container text-white shadow-xl rounded-br-[2rem] py-6 transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:z-auto md:translate-x-0 md:shrink-0`}
      >
        {/* Mobile-only close row — desktop has no drawer to close. */}
        <div className="flex justify-end px-4 -mt-2 mb-2 md:hidden">
          <button
            onClick={onMobileClose}
            aria-label="Close sidebar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Logo + brand */}
        <div className="px-6 mb-8 flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/doctar-logo.svg"
            alt="DOCTAR AI"
            draggable={false}
            className="h-10 w-10 rounded-xl object-contain shadow-soft-surface select-none"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-title-md font-title-md font-extrabold text-white">DOCTAR</span>
            <span className="text-caption-sm font-caption-sm text-white px-2 py-0.5 rounded-full bg-white/20 border border-white/30">
              AI Assistant
            </span>
          </div>
        </div>

        {/* Start New Session */}
        <div className="px-4 mb-6">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-primary-fixed text-primary rounded-xl py-3 px-4 font-label-md text-label-md font-semibold transition-all duration-200 shadow-md active:scale-95"
          >
            <Icon name="add" className="text-[20px]" />
            New Consultation
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-1 min-h-0">
          {/* "Chat" — static current-section indicator, matching the mockup's
              active tab. This app has one consultation view, so unlike the
              reference this isn't a link elsewhere. */}
          <div className="flex items-center gap-3 text-primary rounded-xl px-4 py-3 mx-2 bg-primary-fixed shadow-md font-label-md text-label-md font-semibold">
            <Icon name="chat_bubble" filled className="text-[20px]" />
            <span>Chat</span>
          </div>

          <button
            onClick={goToHistory}
            className="w-full flex items-center gap-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl px-4 py-3 mx-2 transition-colors duration-200 group font-label-md text-label-md"
          >
            <Icon name="history" className="text-[20px]" />
            <span>History</span>
          </button>

          <div ref={recentsSectionRef} className="mt-8 mb-2 px-6 flex justify-between items-center">
            <span className="text-caption-sm font-caption-sm text-white/50 uppercase tracking-wider">Recents</span>
            <button
              onClick={() => setRecentsExpanded((v) => !v)}
              aria-label={recentsExpanded ? "Collapse recents" : "Expand recents"}
              className="text-white/50 hover:text-white transition-colors"
            >
              <Icon name={recentsExpanded ? "expand_less" : "expand_more"} className="text-[18px]" />
            </button>
          </div>

          {recentsExpanded && (
            <div className="space-y-0.5">
              {!user ? (
                <div className="text-center py-8 px-2">
                  <p className="font-caption-sm text-caption-sm text-white/60 mb-2">Sign in to save your chat history.</p>
                  <Link
                    href="/login"
                    className="inline-block font-caption-sm text-caption-sm font-semibold text-white hover:underline"
                  >
                    Sign in →
                  </Link>
                </div>
              ) : loading ? (
                <p className="font-caption-sm text-caption-sm text-white/50 text-center py-6">Loading…</p>
              ) : error ? (
                <div className="text-center py-6 px-2">
                  <p className="font-caption-sm text-caption-sm text-error-container mb-2">{error}</p>
                  <button onClick={onRetry} className="font-caption-sm text-caption-sm font-semibold text-white hover:underline">
                    Retry
                  </button>
                </div>
              ) : sessions.length === 0 ? (
                <p className="font-caption-sm text-caption-sm text-white/50 text-center py-6">No conversations yet.</p>
              ) : (
                sessions.map((s) => {
                  const isActive = s.id === currentSessionId;
                  const isRenaming = renamingId === s.id;
                  const isConfirmingDelete = confirmDeleteId === s.id;
                  return (
                    <div key={s.id} className="relative group">
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={submitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename();
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="w-full px-4 py-2 mx-2 font-label-md text-label-md rounded-xl border border-white/40 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                          style={{ width: "calc(100% - 1rem)" }}
                        />
                      ) : (
                        <button
                          onClick={() => handleSelectSession(s.id)}
                          className={`w-full flex flex-col px-6 py-2 mx-2 rounded-lg text-left transition-colors ${
                            isActive ? "bg-white/15 text-white" : "text-white/90 hover:bg-white/10"
                          }`}
                          style={{ width: "calc(100% - 1rem)" }}
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="chat" className="text-[14px] text-white/60" />
                            <span className="text-label-sm font-label-md truncate">{s.title}</span>
                          </div>
                          <span className="text-caption-sm font-caption-sm text-white/40 pl-6">{formatRelativeTime(s.updated_at)}</span>
                        </button>
                      )}

                      {!isRenaming && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === s.id ? null : s.id);
                              setConfirmDeleteId(null);
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/15 transition-opacity ${
                              openMenuId === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                            aria-label="Session options"
                          >
                            <Icon name="more_vert" className="text-[16px]" />
                          </button>

                          {openMenuId === s.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-40 bg-surface-gloss rounded-xl shadow-soft-surface border border-outline-variant/30 py-1 z-10"
                            >
                              {isConfirmingDelete ? (
                                <div className="px-3 py-2">
                                  <p className="font-caption-sm text-caption-sm text-on-surface-variant mb-2">Delete this chat?</p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        onDeleteSession(s.id);
                                        setOpenMenuId(null);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="flex-1 font-caption-sm text-caption-sm font-semibold bg-error hover:opacity-90 text-on-error rounded-lg py-1.5"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="flex-1 font-caption-sm text-caption-sm font-semibold bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg py-1.5"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startRename(s)}
                                    className="w-full flex items-center gap-2 px-3 py-2 font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high"
                                  >
                                    <Icon name="edit" className="text-[16px]" />
                                    Rename
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(s.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 font-label-md text-label-md text-error hover:bg-error-container/40"
                                  >
                                    <Icon name="delete" className="text-[16px]" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-white/15 px-2 shrink-0 space-y-1">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl mx-2 transition-colors font-label-md text-label-md"
          >
            <Icon name="help" className="text-[20px]" />
            <span>Help Center</span>
          </a>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/10 hover:text-white rounded-xl mx-2 transition-colors font-label-md text-label-md"
          >
            <Icon name="logout" className="text-[20px]" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
