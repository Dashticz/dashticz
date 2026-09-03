# Dashticz

Dashticz is an alternative dashboard for Domoticz. Domoticz's own dashboard
can only show information Domoticz itself knows about; Dashticz shows
(almost) all Domoticz devices and also brings in information and controls
from other services, such as weather, calendars, traffic, cameras, radio and
many more, all combined on one configurable screen. Production bundles are
included in the repository, so a normal installation does not require
Node.js or a local build.

## Screenshots

<img width="632" height="459" alt="Dashticz dashboard example" src="https://github.com/user-attachments/assets/b4aee392-f753-4d44-b428-694f166fb57c" />

## Installation

Full instructions: https://dashticz.readthedocs.io/en/master/gettingstarted/

Run the installer from the directory in which you want to create the default
`dashticz` directory:

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"
```

To install into a specific directory, put `--` before the installer
arguments:

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory /var/www/html/my-dashboard
```

The installer clones the latest stable `master` branch, creates an empty
`custom/CONFIG.js`, and tries to give the web-server account write access to
`custom/` and the Git checkout so browser settings and updates can be saved.

### Updating

Use the **Update** control in Settings, or run one of these from the
installation directory:

```sh
# Beta
sh updatebeta.sh

# Stable
sh update.sh
```

## Configuration

Dashticz is configured through `custom/CONFIG.js`. There are two ways to
manage it:

- **Wizard mode** — a graphical Screen Editor for adding Domoticz devices,
  widgets, custom devices and separators without writing any code. This is
  the easiest way to get started, and is shown automatically the first time
  you open Dashticz with an empty configuration.
- **Custom mode** — full manual control over `custom/CONFIG.js`, including
  the complete widget settings catalog, for hand-written configurations.

Switch between the two at any time from the mode icon in the topbar (sliders
icon for Custom, wizard-hat icon for Wizard). A configuration written by hand
can still be opened and extended in Wizard mode, and vice versa.

<img width="608" height="61" alt="image" src="https://github.com/user-attachments/assets/ff212f05-78d9-40b0-94ed-7d34569f7252" />

## Documentation and support

Documentation: https://dashticz.readthedocs.io

Forum: https://www.domoticz.com/forum/viewforum.php?f=67

This is the active Dashticz repository. Previous repositories
(dashticz/dashticz_v2 and dashticzv3/dashticz_v3) are no longer updated.
