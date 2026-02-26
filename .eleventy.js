const Image = require("@11ty/eleventy-img");
const path = require("path");

async function generateSocialImage(src) {
  if (!src) return "/assets/images/hero-athens-view.webp"; // Fallback

  // 1. Fix the path (CMS gives /assets/..., we need ./src/assets/...)
  let inputPath = "./src" + src;

  // 2. Generate the image
  let metadata = await Image(inputPath, {
    widths: [1200], // Perfect size for LinkedIn/Facebook
    formats: ["jpeg"], // LinkedIn PREFERS JPEG over WebP
    outputDir: "./_site/assets/images/social/",
    urlPath: "/assets/images/social/",
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);
      return `${name}-social.${format}`;
    }
  });

  // 3. Return the new URL
  return metadata.jpeg[0].url;
}
module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/robots.txt");
  eleventyConfig.addPassthroughCopy("./src/sitemap.xml");
  eleventyConfig.addNunjucksAsyncFilter("socialImg", generateSocialImage);
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
    <div class="my-8 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-[--accent-color] rounded-r-lg not-prose">
      <h4 class="font-bold text-lg text-[--title-color] mb-2 m-0">🚩 Is this property actually sound?</h4>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        A listing description is marketing. My report is technical reality. Get an independent visual check before you make an offer.
      </p>
      <a href="/#contact" class="inline-block bg-[--accent-color] text-white font-bold py-2 px-6 rounded hover:bg-[#A94A2D] transition-colors no-underline">
        Verify this Property (€97)
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
