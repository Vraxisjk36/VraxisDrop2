# Vraxis Drop beta — security and compatibility notes

- Quick Drop standard codes are not end-to-end encrypted. Private links use browser AES-GCM; recipients must have the complete link.
- A private drop is consumed when claimed even if the decryption key is missing or wrong. This needs redesign before public release.
- Connect uses WebRTC encrypted data channels; signaling uses Supabase Realtime. Pairing requests require host approval.
- Connect is peer-to-peer when a viable network path exists. There is no configured paid TURN relay, so some networks will not connect.
- Connect sessions and received files are held in browser memory. Refreshing or closing the page removes the gallery; download files before leaving.
- The PWA service worker caches the site shell only; do not cache secrets, API requests or transfer content. Online access is required for transfers.
- Test iOS Safari, Android Chrome, desktop Chrome, Firefox and Edge. Test Wi-Fi, cellular, large files, interruptions, incorrect pairing and expiration.
- Do not call this release security-audited or production-hardened until threat modeling, abuse tests and backend policy review are completed.
