# REG.RU publishing

The workflow validates pull requests without production credentials. Delivery is
restricted to main, the regru-production environment and explicit string flags.
REGRU_DEPLOY_ENABLED and REGRU_AUTO_DEPLOY both start as false. Production
settings and an individual SSH key are provisioned only after owner approval.

Each site must have its own verified document root. The server's independently
verified host key is required; certificate validation is never disabled. A
non-public site marker is provisioned separately after the exact root is checked.
The remote account must provide Python 3.8+. The interpreter is pinned in
public-files.json because the server default python3 is older. The installed
/opt/python/python-3.8.8/bin/python reports Python 3.8.6 in a clean shell.
The runner uses the OpenSSH client; the remote SSH service must be verified separately. One hosting SSH account
can access all sites; separate keys provide revocation, not user isolation.

The deploy engine replaces individual managed files and retains release ZIPs and
backups outside the document root. This method is not globally atomic. Unknown
files and .well-known are preserved. Empty packages, wrong roots, symlinks, missing
settings and archive traversal are rejected. A failed file write restores the
previous managed files. Tests operate only in temporary directories.

On manual workflow_dispatch, rollback_sha accepts a full previously accepted
commit SHA; the same server guards apply. After owner approval, validate a first
manual release, a second automatic release, a manual rollback and restoration.
Public version.json must match the expected SHA over verified HTTPS.

Do not merge the preparation branch before the site's transfer approval. A merge
can also trigger the existing GitHub Pages publishing. Old Pages settings remain
available as part of the rollback plan and are not disabled by this workflow.

The reviewed root .htaccess preserves request path and query while directing
content pages to the HTTPS apex host through the hosting FastCGI (Apache)
handler. The ACME challenge path is exempt. Other hidden or nested server
configuration files are excluded. The hostname redirect is prepared and
validated on the new copy before web DNS is changed.


## Restricted delivery and retention - 4 October 2026

The four existing SSH keys are bound to a fixed, owner-installed receiver outside
www. Each key can deploy, roll back, finalize or inspect only its own site. Shell,
SFTP/SCP, TCP forwarding and foreign destinations are rejected. Python uses -I;
no source code supplied by a GitHub job is executed. The exact legacy command is
recognized only for migration compatibility and uses the installed receiver.

The server pins approved .htaccess hashes. Changing server configuration or the
installed receiver requires a separate owner-controlled panel operation; a push
cannot replace them. Executable and double-extension filenames, hidden paths,
symlinks and unexpected archive entries are rejected. This narrows SSH access;
it is not isolation into separate operating-system accounts. Keep mail separate
until the mail migration receives its own acceptance.

After public HTTPS version verification, finalize retains the last five accepted
versions plus the current, previous and explicitly pinned migration versions.
It retains the five newest pre-deployment backups not older than 30 days.
Protected ZIPs and their version identities are checked before cleanup. The exact
candidate list is recorded; cleanup checks each file hash and deletes only named
ZIP files in the site's own releases/backups directories, without recursion.
The migration pins do not expire automatically on 10 October. Provider backups
are independent and are not modified by this policy.

A retry of the current identical payload preserves previous_sha. Failed public
verification does not trigger archive cleanup. Rollback uses the same fixed
receiver and an existing full accepted SHA; restoration uses current main.

Tests: python tools/test_regru.py -v; python tools/test_regru_gateway.py -v.
The additional gateway suite was also executed using the hosting Python in an
isolated temporary Linux fixture, including real file delivery/rollback, POSIX
locks, symlink rejection, immutable configuration and retention fail-closed cases.
