# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8] - 2024-02-26

### Fixed

* `clientStore` being called on the server-side was causing SilverBullet to crash ([SB#772](https://github.com/silverbulletmd/silverbullet/issues/772))

### Added

* Include [custom styles](https://silverbullet.md/STYLES) in tree panel (requires SilverBullet 0.7.2 or greater). 
 
### Fixed

* Fix header button tooltips ([#9](https://github.com/joekrill/silverbullet-treeview/pull/9))
* Wrap toolbar items when necessary on smaller screens ([#6](https://github.com/joekrill/silverbullet-treeview/issues/6))

## [0.7] - 2024-02-20

### Fixed

* Include the main SilverBullet stylesheet when rendering the treeview so we can access the CSS variables (previously these were duplicated and hard-coded into the plug)


## [0.6] - 2024-02-18

### Fixed

* Refresh the tree when a page is deleted.


## [0.5] - 2024-02-18

### Added

* Drag-and-drop support. Nodes can be dragged to move/rename pages.


## [0.4] - 2024-02-17

### Added

* README dark mode screenshot.
* README instructions for adding treeview toggle as an action button.

### Fixed

* Fix an error in the initialization retry code which can be triggered if the local treeview UI state is invalid.

## [0.3] - 2024-02-17

### Fixed

* Disable drag-and-drop functionality in the UI (it isn't implemented yet).

## [0.2] - 2024-02-16

### Fixed

* An error was being incorrectly shown if there was no `treeview` settings in the `SETTINGS` page.

## [0.1] - 2024-02-16

### Added

* Initial Release.