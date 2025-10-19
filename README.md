# dartsisas-spice-datasource

Grafana data source plugin that lets you visualize and analyze SPICE data.

## What is SPICE?

SPICE is a system of data products and tools provided by the Navigation and Ancillary Information Facility (NAIF) at NASA/JPL. It supplies geometric and temporal information about spacecraft and celestial bodies for mission planning, orbit determination, attitude calibration, and related analyses. The SPICE toolkit works with "kernels" such as SPK (ephemerides), CK (attitude), SCLK/LSK (time conversions), and DSK (shape models). See the NAIF website (<https://naif.jpl.nasa.gov/naif/>) for complete documentation.

This plugin exposes vectors and other outputs derived from SPICE kernels so that you can combine them with Grafana panels for mission monitoring and analysis workflows.

## Plugin Options

### Data source configuration

![Data source settings](screenshots/datasource_setting.png)

- `SPICE Kernels`: Register the URLs of the kernel files the data source depends on. Use `+` to add new entries and `-` to remove them. Kernels are loaded from top to bottom, so order them to match temporal or dependency requirements.

### Query configuration

![Query editor](screenshots/query_menu.png)

- `Function`: Choose the NAIF utility to call. The plugin currently supports `spkpos` (target/observer position vector) and `spkezr` (state vector using NAIF target codes).
- `Target`: When `spkpos` is selected, set the target body name or NAIF ID you want to retrieve.
- `Observer`: When `spkpos` is selected, set the observing body name or NAIF ID.
- `Span`: When `spkpos` is selected, specify the sampling interval. The selector on the right lets you choose the unit (`sec`, `min`, `hour`, `day`).
- `Last`: Enable this to return only the latest data point. Activating the switch disables the `Span` inputs and always refreshes with the newest value.
- Selecting `spkezr` does not currently reveal additional parameters; the query runs with the default conditions of the chosen function.

## License
Licensed under the GNU Lesser General Public License v3.0.

© 2025 ISAS/JAXA and [NAKAHIRA, Satoshi](https://orcid.org/0000-0001-9307-046X).

