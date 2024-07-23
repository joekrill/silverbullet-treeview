# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* `exclusions` configuration option that allows multiple exclusions rules to filter what is displayed in the treeview based on regex, tags, or a custom space function.
* Use a prefix when using `console.error` to make it clear that the error originated from the TreeView plug. 

### Deprecated

* The `pageExcludeRegex` configuration option is deprected in favor or using an exclusion rule of `type: "regex"`, instead.

## [0.11] - 2024-07-15

### Added

* Allow excluding pages based on a user-provided regex (by [@djm2k](https://github.com/joekrill/silverbullet-treeview/pull/16))

## [0.10] - 2024-04-20

### Fixed

* Fix `sortable-tree` library throwing errors on state load (by [@MrMugame](https://github.com/joekrill/silverbullet-treeview/pull/14))
* Use correct events


## [0.9] - 2024-03-19

### Fixed

* Fix error when `page:deleted` event is triggered ([#11](https://github.com/joekrill/silverbullet-treeview/issues/11))


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