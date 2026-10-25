// PostHog via posthog-js, using the key and host that FaroMaker Hub injects (VITE_POSTHOG_*). Nothing is captured without a key.
// Privacy: no autocapture, no session recording, identify by FaroMaker user id only (no email or other PII), and callers send only event names and counts.
import posthog from 'posthog-js';

const env = import.meta.env, key = env.VITE_POSTHOG_KEY || env.VITE_POSTHOG_API_KEY || env.VITE_POSTHOG_PROJECT_API_KEY, host = env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
let ready = false;

if (key && !(typeof navigator !== 'undefined' && navigator.doNotTrack === '1')) {
  posthog.init(key, { api_host: host, autocapture: false, capture_pageview: false, capture_pageleave: true, disable_session_recording: true, persistence: 'localStorage', person_profiles: 'identified_only' });
  ready = true;
}

export const analyticsReady = () => ready;
export function trackEvent(name, props) { if (!ready) return false; try { posthog.capture(name, props); } catch { /* analytics must never break the app */ } return true; }
export function identifyUser(id) { if (ready && id) try { posthog.identify(String(id)); } catch { /* ignore */ } }
