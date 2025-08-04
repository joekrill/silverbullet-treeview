
# SilverBullet TreeView plug

This plugs adds a tree view that allows you to navigate your SilverBullet pages Hierarchically.


<a href="screenshot.png"><img src="screenshot.png" width="400"  /></a>
<a href="screenshot-dark.png"><img src="screenshot-dark.png" width="400"  /></a>

Dragging-and-dropping files and folders is supported but requires SilverBullet v0.7.2 or greater. If running < v0.7.2, this feature will be automatically disabled (regardless of [configuration](#configuration)).

## Installation

### SilverBullet v1

Use the `Plugs: Add` command and enter the following URI:

`github:joekrill/silverbullet-treeview/treeview.plug.js`

_or_

Open (`cmd+k`) your `PLUGS` note in SilverBullet and add this plug to the list:

```yaml
- github:joekrill/silverbullet-treeview/treeview.plug.js
```

Then run the `Plugs: Update` command and off you go!

### SilverBullet v2

Add `"github:joekrill/silverbullet-treeview/treeview.plug.js"` to the `plugs` array in your `CONFIG` page:

```lua
config.set {
  plugs = {
    "github:joekrill/silverbullet-treeview/treeview.plug.js"
  }
}
```

Then run the `Plugs: Update` command (`cmd+shift+P`) and off you go!

## Configuration

The treeview plug supports both SilverBullet v1 and v2, with the configuration being slightly different depending on
which version you are using.

### SilverBullet v1

On SilverBullet v1, this plug can be configured using the `SETTINGS` page (default values shown):

```yaml
treeview:
  # Determines where the panel is displayed:
  # - "lhs" - left hand side
  # - "rhs" - right hand side
  # - "bhs" - bottom
  # - "modal" - in a modal
  position: lhs

  # Must be > 0.
  # position = "lhs" | "rhs": determines the width of the panel.
  # position = "modal": sets the margin around the modal window.
  # position = "bhs": No effect
  size: 1

  dragAndDrop:
    # Set to false to disable drag-and-drop
    enabled: true

    # Set to false to disable the confirmation prompt shown when dragging and
    # dropping pages that causes them to be renamed/moved.
    confirmOnRename: true

  # An array of exclusion rules that will exclude pages from being
  # displayed in the sidebar.
  exclusions:

  # Filter by regular expression:
  - type: "regex"
    # Regular Expression string to exclude pages from the tree
    # Examples:
    # - Any page that is all-caps: "^[A-Z]+$"
    # - A specific set of pages: "^(?:SETTINGS|PLUGS|index|Library)$"
    # - Any path containing Hidden (e.g. test/Hidden/page1): "Hidden"
    rule: "^(?:SETTINGS|PLUGS|index|Library)$"
    # Optional: set to true to negate the rule, only showing pages that match this regex.
    negate: false

  # Filter by page tags:
  - type: "tags"
    tags: ["meta"]
    # Optional: set to true to negate the rule, only showing pages that include any of the tags.
    negate: false

  # Filter by a space function (see "Filtering by custom function example", below)
  - type: "space-function"
    name: "myCustomFilterFunction"
    # Optional: set to true to negate the rule, only showing pages for which the function returns false
    negate: false

  # This setting has been deprecated - use an `exclusion` rule of `type: regex` instead.
  pageExcludeRegex: "^(?:SETTINGS|PLUGS|index|Library)$"
```

### SilverBullet v2

On SilverBullet v2, this plug can be configured using the `config` object in your `CONFIG` page (default values shown):

```lua
config.set {
  plugs = {
    "github:joekrill/silverbullet-treeview/treeview.plug.js"
  },

  -- The treeview plug configuration
  treeview = {
    -- Determines where the panel is displayed:
    -- - "lhs" - left hand side
    -- - "rhs" - right hand side
    -- - "bhs" - bottom
    -- - "modal" - in a modal
    position = "lhs",

    -- Must be > 0.
    -- position = "lhs" | "rhs": determines the width of the panel.
    -- position = "modal": sets the margin around the modal window.
    -- position = "bhs": No effect
    size=0.5,

    dragAndDrop = {
      -- Set to false to disable drag-and-drop
      enabled = true,

      -- Set to false to disable the confirmation prompt shown when dragging and
      -- dropping pages that causes them to be renamed/moved.
      confirmOnRename = true
    },

    -- An array of exclusion rules that will exclude pages from being
    -- displayed in the sidebar.
    exclusions = {
      {
        -- Filter by regular expression:
        type = "regex",
        -- Regular Expression string to exclude pages from the tree
        -- Examples:
        -- - Any page that is all-caps: "^[A-Z]+$"
        -- - A specific set of pages: "^(?:CONFIG|Library|index).*$"
        -- - Any path containing Hidden (e.g. test/Hidden/page1): "Hidden"
        rule="^(?:CONFIG|Library|index).*$",
        -- Optional: set to true to negate the rule, only showing pages that match this regex.
        negate= false,
      },
      {
        -- Filter by page tags:
        type = "tags",
        tags = {"meta"},
        -- Optional: set to true to negate the rule, only showing pages that include any of the tags.
        negate = false
      }
    }
  }
}
```

Note: space functions are not supported in SilverBullet v2 yet, so the `space-function` exclusion type is not available.

### Adding a top bar toggle icon

![Screenshot](screenshot-action-button.png)

You can also add add a button to the top bar that will toggle the tree view.

#### SilverBullet v1
On SilverBullet v1, this is done by adding the following to your `actionButtons` array in your `SETTINGS` page:

```yaml
actionButtons:
- icon: sidebar
  command: "{[Tree View: Toggle]}"
  description: "Toggle Tree View"
```

#### SilverBullet v2

On SilverBullet v2, this is done by adding the following `actionButton.define` in your `CONFIG` page:

```lua
actionButton.define {
  icon = "sidebar",
  description = "Toggle Tree View",
  run = function()
    editor.invokeCommand("Tree View: Toggle")
  end
}
```

### Filtering by custom function example

Using an exclusion rule with `type: "space-function"` allows you to write your own logic around which pages to show in the tree view. The function will be called with the page object as the first and only parameter.

As an example, we could create a function that excludes daily journal pages
that are older than 7 days.

1. Create a space script which defines the filter logic:

    ````
    ```space-script
    silverbullet.registerFunction({name: "filterOldDailyNotes"}, async (page) => {
      if (!page.name.startsWith("Journal/Day/")) {
        // If it's not a daily journal page, don't exclude it.
        return false;
      }

      // Extract the date part from the page name and parse it
      const datePart = page.name.split("/")[2];
      const parsedDate = Temporal.PlainDate.from(datePart);
      const timeSince = Temporal.Now.plainDateISO().since(parsedDate, { largestUnit: 'days' });

      return timeSince.days > 7;
    });
    ```
    ````

2. Add the exclusion rule to the `SETTINGS` page:

    ```yaml
    treeview:
      exclusions:
      - type: "space-function"
        name: "filterOldDailyNotes"
    ```

## Build

To build this plug, make sure you have [SilverBullet installed](https://silverbullet.md/Install). Then, build the plug with:

```shell
deno task build
```

Or to watch for changes and rebuild automatically

```shell
deno task watch
```

Then, copy the resulting `.plug.js` file into your space's `_plug` folder. Or build and copy in one command:

```shell
deno task build && cp *.plug.js /my/space/_plug/
```

SilverBullet will automatically sync and load the new version of the plug (or speed up this process by running the {[Sync: Now]} command).

## Development

### `SortableTree`

The tree component used is Marc Anton Dahmen's [SortableTree](https://marcantondahmen.github.io/sortable-tree) component ([Github Repo](https://github.com/marcantondahmen/sortable-tree)).

Latest build files can be found here (replace them in `assets/sortable-tree` to upgrade):

- https://unpkg.com/sortable-tree/dist/sortable-tree.js
- https://unpkg.com/sortable-tree/dist/sortable-tree.css
