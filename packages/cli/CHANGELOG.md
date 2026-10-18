# Changelog

## 0.1.0-alpha.3

- Standalone lightweight `fastang` and `fastang-cli` commands.
- Create projects with the matching generator release.
- Plan and apply npm core updates, including apps using older framework versions.
- Forward development, build, generation and route inspection to the local core.

- Compare installed peers and Node before updates; block incompatible installs.
- Skip identical versions and require explicit permission for downgrades.
- Forward termination signals to local server processes.

- Check manifest, lockfile and installed core consistency before applying updates.
- Use one process runner for npm and local runtime commands.
