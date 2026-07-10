# SIPPY — Play Console Data Safety Answers

Exact answers for the Play Console **Data safety** form. Mirrors spec §9 and the published privacy
policy. Fill the form to match this table exactly; the privacy policy must not contradict it.

## Does your app collect or share any of the required user data types?
**Yes.** (The ad + analytics SDKs collect data.)

## Is all of the user data collected by your app encrypted in transit?
**Yes.**

## Do you provide a way for users to request that their data be deleted?
**Yes** — in-app data is removed on uninstall; users can contact us for analytics deletion. (Provide
the support email + note that gameplay data is device-local.)

## Data types — declare exactly these

### Device or other IDs → **Advertising ID**
- **Collected:** Yes
- **Shared:** Yes (with ad partners)
- **Processed ephemerally:** No
- **Required or optional:** Required (part of the ad-supported free app)
- **Purposes:** Advertising or marketing

### App activity → **App interactions** (analytics events)
- **Collected:** Yes
- **Shared:** No
- **Processed ephemerally:** No
- **Required or optional:** Required
- **Purposes:** Analytics

### Financial info → **Purchase history**
- **Collected:** Yes (via Google Play Billing)
- **Shared:** No
- **Required or optional:** Optional (only if the user makes a purchase)
- **Purposes:** App functionality

## Data types you must mark as NOT collected
- Location (approximate or precise): **No**
- Personal info (name, email, address, phone, user IDs): **No**
- Messages, contacts, calendar: **No**
- Photos / videos / files / audio: **No**
- Health & fitness: **No**
- Web browsing history: **No**
- Microphone / camera: **No**

## Data not sold
SIPPY does **not** sell user data. Advertising ID is shared with ad partners for advertising only.

## Notes
- The `com.google.android.gms.permission.AD_ID` permission is declared in the manifest — this is
  what obligates the Advertising ID disclosure above. Do not remove it while ads are live.
- Firebase Analytics data retention follows Firebase defaults; state this in the deletion section.
