# Proxyman Setup Notes

Fill this in as you go. The point isn't documentation for its own sake, it's a record you'll actually reuse the next time you set up a new machine or device.

## Platform(s) set up

- [ ] Browser, same machine as Proxyman
- [ ] iOS device (WiFi)
- [ ] Android device (WiFi)
- [ ] Other (Atlantis / Proxyman for iOS / simulator): ___

## What actually worked

Record the exact values you used, not just "followed the guide":

- Proxyman version:
- Proxy port (default 9090, note if you changed it):
- SSL proxying scope (which domains/apps you enabled): `peakandpack-ui.onrender.com`, `peakandpackshopdemo.onrender.com`
- Certificate install method (automatic one-click vs. manual):
- For mobile: device OS version, and whether the cert-trust step needed the extra "Certificate Trust Settings" toggle (iOS) or manual install (Android 11+)

## What didn't work on the first try

The specific error or symptom, and what fixed it. This is the section that actually saves time later, most setup problems repeat themselves months apart.

Example format:
> **Symptom:** Traffic appeared in Proxyman but every body was unreadable binary, not JSON.
> **Cause:** Certificate was installed in Keychain but not marked "Always Trust" for SSL.
> **Fix:** Keychain Access > find Proxyman CA > double-click > Trust > Secure Sockets Layer (SSL) > Always Trust.

## Verification check

- [ ] Opened `https://peakandpack-ui.onrender.com` and saw requests appear in Proxyman's traffic list
- [ ] Clicked a request and saw a readable JSON body, not ciphertext
- [ ] Confirmed the scope only covers the domains under test (not everything on the machine/device)
