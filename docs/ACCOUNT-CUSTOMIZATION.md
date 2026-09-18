# Per-account content customization

TizenTube keeps YouTube's built-in account lock unchanged. Configure the PIN
from YouTube's account settings, then use the native account selector as usual.
TizenTube does not intercept or replace the PIN screen.

Content settings are stored separately for each active YouTube identity. Switch
to the account you want to configure, then open:

1. YouTube Settings
2. TizenTube Settings
3. User Interface Settings

`Current Account Content` controls Shorts, home recommendations, related videos
and subscribe buttons. `Disable Sidebar Contents` and `Sort Sidebar Contents`
also apply only to the current account.

Unknown sidebar entries are always preserved. If a YouTube response change or a
configuration would remove every sidebar item, TizenTube restores the original
items automatically. This is especially important for child profiles, whose
guide entries can differ from regular accounts.

## Development

```sh
cd mods
npm ci
npm test
npm run build
```

The build output is `dist/userScript.js`.

