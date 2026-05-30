/** Even Keel — brand color scale for tailwind.config.js
 *  Drop this `colors` block into theme.extend (replacing the green `brand`).
 *  Because your UI already references brand-500/600/700 semantically,
 *  swapping this scale recolors buttons, focus rings, links, etc. at once.
 */
export const evenKeelColors = {
  // PRIMARY — sea / teal-blue (the sails). Replaces the old green `brand`.
  brand: {
    50: "#eef7fa",
    100: "#d4eaf1",
    200: "#abd6e1",
    300: "#76bccb",
    400: "#449cb2",
    500: "#2b89a1", // ← logo "sea": links, focus rings, hovers
    600: "#226e85", // ← primary button fill (btn-primary)
    700: "#1f5a6d",
    800: "#1d4a58",
    900: "#1a3d49",
  },

  // INK — deep navy (the hull). Use for headings, dark surfaces, dark-mode bg.
  ink: {
    DEFAULT: "#213047",
    50: "#eef1f5",
    100: "#d3dae3",
    200: "#9fadc0",
    300: "#6b7e98",
    400: "#42566f",
    500: "#2b3d54",
    600: "#213047", // ← logo "ink"
    700: "#1a2638",
    800: "#141d2c",
    900: "#0e1420",
  },

  // GOLD — warm sun. ACCENT ONLY: highlights, positive figures, savings, badges.
  gold: {
    400: "#e9bd55",
    500: "#dfa72c", // ← logo "sun"
    600: "#c28e1c",
  },
};
