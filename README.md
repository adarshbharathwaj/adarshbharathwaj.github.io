# Adarsh Bharathwaj — personal website

The homepage is an HTML/CSS page with normal scrolling, system fonts, and a gently rotating Lorenz attractor illustration. It requires no build step or external libraries. The optional `js/lorenz.js` animation enhances a static SVG fallback; the page still works when JavaScript is disabled.

The illustration makes one complete turn every 48 seconds. Its pause/play button works with touch or a keyboard. It starts paused when the visitor prefers reduced motion, stops drawing while offscreen or in a hidden tab, and limits drawing to 24 frames per second on touch devices. The layout switches to one column at 760px, keeps the illustration within the page, and gives navigation links and the animation control 44px-tall touch targets.

Sections use smooth anchor navigation and early scroll settling. The optional `js/scroll.js` advances after a gesture travels 20% of the gap to the next section, waits 90ms for scrolling to stop, and settles over 340ms. New input interrupts the animation. Taller sections retain a free scrolling range so all their content stays readable. Without JavaScript, native CSS proximity snapping remains available. Reduced-motion preferences disable both forms of snapping and smooth scrolling; print layout stays compact.

## Conference links

The résumé and paper links in `index.html` open `assets/Adarsh_Bharathwaj_Resume.pdf` and `assets/Emergent_Cooperation.pdf`. Replace those files using the same filenames to update the documents without changing the links. If the paper later has an arXiv, DOI, or publisher URL, update its `href` to that URL.

## Visual experiment

The previous animated homepage, with its original fonts, sprites, and JavaScript libraries, is preserved at `experiment/index.html` (`/experiment/` when served). The surprise page, image, styles, and keyboard redirect have been removed.

Keep serving the repository root to preserve the relative asset paths in both versions. GitHub Pages can serve the files directly.
