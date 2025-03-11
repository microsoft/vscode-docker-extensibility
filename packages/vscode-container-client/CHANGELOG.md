## 0.2.1 - 11 March 2025
### Added
* Added the container stats command. This would previously always throw a `CommandNotSupportedError`. However, the typing has changed to a `VoidCommandResponse`. [#254](https://github.com/microsoft/vscode-docker-extensibility/issues/254)

## 0.2.0 - 10 February 2025
### Added
* Added a client for Podman. [#221](https://github.com/microsoft/vscode-docker-extensibility/issues/221)

### Changed
* Some properties on certain objects have become optional, due to Podman not containing them. For example, network ID on network listing is not present on Podman v3.

## 0.1.2 - 1 August 2024
### Fixed
* Listing files fails due to new Bash behavior. [#231](https://github.com/microsoft/vscode-docker-extensibility/issues/231)
* Unable to inspect built-in networks. [#202](https://github.com/microsoft/vscode-docker-extensibility/issues/228)

## 0.1.1 - 18 October 2023
### Added
* Output from `docker prune` commands is now parsed for the items removed and space reclaimed.

## 0.1.0 - 31 August 2022
### Added
* Initial commit
* Adds support for various Docker runtimes (Docker in WSL, Docker Engine, Docker Desktop, etc.)
