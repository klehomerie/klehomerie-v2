module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/robots.txt");
  eleventyConfig.addPassthroughCopy("./src/sitemap.xml");
  // 1. PASSTHROUGHS (The "Bulletproof" Method)
  // { "SOURCE_PATH" : "DESTINATION_PATH" }
  // Copy the entire assets folder
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  // Copy the Admin folder
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  // Copy the specific PDFs to the ROOT of the site (so /file.pdf works)
  eleventyConfig.addPassthroughCopy({ 
    "src/Klehomerie_Technical_Audit_Checklist.pdf": "Klehomerie_Technical_Audit_Checklist.pdf",
    "src/KLEHOMERIE_Services_Pricing_2026_Q1_EN.pdf": "KLEHOMERIE_Services_Pricing_2026_Q1_EN.pdf",
    "src/KLEHOMERIE_Services_Pricing_2026_Q1_FR.pdf": "KLEHOMERIE_Services_Pricing_2026_Q1_FR.pdf"
  });

  // Watch for changes
  eleventyConfig.addWatchTarget("./src/assets/css/");
  eleventyConfig.addWatchTarget("./src/assets/js/");
// DATE FILTER
  eleventyConfig.addFilter("dateString", (dateObj) => {
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });
  // --- SHORTCODES (The "Mobile CTA" Fix) ---
  // Usage: {% CTA_RED_FLAG %}
  eleventyConfig.addShortcode("CTA_RED_FLAG", function() {
    return `
    <div class="my-8 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-[--accent-color] rounded-r-lg shadow-sm not-prose">
        <h3 class="font-bold text-xl mb-2 text-[--title-color] flex items-center gap-2">
            <span>🚩</span> Suspect a hidden defect?
        </h3>
        <p class="mb-4 text-gray-700 dark:text-gray-300">Photos lie. Thermal imaging reveals the truth. Don't sign until you scan.</p>
        <a href="/#contact" class="inline-block w-full md:w-auto text-center bg-[--accent-color] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#A94A2D] transition-colors shadow-md">
            Book a Red Flag Scan (€97)
        </a>
    </div>`;
  });
 // 4. CONFIGURATION
  return {
    dir: {
      input: "src",    // <--- THIS IS THE KEY FIX
      output: "_site", // This is where Netlify looks
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
  };
};
