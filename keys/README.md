# Release signing key

`aetherpanel.pub` signs every release `SHA256SUMS`. Its sha256 is pinned as
`PUBKEY_SHA256` in the public repo's `install.sh`.

Never commit the secret key. It lives only in the `MINISIGN_SECRET_KEY` secret.

Regenerate (one time, offline):

    minisign -G -W -p keys/aetherpanel.pub -s ~/.minisign/aetherpanel.key

`-W` = no passphrase, required for unattended CI signing.

Pin it:

    sha256sum keys/aetherpanel.pub

Copy that value into `PUBKEY_SHA256` in the public `install.sh`, and copy
`aetherpanel.pub` into the public repo's `keys/` directory.
