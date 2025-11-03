# Data Visualization Assignment

This project is a small React + D3 application demonstrating coordinated multiple views for a housing dataset. It includes a scatterplot and a parallel coordinates plot that are synchronized: selections made in one view highlight corresponding items in the other.

## Quick summary
- Tech: React (v19), D3 (v7), PapaParse for CSV parsing
- Data: `public/data/Housing.csv`
- Visualizations:
  - Scatterplot (interactive 2D brush selection)
  - Parallel Coordinates (per-axis brushes, click selection, hover tooltips)
- Selection synchronization: App-level state keeps the currently selected items; both visualizations listen and update highlights.

## Getting started (Windows / cmd.exe)
1. Install dependencies:

```cmd
npm install
```

2. Start the development server:

```cmd
npm start
```

3. Open http://localhost:3000 in your browser.

4. Build for production:

```cmd
npm run build
```

## Project structure
- `public/`
  - `index.html` - HTML entry
  - `data/Housing.csv` - sample dataset used by the app
- `src/`
  - `index.js` - React entry
  - `App.js` - loads data and orchestrates views
  - `components/`
    - `scatterplot/` - scatterplot D3 wrapper + container
    - `parallelcoord/` - parallel coordinates D3 wrapper + container
    - `templates/d3react/` - previous template code
  - `utils/` - helper utilities (CSV parsing wrapper, etc.)

## How the interaction works
- Make a rectangular brush selection on the scatterplot: the selected points propagate to the App and the parallel coordinates highlights the corresponding lines.
- Use the vertical brushes on any axis of the parallel coordinates to select items by that dimension; the selection propagates back to the scatterplot.
- Click a single line in the parallel coordinates to select just that item.
- Hover over items in either plot to reveal a tooltip showing full data details for that data row.

Selection identity: each row is assigned a stable `index` (from the parsed CSV) and both views match items using this `index` to avoid object-identity mismatches.

## Ticks and axis notes
- The `area` axis has been configured to use 2000-unit tick steps.
- Integer-valued dimensions `bathrooms`, `stories`, and `parking` use integer tick marks (step = 1) to avoid fractional ticks like `.5` which don't make sense for those fields.
  - If you prefer a coarser integer tick spacing (e.g. every 2 or 5 units), you can edit `src/components/parallelcoord/ParallelCoord-d3.js` and adjust the logic in the axis generation section.

## Styling and performance notes
- Visual state (default / hover / selected) for parallel coordinates lines is driven by CSS classes (`.foreground path`, `.foreground path.selected`, `:hover`) in `src/components/parallelcoord/ParallelCoord.css` to avoid frequent inline style mutations and repaint thrash.
- Stroke-width transitions that caused rendering glitches were removed; classes toggle selection states for stable rendering.

## Troubleshooting
- If the parallel coordinates temporarily blank after a selection clear, confirm the CSS file `src/components/parallelcoord/ParallelCoord.css` is present and not overriding the `.foreground path` rules. The D3 code toggles the `selected` class; CSS controls the appearance.
- If the app fails to start, check that `node` and `npm` are installed and that dependencies were installed successfully.

## License
This repository is provided for educational purposes. Add a license if you plan to reuse or publish the code.
