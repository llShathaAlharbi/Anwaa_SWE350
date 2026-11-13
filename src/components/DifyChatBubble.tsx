import React, { useEffect } from 'react';

const DIFY_TOKEN = 'oFMhqUD2KODKFveV';
const DIFY_BASE_URL = 'https://udify.app';

declare global {
  interface Window {
    difyChatbotConfig?: {
      token: string;
      baseUrl: string;
    };
  }
}

export const DifyChatBubble: React.FC = () => {
  useEffect(() => {
    const btn = document.getElementById('dify-chatbot-bubble-button');
    if (btn) btn.remove();
    const win = document.getElementById('dify-chatbot-bubble-window');
    if (win) win.remove();
  }, []);

  return null;
};

export function openDifyChatbot(navigate: (path: string) => void) {
  const bubbleBtn = document.getElementById('dify-chatbot-bubble-button');
  const bubbleWin = document.getElementById('dify-chatbot-bubble-window');
  if (bubbleBtn) {
    const isHidden =
      !bubbleWin ||
      bubbleWin.style.display === 'none' ||
      window.getComputedStyle(bubbleWin).display === 'none';
    if (isHidden) {
      bubbleBtn.click();
    }
    return;
  }
  navigate('/chat');
}
